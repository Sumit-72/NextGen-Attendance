import { format } from "date-fns";
import { requireRole } from "../auth";
import { ForbiddenError, NotFoundError } from "../errors";
import { getPrisma } from "../prisma";
import { ProfileService } from "./profile.service";

export class ReportService {
  private readonly db = getPrisma();
  private readonly profiles = new ProfileService();

  async getStudentReport() {
    await requireRole(["STUDENT", "ADMIN"]);
    const student = await this.profiles.getStudentProfile();
    if (!student) {
      return { summary: [], records: [] };
    }

    const attendance = await this.db.attendance.findMany({
      where: { studentId: student.id },
      include: {
        session: { include: { class: { include: { subject: true, teacher: { include: { user: true } } } } } },
      },
      orderBy: { markedAt: "desc" },
    });

    const subjectBuckets = new Map<string, { total: number; present: number }>();
    for (const item of attendance) {
      const subject = item.session.class.subject.name;
      const bucket = subjectBuckets.get(subject) ?? { total: 0, present: 0 };
      bucket.total += 1;
      if (item.status === "PRESENT" || item.status === "LATE" || item.status === "EXCUSED") {
        bucket.present += 1;
      }
      subjectBuckets.set(subject, bucket);
    }

    const summary = [...subjectBuckets.entries()].map(([subject, stats]) => ({
      subject,
      total: stats.total,
      present: stats.present,
      percent: stats.total === 0 ? 0 : Math.round((stats.present / stats.total) * 1000) / 10,
    }));

    const records = attendance.map((item) => ({
      id: item.id,
      subject: item.session.class.subject.name,
      className: item.session.class.name,
      teacher: item.session.class.teacher.user.fullName,
      date: format(item.markedAt, "yyyy-MM-dd"),
      status: item.status,
    }));

    return { summary, records };
  }

  async getTeacherReport(classId?: string) {
    await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.profiles.ensureTeacherProfile();

    const classes = await this.db.class.findMany({
      where: {
        teacherId: teacher.id,
        ...(classId ? { id: classId } : {}),
      },
      include: {
        subject: true,
        enrollments: {
          where: { status: "APPROVED" },
          include: { student: { include: { user: true, attendance: true } } },
        },
        sessions: {
          include: { attendance: { include: { student: { include: { user: true } } } } },
          orderBy: { startsAt: "desc" },
          take: 30,
        },
      },
    });

    if (classId && classes.length === 0) {
      throw new NotFoundError("Class not found");
    }

    return classes.map((klass) => ({
      classId: klass.id,
      className: klass.name,
      subject: klass.subject.name,
      enrolledStudents: klass.enrollments.length,
      sessionsHeld: klass.sessions.length,
      records: klass.sessions.flatMap((session) =>
        session.attendance.map((item) => ({
          sessionId: session.id,
          sessionDate: format(session.startsAt, "yyyy-MM-dd"),
          studentName: item.student.user.fullName,
          rollNumber: item.student.rollNumber,
          status: item.status,
          markedAt: format(item.markedAt, "yyyy-MM-dd HH:mm"),
        })),
      ),
    }));
  }

  async exportTeacherCsv(classId: string) {
    const report = await this.getTeacherReport(classId);
    const klass = report[0];

    if (!klass) {
      throw new NotFoundError("Class not found");
    }

    const teacher = await this.profiles.ensureTeacherProfile();
    const owned = await this.db.class.findFirst({
      where: { id: classId, teacherId: teacher.id },
    });

    if (!owned) {
      throw new ForbiddenError();
    }

    const header = "Session Date,Student Name,Roll Number,Status,Marked At\n";
    const rows = klass.records
      .map(
        (row) =>
          `${row.sessionDate},"${row.studentName}",${row.rollNumber},${row.status},${row.markedAt}`,
      )
      .join("\n");

    return {
      filename: `${klass.className.replace(/[^a-zA-Z0-9-_]/g, "_")}-attendance.csv`,
      content: header + rows,
    };
  }
}
