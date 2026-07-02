import type { Role } from "../types/domain";

export const PERMISSIONS = {
  CLASS_CREATE: "class:create",
  CLASS_UPDATE: "class:update",
  CLASS_DELETE: "class:delete",
  CLASS_VIEW: "class:view",
  ENROLLMENT_REVIEW: "enrollment:review",
  ATTENDANCE_START: "attendance:start",
  ATTENDANCE_MARK: "attendance:mark",
  ATTENDANCE_MANUAL: "attendance:manual",
  REPORT_EXPORT: "report:export",
  ANALYTICS_VIEW: "analytics:view",
  ADMIN_MANAGE: "admin:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STUDENT: [PERMISSIONS.CLASS_VIEW, PERMISSIONS.ATTENDANCE_MARK, PERMISSIONS.ANALYTICS_VIEW],
  TEACHER: [
    PERMISSIONS.CLASS_CREATE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.CLASS_DELETE,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.ENROLLMENT_REVIEW,
    PERMISSIONS.ATTENDANCE_START,
    PERMISSIONS.ATTENDANCE_MANUAL,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  ADMIN: Object.values(PERMISSIONS),
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
