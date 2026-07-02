import { getCurrentUser, requireRole } from "../auth";
import { ConflictError } from "../errors";
import { getPrisma } from "../prisma";

export class ProfileService {
  private readonly db = getPrisma();

  async ensureTeacherProfile() {
    const user = await requireRole(["TEACHER", "ADMIN"]);
    const existing = await this.db.teacher.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (existing) {
      return existing;
    }

    const employeeId = `T-${user.firebaseUid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase() || user.id.slice(0, 10).toUpperCase()}`;

    return this.db.teacher.create({
      data: {
        userId: user.id,
        employeeId,
      },
      include: { user: true },
    });
  }

  async getStudentProfile() {
    const user = await requireRole(["STUDENT", "ADMIN"]);
    return this.db.student.findUnique({
      where: { userId: user.id },
      include: { course: { include: { department: true } }, user: true },
    });
  }

  async upsertStudentProfile(input: {
    rollNumber: string;
    semester: number;
    division: string;
    courseId: string;
  }) {
    const user = await requireRole(["STUDENT", "ADMIN"]);

    const course = await this.db.course.findUnique({ where: { id: input.courseId } });
    if (!course) {
      throw new ConflictError("Selected course does not exist");
    }

    const rollTaken = await this.db.student.findFirst({
      where: {
        rollNumber: input.rollNumber,
        NOT: { userId: user.id },
      },
    });

    if (rollTaken) {
      throw new ConflictError("Roll number is already registered");
    }

    return this.db.student.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        rollNumber: input.rollNumber,
        semester: input.semester,
        division: input.division,
        courseId: input.courseId,
      },
      update: {
        rollNumber: input.rollNumber,
        semester: input.semester,
        division: input.division,
        courseId: input.courseId,
      },
      include: { course: { include: { department: true } }, user: true },
    });
  }

  async getCurrentProfile() {
    const user = await getCurrentUser();

    if (user.role === "TEACHER" || user.role === "ADMIN") {
      const teacher = await this.db.teacher.findUnique({
        where: { userId: user.id },
        include: { user: true },
      });

      return {
        role: user.role,
        complete: Boolean(teacher),
        teacher,
        student: null,
      };
    }

    const student = await this.getStudentProfile();
    return {
      role: user.role,
      complete: Boolean(student),
      teacher: null,
      student,
    };
  }
}
