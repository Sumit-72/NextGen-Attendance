import { getCurrentUser, requireRole } from "../auth";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { getPrisma } from "../prisma";
import { ProfileService } from "./profile.service";

type CreateLeaveInput = {
  fromDate: string;
  toDate: string;
  reason: string;
  classId?: string;
};

export class LeaveService {
  private readonly db = getPrisma();
  private readonly profiles = new ProfileService();

  async listLeaveRequests(filters?: { status?: string }) {
    const user = await getCurrentUser();

    if (user.role === "STUDENT") {
      const student = await this.profiles.getStudentProfile();
      if (!student) return [];

      const requests = await this.db.leaveRequest.findMany({
        where: {
          studentId: student.id,
          ...(filters?.status ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      return requests.map((request) => this.mapLeave(request));
    }

    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const requests = await this.db.leaveRequest.findMany({
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

    return requests.map((request) => ({
      ...this.mapLeave(request),
      student: {
        id: request.student.id,
        rollNumber: request.student.rollNumber,
        name: request.student.user.fullName,
        email: request.student.user.email,
      },
    }));
  }

  async createLeaveRequest(input: CreateLeaveInput) {
    await requireRole(["STUDENT", "ADMIN"]);
    const student = await this.profiles.getStudentProfile();
    if (!student) {
      throw new ConflictError("Complete your student profile before applying for leave");
    }

    const fromDate = new Date(input.fromDate);
    const toDate = new Date(input.toDate);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new ValidationError({}, "Invalid leave dates");
    }

    if (toDate < fromDate) {
      throw new ValidationError({}, "End date must be on or after start date");
    }

    if (input.classId) {
      const enrollment = await this.db.enrollment.findFirst({
        where: {
          classId: input.classId,
          studentId: student.id,
          status: "APPROVED",
        },
      });

      if (!enrollment) {
        throw new ForbiddenError("You are not enrolled in the selected class");
      }
    }

    const request = await this.db.leaveRequest.create({
      data: {
        studentId: student.id,
        classId: input.classId ?? null,
        fromDate,
        toDate,
        reason: input.reason.trim(),
      },
    });

    if (input.classId) {
      const klass = await this.db.class.findUnique({
        where: { id: input.classId },
        include: { teacher: { select: { userId: true } }, subject: true },
      });

      if (klass) {
        await this.db.notification.create({
          data: {
            userId: klass.teacher.userId,
            type: "ANNOUNCEMENT",
            title: "New leave request",
            body: `${student.user.fullName} requested leave for ${klass.subject.name}.`,
            metadata: { leaveRequestId: request.id, classId: input.classId },
          },
        });
      }
    }

    return this.mapLeave(request);
  }

  async reviewLeaveRequest(leaveId: string, status: "APPROVED" | "REJECTED") {
    const user = await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const request = await this.db.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { student: { include: { user: true, enrollments: { include: { class: true } } } } },
    });

    if (!request) {
      throw new NotFoundError("Leave request not found");
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
      throw new ConflictError("Only pending leave requests can be reviewed");
    }

    const updated = await this.db.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
    });

    await this.db.notification.create({
      data: {
        userId: request.student.userId,
        type: "ANNOUNCEMENT",
        title: status === "APPROVED" ? "Leave approved" : "Leave rejected",
        body:
          status === "APPROVED"
            ? "Your leave request was approved."
            : "Your leave request was rejected.",
        metadata: { leaveRequestId: updated.id, status },
      },
    });

    return this.mapLeave(updated);
  }

  private mapLeave(request: {
    id: string;
    classId: string | null;
    fromDate: Date;
    toDate: Date;
    reason: string;
    status: string;
    reviewedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: request.id,
      classId: request.classId,
      fromDate: request.fromDate,
      toDate: request.toDate,
      reason: request.reason,
      status: request.status,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
    };
  }
}
