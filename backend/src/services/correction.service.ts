import { getCurrentUser, requireRole } from "../auth";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { getPrisma } from "../prisma";
import { ProfileService } from "./profile.service";

type CreateCorrectionInput = {
  attendanceId?: string;
  sessionId?: string;
  reason: string;
  requestedStatus?: "PRESENT" | "EXCUSED";
};

export class CorrectionService {
  private readonly db = getPrisma();
  private readonly profiles = new ProfileService();

  async listCorrectionRequests(filters?: { status?: string }) {
    const user = await getCurrentUser();

    if (user.role === "STUDENT") {
      const student = await this.profiles.getStudentProfile();
      if (!student) return [];

      const requests = await this.db.correctionRequest.findMany({
        where: {
          studentId: student.id,
          ...(filters?.status ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      return Promise.all(requests.map((request) => this.mapCorrection(request)));
    }

    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const requests = await this.db.correctionRequest.findMany({
      where: {
        ...(filters?.status ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : {}),
        student: {
          enrollments: {
            some: {
              status: "APPROVED",
              class: { teacherId: teacher.id },
            },
          },
        },
      },
      include: {
        student: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      requests.map(async (request) => ({
        ...(await this.mapCorrection(request)),
        student: {
          id: request.student.id,
          rollNumber: request.student.rollNumber,
          name: request.student.user.fullName,
          email: request.student.user.email,
        },
      })),
    );
  }

  async createCorrectionRequest(input: CreateCorrectionInput) {
    await requireRole(["STUDENT", "ADMIN"]);
    const student = await this.profiles.getStudentProfile();
    if (!student) {
      throw new ConflictError("Complete your student profile before requesting a correction");
    }

    if (!input.attendanceId && !input.sessionId) {
      throw new ConflictError("Provide an attendance record or session to correct");
    }

    if (input.attendanceId) {
      const attendance = await this.db.attendance.findUnique({
        where: { id: input.attendanceId },
        include: { session: { include: { class: { include: { teacher: { select: { userId: true } } } } } } },
      });

      if (!attendance || attendance.studentId !== student.id) {
        throw new ForbiddenError("Attendance record not found");
      }

      const existing = await this.db.correctionRequest.findFirst({
        where: {
          studentId: student.id,
          attendanceId: input.attendanceId,
          status: "PENDING",
        },
      });

      if (existing) {
        throw new ConflictError("A pending correction already exists for this attendance");
      }

      const request = await this.db.correctionRequest.create({
        data: {
          studentId: student.id,
          attendanceId: input.attendanceId,
          sessionId: attendance.sessionId,
          reason: input.reason.trim(),
        },
      });

      await this.db.notification.create({
        data: {
          userId: attendance.session.class.teacher.userId,
          type: "CORRECTION_UPDATED",
          title: "Attendance correction requested",
          body: `${student.user.fullName} requested an attendance correction.`,
          metadata: { correctionRequestId: request.id, attendanceId: input.attendanceId },
        },
      });

      return this.mapCorrection(request);
    }

    const session = await this.db.attendanceSession.findUnique({
      where: { id: input.sessionId },
      include: { class: { include: { teacher: { select: { userId: true } } } } },
    });

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    const enrollment = await this.db.enrollment.findFirst({
      where: { classId: session.classId, studentId: student.id, status: "APPROVED" },
    });

    if (!enrollment) {
      throw new ForbiddenError("You are not enrolled in this class");
    }

    const request = await this.db.correctionRequest.create({
      data: {
        studentId: student.id,
        sessionId: input.sessionId,
        reason: input.reason.trim(),
      },
    });

    await this.db.notification.create({
      data: {
        userId: session.class.teacher.userId,
        type: "CORRECTION_UPDATED",
        title: "Attendance correction requested",
        body: `${student.user.fullName} requested an attendance correction.`,
        metadata: { correctionRequestId: request.id, sessionId: input.sessionId },
      },
    });

    return this.mapCorrection(request);
  }

  async reviewCorrectionRequest(
    correctionId: string,
    status: "APPROVED" | "REJECTED",
    requestedStatus: "PRESENT" | "EXCUSED" = "PRESENT",
  ) {
    const user = await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const request = await this.db.correctionRequest.findUnique({
      where: { id: correctionId },
      include: {
        student: { include: { user: true, enrollments: { include: { class: true } } } },
      },
    });

    if (!request) {
      throw new NotFoundError("Correction request not found");
    }

    if (user.role === "TEACHER") {
      const teachesStudent = request.student.enrollments.some(
        (enrollment) => enrollment.status === "APPROVED" && enrollment.class.teacherId === teacher.id,
      );

      if (!teachesStudent) {
        throw new ForbiddenError();
      }
    }

    if (request.status !== "PENDING") {
      throw new ConflictError("Only pending correction requests can be reviewed");
    }

    if (status === "APPROVED") {
      if (request.attendanceId) {
        await this.db.attendance.update({
          where: { id: request.attendanceId },
          data: {
            status: requestedStatus,
            isLate: false,
            verificationScore: 100,
          },
        });
      } else if (request.sessionId) {
        const existing = await this.db.attendance.findUnique({
          where: {
            sessionId_studentId: {
              sessionId: request.sessionId,
              studentId: request.studentId,
            },
          },
        });

        if (existing) {
          await this.db.attendance.update({
            where: { id: existing.id },
            data: {
              status: requestedStatus,
              isLate: false,
              verificationScore: 100,
            },
          });
        } else {
          await this.db.attendance.create({
            data: {
              sessionId: request.sessionId,
              studentId: request.studentId,
              status: requestedStatus,
              verificationScore: 100,
            },
          });
        }
      }
    }

    const updated = await this.db.correctionRequest.update({
      where: { id: correctionId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
    });

    await this.db.notification.create({
      data: {
        userId: request.student.userId,
        type: "CORRECTION_UPDATED",
        title: status === "APPROVED" ? "Correction approved" : "Correction rejected",
        body:
          status === "APPROVED"
            ? "Your attendance correction was approved."
            : "Your attendance correction was rejected.",
        metadata: { correctionRequestId: updated.id, status },
      },
    });

    return this.mapCorrection(updated);
  }

  private async mapCorrection(request: {
    id: string;
    attendanceId: string | null;
    sessionId: string | null;
    reason: string;
    status: string;
    reviewedAt: Date | null;
    createdAt: Date;
  }) {
    let context: {
      subject?: string;
      className?: string;
      date?: string;
      currentStatus?: string;
    } = {};

    if (request.attendanceId) {
      const attendance = await this.db.attendance.findUnique({
        where: { id: request.attendanceId },
        include: { session: { include: { class: { include: { subject: true } } } } },
      });

      if (attendance) {
        context = {
          subject: attendance.session.class.subject.name,
          className: attendance.session.class.name,
          date: attendance.markedAt.toISOString(),
          currentStatus: attendance.status,
        };
      }
    } else if (request.sessionId) {
      const session = await this.db.attendanceSession.findUnique({
        where: { id: request.sessionId },
        include: { class: { include: { subject: true } } },
      });

      if (session) {
        context = {
          subject: session.class.subject.name,
          className: session.class.name,
          date: session.startsAt.toISOString(),
          currentStatus: "ABSENT",
        };
      }
    }

    return {
      id: request.id,
      attendanceId: request.attendanceId,
      sessionId: request.sessionId,
      reason: request.reason,
      status: request.status,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      context,
    };
  }
}
