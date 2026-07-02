import type { AttendanceSessionMode } from "@prisma/client";
import { addMinutes } from "date-fns";
import { requireRole } from "../auth";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { emitToClass, emitToSession } from "../lib/realtime";
import { getPrisma } from "../prisma";
import {
  generateOtp,
  generateQrToken,
  hashOtp,
  hashQrToken,
} from "../security";
import { ProfileService } from "./profile.service";

type StartSessionInput = {
  classId: string;
  mode: AttendanceSessionMode;
  durationMinutes?: number;
  attendanceWindowMinutes?: number;
  allowedRadiusMeters?: number;
  minGpsAccuracyMeters?: number;
  centerLatitude?: number;
  centerLongitude?: number;
};

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function mapSession(session: {
  id: string;
  classId: string;
  teacherId: string;
  mode: AttendanceSessionMode;
  status: string;
  startsAt: Date;
  expiresAt: Date;
  closedAt: Date | null;
  attendanceWindowMinutes: number;
  allowedRadiusMeters: number;
  minGpsAccuracyMeters: number;
  centerLatitude: { toString(): string } | null;
  centerLongitude: { toString(): string } | null;
  _count?: { attendance: number };
  class?: {
    id: string;
    name: string;
    code: string;
    subject: { name: string };
    enrollments: Array<{ status: string }>;
  };
}) {
  const approvedCount =
    session.class?.enrollments.filter((item) => item.status === "APPROVED").length ?? 0;

  return {
    id: session.id,
    classId: session.classId,
    teacherId: session.teacherId,
    mode: session.mode,
    status: session.status,
    startsAt: session.startsAt,
    expiresAt: session.expiresAt,
    closedAt: session.closedAt,
    attendanceWindowMinutes: session.attendanceWindowMinutes,
    allowedRadiusMeters: session.allowedRadiusMeters,
    minGpsAccuracyMeters: session.minGpsAccuracyMeters,
    centerLatitude: toNumber(session.centerLatitude),
    centerLongitude: toNumber(session.centerLongitude),
    joinedCount: session._count?.attendance ?? 0,
    totalStudents: approvedCount,
    class: session.class
      ? {
          id: session.class.id,
          name: session.class.name,
          code: session.class.code,
          subject: session.class.subject.name,
        }
      : undefined,
  };
}

export class AttendanceSessionService {
  private readonly db = getPrisma();
  private readonly profiles = new ProfileService();

  private async getOwnedClass(classId: string, teacherId: string) {
    const klass = await this.db.class.findUnique({
      where: { id: classId },
      include: {
        subject: true,
        enrollments: { select: { status: true } },
      },
    });

    if (!klass) {
      throw new NotFoundError("Class not found");
    }

    if (klass.teacherId !== teacherId) {
      throw new ForbiddenError();
    }

    return klass;
  }

  async listSessions(filters?: { classId?: string; activeOnly?: boolean }) {
    const user = await requireRole(["TEACHER", "STUDENT", "ADMIN"]);

    if (user.role === "TEACHER" || user.role === "ADMIN") {
      const teacher = await this.profiles.ensureTeacherProfile();
      const sessions = await this.db.attendanceSession.findMany({
        where: {
          teacherId: user.role === "ADMIN" ? undefined : teacher.id,
          ...(filters?.classId ? { classId: filters.classId } : {}),
          ...(filters?.activeOnly
            ? { status: "ACTIVE", expiresAt: { gt: new Date() } }
            : {}),
        },
        include: {
          class: {
            include: {
              subject: true,
              enrollments: { select: { status: true } },
            },
          },
          _count: { select: { attendance: true } },
        },
        orderBy: { startsAt: "desc" },
        take: 50,
      });

      return sessions.map(mapSession);
    }

    const student = await this.profiles.getStudentProfile();
    if (!student) {
      return [];
    }

    const enrollments = await this.db.enrollment.findMany({
      where: { studentId: student.id, status: "APPROVED" },
      select: { classId: true },
    });
    const classIds = enrollments.map((item) => item.classId);
    if (classIds.length === 0) {
      return [];
    }

    const sessions = await this.db.attendanceSession.findMany({
      where: {
        classId: { in: classIds },
        ...(filters?.classId ? { classId: filters.classId } : {}),
        ...(filters?.activeOnly
          ? { status: "ACTIVE", expiresAt: { gt: new Date() } }
          : {}),
      },
      include: {
        class: {
          include: {
            subject: true,
            enrollments: { select: { status: true } },
          },
        },
        _count: { select: { attendance: true } },
        attendance: {
          where: { studentId: student.id },
          select: { id: true, status: true, markedAt: true },
        },
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });

    return sessions.map((session) => ({
      ...mapSession(session),
      myAttendance: session.attendance[0] ?? null,
    }));
  }

  async getSession(sessionId: string, includeSecrets = false) {
    const user = await requireRole(["TEACHER", "STUDENT", "ADMIN"]);
    const session = await this.db.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            subject: true,
            enrollments: { select: { status: true } },
            teacher: true,
          },
        },
        _count: { select: { attendance: true } },
        attendance: {
          include: {
            student: { include: { user: true } },
          },
          orderBy: { markedAt: "desc" },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Attendance session not found");
    }

    if (user.role === "TEACHER") {
      const teacher = await this.profiles.ensureTeacherProfile();
      if (session.teacherId !== teacher.id) {
        throw new ForbiddenError();
      }
    }

    if (user.role === "STUDENT") {
      const student = await this.profiles.getStudentProfile();
      if (!student) {
        throw new ForbiddenError();
      }

      const enrollment = await this.db.enrollment.findFirst({
        where: {
          classId: session.classId,
          studentId: student.id,
          status: "APPROVED",
        },
      });

      if (!enrollment) {
        throw new ForbiddenError();
      }
    }

    const mapped = {
      ...mapSession(session),
      attendance: session.attendance.map((item) => ({
        id: item.id,
        status: item.status,
        markedAt: item.markedAt,
        student: {
          id: item.student.id,
          rollNumber: item.student.rollNumber,
          name: item.student.user.fullName,
        },
      })),
    };

    if (!includeSecrets) {
      return mapped;
    }

    return mapped;
  }

  async startSession(input: StartSessionInput) {
    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();
    const klass = await this.getOwnedClass(input.classId, teacher.id);

    const activeSession = await this.db.attendanceSession.findFirst({
      where: {
        classId: input.classId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSession) {
      throw new ConflictError("This class already has an active attendance session");
    }

    const durationMinutes = input.durationMinutes ?? 10;
    const otpLength = 6;
    const plainOtp = input.mode === "OTP" ? generateOtp(otpLength) : null;
    const plainQrToken = input.mode === "QR" ? generateQrToken() : null;
    const startsAt = new Date();
    const expiresAt = addMinutes(startsAt, durationMinutes);

    const session = await this.db.attendanceSession.create({
      data: {
        classId: input.classId,
        teacherId: teacher.id,
        mode: input.mode,
        status: "ACTIVE",
        otpHash: plainOtp ? hashOtp(plainOtp, "pending") : null,
        otpLength: plainOtp ? otpLength : null,
        qrTokenHash: plainQrToken ? hashQrToken(plainQrToken, "pending") : null,
        startsAt,
        expiresAt,
        attendanceWindowMinutes: input.attendanceWindowMinutes ?? 10,
        allowedRadiusMeters: input.allowedRadiusMeters ?? 100,
        minGpsAccuracyMeters: input.minGpsAccuracyMeters ?? 80,
        centerLatitude: input.centerLatitude,
        centerLongitude: input.centerLongitude,
      },
      include: {
        class: {
          include: {
            subject: true,
            enrollments: { select: { status: true } },
          },
        },
        _count: { select: { attendance: true } },
      },
    });

    const otpHash = plainOtp ? hashOtp(plainOtp, session.id) : null;
    const qrTokenHash = plainQrToken ? hashQrToken(plainQrToken, session.id) : null;

    const updated = await this.db.attendanceSession.update({
      where: { id: session.id },
      data: { otpHash, qrTokenHash },
      include: {
        class: {
          include: {
            subject: true,
            enrollments: { select: { status: true } },
          },
        },
        _count: { select: { attendance: true } },
      },
    });

    if (plainOtp) {
      await this.db.otpChallenge.create({
        data: {
          sessionId: updated.id,
          otpHash: otpHash!,
          expiresAt,
        },
      });
    }

    const payload = {
      session: mapSession(updated),
      credentials: {
        otp: plainOtp,
        qrToken: plainQrToken,
        qrPayload: plainQrToken ? `${updated.id}:${plainQrToken}` : null,
      },
    };

    const broadcast = {
      session: payload.session,
      classId: updated.classId,
    };

    emitToClass(updated.classId, "session:started", broadcast);
    emitToSession(updated.id, "session:started", broadcast);

    await this.db.notification.createMany({
      data: (
        await this.db.enrollment.findMany({
          where: { classId: updated.classId, status: "APPROVED" },
          include: { student: { select: { userId: true } } },
        })
      ).map((enrollment) => ({
        userId: enrollment.student.userId,
        type: "ATTENDANCE_STARTED" as const,
        title: "Attendance session started",
        body: `${klass.subject.name} attendance is now open.`,
        metadata: { sessionId: updated.id, classId: updated.classId },
      })),
    });

    return payload;
  }

  async regenerateOtp(sessionId: string) {
    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const session = await this.db.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundError("Attendance session not found");
    }

    if (session.teacherId !== teacher.id) {
      throw new ForbiddenError();
    }

    if (session.status !== "ACTIVE" || session.expiresAt <= new Date()) {
      throw new ConflictError("Session is not active");
    }

    if (session.mode !== "OTP") {
      throw new ConflictError("This session does not use OTP verification");
    }

    const otpLength = session.otpLength ?? 6;
    const plainOtp = generateOtp(otpLength);
    const otpHash = hashOtp(plainOtp, sessionId);

    await this.db.attendanceSession.update({
      where: { id: sessionId },
      data: { otpHash, otpLength },
    });

    await this.db.otpChallenge.create({
      data: {
        sessionId,
        otpHash,
        expiresAt: session.expiresAt,
      },
    });

    return { otp: plainOtp, expiresAt: session.expiresAt };
  }

  async closeSession(sessionId: string) {
    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const session = await this.db.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            subject: true,
            enrollments: { select: { status: true } },
          },
        },
        _count: { select: { attendance: true } },
      },
    });

    if (!session) {
      throw new NotFoundError("Attendance session not found");
    }

    if (session.teacherId !== teacher.id) {
      throw new ForbiddenError();
    }

    const updated = await this.db.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
      include: {
        class: {
          include: {
            subject: true,
            enrollments: { select: { status: true } },
          },
        },
        _count: { select: { attendance: true } },
      },
    });

    const payload = { session: mapSession(updated), classId: updated.classId };
    emitToSession(sessionId, "session:closed", payload);
    emitToClass(updated.classId, "session:closed", payload);

    return payload;
  }
}
