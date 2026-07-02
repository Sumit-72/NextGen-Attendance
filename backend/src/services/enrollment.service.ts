import { getCurrentUser, requireRole } from "../auth";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { getPrisma } from "../prisma";
import { ProfileService } from "./profile.service";

export class EnrollmentService {
  private readonly db = getPrisma();
  private readonly profiles = new ProfileService();

  async listEnrollments(filters?: { classId?: string; status?: string }) {
    const user = await getCurrentUser();

    if (user.role === "STUDENT") {
      const student = await this.profiles.getStudentProfile();
      if (!student) {
        return [];
      }

      const enrollments = await this.db.enrollment.findMany({
        where: {
          studentId: student.id,
          ...(filters?.status ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" | "REMOVED" } : {}),
        },
        include: {
          class: {
            include: {
              subject: true,
              teacher: { include: { user: true } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      });

      return enrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        requestedAt: enrollment.requestedAt,
        reviewedAt: enrollment.reviewedAt,
        class: {
          id: enrollment.class.id,
          code: enrollment.class.code,
          name: enrollment.class.name,
          subject: enrollment.class.subject.name,
          teacher: enrollment.class.teacher.user.fullName,
        },
      }));
    }

    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const enrollments = await this.db.enrollment.findMany({
      where: {
        ...(filters?.status ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" | "REMOVED" } : {}),
        class: {
          teacherId: teacher.id,
          ...(filters?.classId ? { id: filters.classId } : {}),
        },
      },
      include: {
        class: { include: { subject: true } },
        student: { include: { user: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      requestedAt: enrollment.requestedAt,
      reviewedAt: enrollment.reviewedAt,
      class: {
        id: enrollment.class.id,
        code: enrollment.class.code,
        name: enrollment.class.name,
        subject: enrollment.class.subject.name,
      },
      student: {
        id: enrollment.student.id,
        rollNumber: enrollment.student.rollNumber,
        name: enrollment.student.user.fullName,
        email: enrollment.student.user.email,
      },
    }));
  }

  async requestEnrollment(classId: string) {
    await requireRole(["STUDENT", "ADMIN"]);
    const student = await this.profiles.getStudentProfile();
    if (!student) {
      throw new ConflictError("Complete your student profile before joining a class");
    }

    const klass = await this.db.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { status: "APPROVED" },
          select: { id: true },
        },
      },
    });

    if (!klass) {
      throw new NotFoundError("Class not found");
    }

    if (klass.enrollments.length >= klass.capacity) {
      throw new ConflictError("This class is full");
    }

    const existing = await this.db.enrollment.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId: student.id,
        },
      },
    });

    if (existing) {
      if (existing.status === "REJECTED") {
        return this.db.enrollment.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            requestedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
          },
          include: {
            class: { include: { subject: true, teacher: { include: { user: true } } } },
          },
        });
      }

      throw new ConflictError(`Enrollment already ${existing.status.toLowerCase()}`);
    }

    const enrollment = await this.db.enrollment.create({
      data: {
        classId,
        studentId: student.id,
        status: "PENDING",
      },
      include: {
        class: { include: { subject: true, teacher: { include: { user: true } } } },
      },
    });

    const teacher = await this.db.teacher.findUnique({
      where: { id: klass.teacherId },
      select: { userId: true },
    });

    if (teacher) {
      await this.db.notification.create({
        data: {
          userId: teacher.userId,
          type: "ENROLLMENT_REQUEST",
          title: "New enrollment request",
          body: `${student.user.fullName} requested to join ${klass.name}.`,
          metadata: { enrollmentId: enrollment.id, classId },
        },
      });
    }

    return {
      id: enrollment.id,
      status: enrollment.status,
      requestedAt: enrollment.requestedAt,
      class: {
        id: enrollment.class.id,
        code: enrollment.class.code,
        name: enrollment.class.name,
        subject: enrollment.class.subject.name,
        teacher: enrollment.class.teacher.user.fullName,
      },
    };
  }

  async reviewEnrollment(enrollmentId: string, status: "APPROVED" | "REJECTED") {
    const user = await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const enrollment = await this.db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: true,
        student: { include: { user: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    if (enrollment.class.teacherId !== teacher.id && user.role !== "ADMIN") {
      throw new ForbiddenError();
    }

    if (enrollment.status !== "PENDING") {
      throw new ConflictError("Only pending enrollments can be reviewed");
    }

    if (status === "APPROVED") {
      const approvedCount = await this.db.enrollment.count({
        where: { classId: enrollment.classId, status: "APPROVED" },
      });

      if (approvedCount >= enrollment.class.capacity) {
        throw new ConflictError("Class capacity reached");
      }
    }

    const updated = await this.db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
      include: {
        class: { include: { subject: true } },
        student: { include: { user: true } },
      },
    });

    await this.db.notification.create({
      data: {
        userId: updated.student.userId,
        type: "ANNOUNCEMENT",
        title: status === "APPROVED" ? "Enrollment approved" : "Enrollment rejected",
        body:
          status === "APPROVED"
            ? `You were approved for ${updated.class.name}.`
            : `Your request to join ${updated.class.name} was rejected.`,
        metadata: { enrollmentId: updated.id, classId: updated.classId, status },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewedAt,
      class: {
        id: updated.class.id,
        code: updated.class.code,
        name: updated.class.name,
        subject: updated.class.subject.name,
      },
      student: {
        id: updated.student.id,
        rollNumber: updated.student.rollNumber,
        name: updated.student.user.fullName,
        email: updated.student.user.email,
      },
    };
  }
}
