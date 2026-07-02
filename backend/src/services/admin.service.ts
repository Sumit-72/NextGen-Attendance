import { requireRole } from "../auth";
import { NotFoundError } from "../errors";
import { getPrisma } from "../prisma";

export class AdminService {
  private readonly db = getPrisma();

  async getOverview() {
    await requireRole(["ADMIN"]);

    const [
      totalUsers,
      activeUsers,
      teachers,
      students,
      classes,
      activeSessions,
      pendingEnrollments,
      pendingLeave,
      pendingCorrections,
      attendanceToday,
      recentAuditLogs,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { status: "ACTIVE" } }),
      this.db.teacher.count(),
      this.db.student.count(),
      this.db.class.count(),
      this.db.attendanceSession.count({
        where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
      }),
      this.db.enrollment.count({ where: { status: "PENDING" } }),
      this.db.leaveRequest.count({ where: { status: "PENDING" } }),
      this.db.correctionRequest.count({ where: { status: "PENDING" } }),
      this.db.attendance.count({
        where: {
          markedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: true },
      }),
    ]);

    return {
      metrics: {
        totalUsers,
        activeUsers,
        teachers,
        students,
        classes,
        activeSessions,
        pendingEnrollments,
        pendingLeave,
        pendingCorrections,
        attendanceToday,
      },
      recentAuditLogs: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        actor: log.actor?.fullName ?? "System",
        createdAt: log.createdAt,
      })),
    };
  }

  async listUsers() {
    await requireRole(["ADMIN"]);

    const users = await this.db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        teacherProfile: true,
        studentProfile: true,
        department: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      department: user.department?.name ?? null,
      employeeId: user.teacherProfile?.employeeId ?? null,
      rollNumber: user.studentProfile?.rollNumber ?? null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));
  }

  async updateUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED" | "ARCHIVED") {
    const admin = await requireRole(["ADMIN"]);

    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const updated = await this.db.user.update({
      where: { id: userId },
      data: { status },
    });

    await this.db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "USER_STATUS_UPDATED",
        entity: "User",
        entityId: userId,
        metadata: { status, previousStatus: user.status },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      status: updated.status,
    };
  }
}
