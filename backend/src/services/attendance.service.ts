import { getCurrentUser, requireRole } from "../auth";
import { getRequestContext } from "../context/request-context";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { emitToClass, emitToSession } from "../lib/realtime";
import { getPrisma } from "../prisma";
import {
  fingerprintDevice,
  haversineDistanceMeters,
  hashOtp,
  hashQrToken,
  verifyHash,
} from "../security";
import type { GeoPoint } from "../types/domain";
import { ProfileService } from "./profile.service";

type MarkAttendanceInput = {
  sessionId: string;
  otp?: string;
  qrToken?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  deviceFingerprint: string;
};

export class AttendanceService {
  private readonly db = getPrisma();
  private readonly profiles = new ProfileService();

  async markAttendance(input: MarkAttendanceInput) {
    await requireRole(["STUDENT", "ADMIN"]);
    const user = await getCurrentUser();
    const student = await this.profiles.getStudentProfile();

    if (!student) {
      throw new ConflictError("Complete your student profile before marking attendance");
    }

    const session = await this.db.attendanceSession.findUnique({
      where: { id: input.sessionId },
      include: {
        class: {
          include: {
            subject: true,
            enrollments: {
              where: { studentId: student.id, status: "APPROVED" },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Attendance session not found");
    }

    if (session.status !== "ACTIVE" || session.expiresAt <= new Date()) {
      throw new ConflictError("Attendance session is not active");
    }

    if (session.class.enrollments.length === 0) {
      throw new ForbiddenError("You are not enrolled in this class");
    }

    const existing = await this.db.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: student.id,
        },
      },
    });

    if (existing) {
      throw new ConflictError("Attendance already marked for this session");
    }

    this.validateVerification(session.mode, session, input);
    const geoResult = this.validateGeofence(session, {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
    });

    const requestContext = getRequestContext();
    const deviceHash = fingerprintDevice({
      fingerprint: input.deviceFingerprint,
      userAgent: requestContext?.userAgent,
      ipAddress: requestContext?.ipAddress,
    });

    const device = await this.db.device.upsert({
      where: {
        userId_fingerprint: {
          userId: user.id,
          fingerprint: deviceHash,
        },
      },
      create: {
        userId: user.id,
        fingerprint: deviceHash,
        browser: requestContext?.userAgent?.slice(0, 120),
        lastIpAddress: requestContext?.ipAddress,
      },
      update: {
        lastSeenAt: new Date(),
        lastIpAddress: requestContext?.ipAddress,
      },
    });

    const location = await this.db.location.create({
      data: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracy,
        capturedAt: new Date(),
      },
    });

    const now = new Date();
    const onTimeDeadline = new Date(session.startsAt);
    onTimeDeadline.setMinutes(onTimeDeadline.getMinutes() + session.attendanceWindowMinutes);
    const status = now <= onTimeDeadline ? "PRESENT" : "LATE";

    const attendance = await this.db.attendance.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        status,
        markedAt: now,
        distanceMeters: geoResult.distanceMeters,
        gpsAccuracy: input.accuracy,
        locationId: location.id,
        deviceId: device.id,
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        isLate: status === "LATE",
        verificationScore: geoResult.verificationScore,
      },
      include: {
        student: { include: { user: true } },
      },
    });

    await this.db.attendanceLog.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        event: "ATTENDANCE_MARKED",
        status,
        reason: geoResult.reason,
        metadata: {
          distanceMeters: geoResult.distanceMeters,
          accuracy: input.accuracy,
          mode: session.mode,
        },
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
      },
    });

    const joinedCount = await this.db.attendance.count({
      where: { sessionId: session.id },
    });

    const payload = {
      sessionId: session.id,
      classId: session.classId,
      joinedCount,
      attendance: {
        id: attendance.id,
        status: attendance.status,
        markedAt: attendance.markedAt,
        student: {
          id: attendance.student.id,
          rollNumber: attendance.student.rollNumber,
          name: attendance.student.user.fullName,
        },
      },
    };

    emitToSession(session.id, "attendance:marked", payload);
    emitToClass(session.classId, "attendance:marked", payload);

    return {
      attendance: {
        id: attendance.id,
        status: attendance.status,
        markedAt: attendance.markedAt,
        isLate: attendance.isLate,
        distanceMeters: geoResult.distanceMeters,
      },
      session: {
        id: session.id,
        classId: session.classId,
        subject: session.class.subject.name,
      },
    };
  }

  private validateVerification(
    mode: string,
    session: { id: string; otpHash: string | null; qrTokenHash: string | null },
    input: MarkAttendanceInput,
  ) {
    if (mode === "GEO") {
      return;
    }

    if (mode === "OTP") {
      if (!input.otp?.trim()) {
        throw new ValidationError({}, "OTP is required for this session");
      }

      const candidate = hashOtp(input.otp.trim(), session.id);
      if (!session.otpHash || !verifyHash(candidate, session.otpHash)) {
        throw new ValidationError({}, "Invalid OTP");
      }

      return;
    }

    if (mode === "QR") {
      if (!input.qrToken?.trim()) {
        throw new ValidationError({}, "QR token is required for this session");
      }

      const candidate = hashQrToken(input.qrToken.trim(), session.id);
      if (!session.qrTokenHash || !verifyHash(candidate, session.qrTokenHash)) {
        throw new ValidationError({}, "Invalid QR token");
      }

      return;
    }

    if (mode === "MANUAL") {
      throw new ConflictError("Manual attendance must be recorded by the teacher");
    }
  }

  private validateGeofence(
    session: {
      centerLatitude: { toString(): string } | null;
      centerLongitude: { toString(): string } | null;
      allowedRadiusMeters: number;
      minGpsAccuracyMeters: number;
    },
    point: GeoPoint,
  ) {
    if (session.centerLatitude === null || session.centerLongitude === null) {
      return {
        distanceMeters: null,
        verificationScore: 100,
        reason: "No geofence configured",
      };
    }

    if (point.accuracy !== undefined && point.accuracy > session.minGpsAccuracyMeters) {
      throw new ValidationError(
        {},
        `GPS accuracy must be within ${session.minGpsAccuracyMeters} meters`,
      );
    }

    const center: GeoPoint = {
      latitude: Number(session.centerLatitude),
      longitude: Number(session.centerLongitude),
    };

    const distanceMeters = haversineDistanceMeters(center, point);

    if (distanceMeters > session.allowedRadiusMeters) {
      throw new ValidationError(
        { distanceMeters, allowedRadiusMeters: session.allowedRadiusMeters },
        `You are outside the allowed area (${Math.round(distanceMeters)}m from center)`,
      );
    }

    const accuracyPenalty =
      point.accuracy !== undefined
        ? Math.max(0, Math.min(20, Math.round(point.accuracy / 5)))
        : 0;

    return {
      distanceMeters,
      verificationScore: Math.max(60, 100 - accuracyPenalty),
      reason: `Within geofence (${Math.round(distanceMeters)}m)`,
    };
  }
}
