export type AttendanceSession = {
  id: string;
  classId: string;
  teacherId: string;
  mode: "OTP" | "QR" | "GEO" | "MANUAL";
  status: string;
  startsAt: string;
  expiresAt: string;
  closedAt?: string | null;
  attendanceWindowMinutes: number;
  allowedRadiusMeters: number;
  minGpsAccuracyMeters: number;
  centerLatitude: number | null;
  centerLongitude: number | null;
  joinedCount: number;
  totalStudents: number;
  class?: {
    id: string;
    name: string;
    code: string;
    subject: string;
  };
  myAttendance?: {
    id: string;
    status: string;
    markedAt: string;
  } | null;
  attendance?: Array<{
    id: string;
    status: string;
    markedAt: string;
    student: {
      id: string;
      rollNumber: string;
      name: string;
    };
  }>;
};

export type SessionCredentials = {
  otp?: string | null;
  qrToken?: string | null;
  qrPayload?: string | null;
};

export type StartSessionResult = {
  session: AttendanceSession;
  credentials: SessionCredentials;
};
