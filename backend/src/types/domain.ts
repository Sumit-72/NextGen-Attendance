export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export type SessionUser = {
  id: string;
  firebaseUid: string;
  email: string;
  fullName: string;
  role: Role;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "ARCHIVED";
  departmentId?: string | null;
  locationPermissionStatus?: "UNKNOWN" | "PROMPT" | "GRANTED" | "DENIED" | "RESTRICTED";
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
};

export type DeviceSignal = {
  fingerprint: string;
  userAgent?: string;
  ipAddress?: string;
};
