export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export type SessionUser = {
  id: string;
  firebaseUid: string;
  email: string;
  fullName: string;
  role: Role;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "ARCHIVED";
  departmentId?: string | null;
};

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export type SessionExchangeResult = {
  user: SessionUser;
  sessionToken: string;
  expiresIn: string;
  permissions: string[];
};

export type MeResult = {
  user: SessionUser;
  permissions: string[];
};
