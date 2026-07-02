import { requireRole } from "../auth";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { getPrisma } from "../prisma";
import { ProfileService } from "./profile.service";

type CreateClassInput = {
  name: string;
  code?: string;
  departmentId: string;
  courseId: string;
  subjectId: string;
  semester: number;
  division: string;
  capacity?: number;
};

type UpdateClassInput = Partial<CreateClassInput>;

function slugify(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export class ClassService {
  private readonly db = getPrisma();
  private readonly profiles = new ProfileService();

  private async getTeacherForUser() {
    return this.profiles.ensureTeacherProfile();
  }

  async listClasses() {
    const user = await requireRole(["STUDENT", "TEACHER", "ADMIN"]);

    if (user.role === "TEACHER" || user.role === "ADMIN") {
      const teacher = await this.getTeacherForUser();
      const classes = await this.db.class.findMany({
        where: user.role === "ADMIN" ? undefined : { teacherId: teacher.id },
        include: {
          subject: true,
          course: true,
          department: true,
          teacher: { include: { user: true } },
          enrollments: {
            select: { status: true },
          },
          _count: { select: { enrollments: true, sessions: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      return classes.map((klass) => ({
        id: klass.id,
        code: klass.code,
        name: klass.name,
        semester: klass.semester,
        division: klass.division,
        capacity: klass.capacity,
        subject: { id: klass.subject.id, name: klass.subject.name, code: klass.subject.code },
        course: { id: klass.course.id, name: klass.course.name, code: klass.course.code },
        department: { id: klass.department.id, name: klass.department.name, code: klass.department.code },
        teacher: klass.teacher.user.fullName,
        enrollmentCounts: {
          pending: klass.enrollments.filter((item) => item.status === "PENDING").length,
          approved: klass.enrollments.filter((item) => item.status === "APPROVED").length,
          total: klass._count.enrollments,
        },
        sessionCount: klass._count.sessions,
        createdAt: klass.createdAt,
      }));
    }

    const student = await this.db.student.findUnique({ where: { userId: user.id } });
    const enrollments = student
      ? await this.db.enrollment.findMany({
          where: { studentId: student.id },
          select: { classId: true, status: true },
        })
      : [];

    const enrollmentByClass = new Map(enrollments.map((item) => [item.classId, item.status]));

    const classes = await this.db.class.findMany({
      include: {
        subject: true,
        course: true,
        department: true,
        teacher: { include: { user: true } },
        enrollments: {
          where: { status: "APPROVED" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return classes.map((klass) => ({
      id: klass.id,
      code: klass.code,
      name: klass.name,
      semester: klass.semester,
      division: klass.division,
      capacity: klass.capacity,
      seatsUsed: klass.enrollments.length,
      subject: { id: klass.subject.id, name: klass.subject.name, code: klass.subject.code },
      course: { id: klass.course.id, name: klass.course.name, code: klass.course.code },
      department: { id: klass.department.id, name: klass.department.name, code: klass.department.code },
      teacher: klass.teacher.user.fullName,
      enrollmentStatus: enrollmentByClass.get(klass.id) ?? null,
      isFull: klass.enrollments.length >= klass.capacity,
    }));
  }

  async getClass(classId: string) {
    const user = await requireRole(["STUDENT", "TEACHER", "ADMIN"]);
    const klass = await this.db.class.findUnique({
      where: { id: classId },
      include: {
        subject: true,
        course: true,
        department: true,
        teacher: { include: { user: true } },
        enrollments: {
          include: {
            student: { include: { user: true } },
          },
          orderBy: { requestedAt: "desc" },
        },
      },
    });

    if (!klass) {
      throw new NotFoundError("Class not found");
    }

    if (user.role === "TEACHER") {
      const teacher = await this.getTeacherForUser();
      if (klass.teacherId !== teacher.id) {
        throw new ForbiddenError();
      }
    }

    return {
      id: klass.id,
      code: klass.code,
      name: klass.name,
      semester: klass.semester,
      division: klass.division,
      capacity: klass.capacity,
      subject: klass.subject,
      course: klass.course,
      department: klass.department,
      teacher: klass.teacher.user.fullName,
      enrollments: klass.enrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        requestedAt: enrollment.requestedAt,
        reviewedAt: enrollment.reviewedAt,
        student: {
          id: enrollment.student.id,
          rollNumber: enrollment.student.rollNumber,
          name: enrollment.student.user.fullName,
          email: enrollment.student.user.email,
        },
      })),
    };
  }

  async createClass(input: CreateClassInput) {
    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.getTeacherForUser();

    const subject = await this.db.subject.findUnique({ where: { id: input.subjectId } });
    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    const code =
      input.code?.trim().toUpperCase() ||
      `${slugify(subject.code)}-S${input.semester}-${slugify(input.division)}-${Date.now().toString(36).toUpperCase()}`;

    const existingCode = await this.db.class.findUnique({ where: { code } });
    if (existingCode) {
      throw new ConflictError("Class code already exists");
    }

    const klass = await this.db.class.create({
      data: {
        code,
        name: input.name.trim(),
        departmentId: input.departmentId,
        courseId: input.courseId,
        subjectId: input.subjectId,
        teacherId: teacher.id,
        semester: input.semester,
        division: input.division.trim().toUpperCase(),
        capacity: input.capacity ?? 120,
      },
      include: {
        subject: true,
        course: true,
        department: true,
        teacher: { include: { user: true } },
      },
    });

    return {
      id: klass.id,
      code: klass.code,
      name: klass.name,
      semester: klass.semester,
      division: klass.division,
      capacity: klass.capacity,
      subject: klass.subject,
      course: klass.course,
      department: klass.department,
      teacher: klass.teacher.user.fullName,
    };
  }

  async updateClass(classId: string, input: UpdateClassInput) {
    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.getTeacherForUser();

    const existing = await this.db.class.findUnique({ where: { id: classId } });
    if (!existing) {
      throw new NotFoundError("Class not found");
    }

    if (existing.teacherId !== teacher.id) {
      throw new ForbiddenError();
    }

    const klass = await this.db.class.update({
      where: { id: classId },
      data: {
        name: input.name?.trim(),
        semester: input.semester,
        division: input.division?.trim().toUpperCase(),
        capacity: input.capacity,
        departmentId: input.departmentId,
        courseId: input.courseId,
        subjectId: input.subjectId,
      },
      include: {
        subject: true,
        course: true,
        department: true,
        teacher: { include: { user: true } },
      },
    });

    return klass;
  }
}
