export type LeaveRequest = {
  id: string;
  classId?: string | null;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedAt?: string | null;
  createdAt: string;
  student?: {
    id: string;
    rollNumber: string;
    name: string;
    email: string;
  };
};

export type CorrectionRequest = {
  id: string;
  attendanceId?: string | null;
  sessionId?: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedAt?: string | null;
  createdAt: string;
  context?: {
    subject?: string;
    className?: string;
    date?: string;
    currentStatus?: string;
  };
  student?: {
    id: string;
    rollNumber: string;
    name: string;
    email: string;
  };
};
