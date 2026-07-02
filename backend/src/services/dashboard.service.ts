import { format, subMonths } from "date-fns";
import { requireRole } from "../auth";
import { getPrisma } from "../prisma";

type ChartPoint = {
  month: string;
  present: number;
  late: number;
};

type SubjectPoint = {
  subject: string;
  percent: number;
};

type HeatmapDay = {
  day: number;
  value: number;
};

function attendancePercent(present: number, total: number) {
  if (total === 0) return 0;
  return Math.round((present / total) * 1000) / 10;
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function buildEmptyTrend(): ChartPoint[] {
  return Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(new Date(), 5 - index);
    return { month: format(date, "MMM"), present: 0, late: 0 };
  });
}

function buildHeatmap(records: { markedAt: Date; status: string }[]): HeatmapDay[] {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const byDay = new Map<number, { total: number; present: number }>();

  for (const record of records) {
    if (
      record.markedAt.getMonth() !== today.getMonth() ||
      record.markedAt.getFullYear() !== today.getFullYear()
    ) {
      continue;
    }
    const day = record.markedAt.getDate();
    const current = byDay.get(day) ?? { total: 0, present: 0 };
    current.total += 1;
    if (record.status === "PRESENT" || record.status === "LATE") current.present += 1;
    byDay.set(day, current);
  }

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const stats = byDay.get(day);
    if (!stats || stats.total === 0) return { day, value: 0 };
    return { day, value: Math.max(1, Math.min(4, Math.ceil((stats.present / stats.total) * 4))) };
  });
}

function buildTrend(records: { markedAt: Date; status: string }[]): ChartPoint[] {
  const trend = buildEmptyTrend();
  const lookup = new Map(trend.map((item) => [item.month, item]));

  for (const record of records) {
    const month = format(record.markedAt, "MMM");
    const bucket = lookup.get(month);
    if (!bucket) continue;
    if (record.status === "PRESENT") bucket.present += 1;
    if (record.status === "LATE") bucket.late += 1;
  }

  return trend;
}

export class DashboardService {
  private readonly db = getPrisma();

  async getStudentDashboard() {
    const user = await requireRole(["STUDENT", "ADMIN"]);
    const student = await this.db.student.findUnique({
      where: { userId: user.id },
      include: {
        user: true,
        enrollments: {
          where: { status: "APPROVED" },
          include: { class: { include: { subject: true, teacher: { include: { user: true } } } } },
          orderBy: { requestedAt: "desc" },
        },
        attendance: {
          include: { session: { include: { class: { include: { subject: true, teacher: { include: { user: true } } } } } } },
          orderBy: { markedAt: "desc" },
          take: 250,
        },
        leaveRequests: { orderBy: { createdAt: "desc" }, take: 5 },
        correctionRequests: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!student) {
      return {
        profile: { name: user.fullName, email: user.email },
        metrics: {
          todayStatus: "Pending",
          overallAttendance: "0%",
          geoStatus: "No check-in",
          lowAlerts: 0,
        },
        joinedClasses: [],
        activeSessions: [],
        recentAttendance: [],
        subjectBreakdown: [],
        attendanceTrend: buildEmptyTrend(),
        heatmapDays: buildHeatmap([]),
        leaveRequests: [],
        correctionRequests: [],
        notifications: [],
      };
    }

    const classIds = student.enrollments.map((enrollment) => enrollment.classId);
    const now = new Date();
    const activeSessions = await this.db.attendanceSession.findMany({
      where: {
        classId: { in: classIds },
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      include: {
        class: { include: { subject: true } },
        _count: { select: { attendance: true } },
      },
      orderBy: { expiresAt: "asc" },
      take: 5,
    });
    const notifications = await this.db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const attendanceRecords = student.attendance;
    const presentCount = attendanceRecords.filter(
      (item) => item.status === "PRESENT" || item.status === "LATE",
    ).length;
    const overall = attendancePercent(presentCount, attendanceRecords.length);

    const subjectBuckets = new Map<string, { total: number; present: number }>();
    for (const item of attendanceRecords) {
      const subject = item.session.class.subject.name;
      const bucket = subjectBuckets.get(subject) ?? { total: 0, present: 0 };
      bucket.total += 1;
      if (item.status === "PRESENT" || item.status === "LATE") bucket.present += 1;
      subjectBuckets.set(subject, bucket);
    }

    const subjectBreakdown: SubjectPoint[] = [...subjectBuckets.entries()].map(
      ([subject, stats]) => ({
        subject,
        percent: attendancePercent(stats.present, stats.total),
      }),
    );

    return {
      profile: {
        name: student.user.fullName,
        email: student.user.email,
        rollNumber: student.rollNumber,
      },
      metrics: {
        todayStatus:
          attendanceRecords.find((item) => item.markedAt.toDateString() === now.toDateString())
            ?.status ?? "Pending",
        overallAttendance: formatPercent(overall),
        geoStatus: attendanceRecords[0]?.distanceMeters
          ? `Inside ${Math.round(Number(attendanceRecords[0].distanceMeters))}m`
          : "No check-in",
        lowAlerts: subjectBreakdown.filter((item) => item.percent < 75).length,
      },
      joinedClasses: student.enrollments.map((enrollment) => ({
        id: enrollment.class.id,
        name: enrollment.class.name,
        code: enrollment.class.code,
        subject: enrollment.class.subject.name,
        teacher: enrollment.class.teacher.user.fullName,
      })),
      activeSessions: activeSessions.map((session) => ({
        id: session.id,
        subject: session.class.subject.name,
        className: session.class.name,
        mode: session.mode,
        expiresAt: session.expiresAt,
        joined: session._count.attendance,
      })),
      recentAttendance: attendanceRecords.slice(0, 8).map((item) => ({
        id: item.id,
        subject: item.session.class.subject.name,
        date: format(item.markedAt, "dd MMM yyyy"),
        status: item.status,
        teacher: item.session.class.teacher.user.fullName,
      })),
      subjectBreakdown,
      attendanceTrend: buildTrend(attendanceRecords),
      heatmapDays: buildHeatmap(attendanceRecords),
      leaveRequests: student.leaveRequests,
      correctionRequests: student.correctionRequests,
      notifications,
    };
  }

  async getTeacherDashboard() {
    const user = await requireRole(["TEACHER", "ADMIN"]);
    const teacher = await this.db.teacher.findUnique({
      where: { userId: user.id },
      include: {
        user: true,
        classes: {
          include: {
            subject: true,
            enrollments: true,
            sessions: {
              include: { attendance: true },
              orderBy: { startsAt: "desc" },
              take: 25,
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!teacher) {
      return {
        profile: { name: user.fullName, email: user.email },
        metrics: {
          todaysClasses: 0,
          liveJoinCount: 0,
          absentStudents: 0,
          departmentAverage: "0%",
        },
        activeSessions: [],
        recentActivities: [],
        lowAttendanceStudents: [],
        attendanceTrend: buildEmptyTrend(),
        subjectBreakdown: [],
      };
    }

    const activeSessions = teacher.classes.flatMap((klass) =>
      klass.sessions
        .filter((session) => session.status === "ACTIVE" && session.expiresAt > new Date())
        .map((session) => ({
          id: session.id,
          subject: klass.subject.name,
          className: klass.name,
          mode: session.mode,
          joined: session.attendance.length,
          total: klass.enrollments.filter((enrollment) => enrollment.status === "APPROVED").length,
          expiresAt: session.expiresAt,
        })),
    );

    const allAttendance = teacher.classes.flatMap((klass) =>
      klass.sessions.flatMap((session) =>
        session.attendance.map((attendance) => ({
          markedAt: attendance.markedAt,
          status: attendance.status,
          subject: klass.subject.name,
        })),
      ),
    );
    const present = allAttendance.filter(
      (item) => item.status === "PRESENT" || item.status === "LATE",
    ).length;
    const overall = attendancePercent(present, allAttendance.length);

    const subjectBuckets = new Map<string, { total: number; present: number }>();
    for (const item of allAttendance) {
      const bucket = subjectBuckets.get(item.subject) ?? { total: 0, present: 0 };
      bucket.total += 1;
      if (item.status === "PRESENT" || item.status === "LATE") bucket.present += 1;
      subjectBuckets.set(item.subject, bucket);
    }

    const subjectBreakdown = [...subjectBuckets.entries()].map(([subject, stats]) => ({
      subject,
      percent: attendancePercent(stats.present, stats.total),
    }));

    const recentActivities = teacher.classes
      .flatMap((klass) =>
        klass.sessions.slice(0, 3).map(
          (session) =>
            `${klass.subject.name} ${session.mode} session ${session.status.toLowerCase()} with ${session.attendance.length} marked`,
        ),
      )
      .slice(0, 6);

    const approvedSeats = teacher.classes.reduce(
      (sum, klass) =>
        sum + klass.enrollments.filter((enrollment) => enrollment.status === "APPROVED").length,
      0,
    );

    return {
      profile: { name: teacher.user.fullName, email: teacher.user.email },
      metrics: {
        todaysClasses: teacher.classes.length,
        liveJoinCount: activeSessions.reduce((sum, session) => sum + session.joined, 0),
        absentStudents: Math.max(
          0,
          approvedSeats - activeSessions.reduce((sum, session) => sum + session.joined, 0),
        ),
        departmentAverage: formatPercent(overall),
      },
      activeSessions,
      recentActivities,
      lowAttendanceStudents: [],
      attendanceTrend: buildTrend(allAttendance),
      subjectBreakdown,
    };
  }

  async getCurrentDashboard() {
    const user = await requireRole(["STUDENT", "TEACHER", "ADMIN"]);
    if (user.role === "TEACHER") return this.getTeacherDashboard();
    return this.getStudentDashboard();
  }
}
