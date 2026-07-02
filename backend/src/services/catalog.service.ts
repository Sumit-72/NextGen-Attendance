import { getPrisma } from "../prisma";

const DEFAULT_CATALOG = {
  department: { code: "CSE", name: "Computer Science & Engineering" },
  course: { code: "BTECH-CSE", name: "B.Tech Computer Science", semesters: 8 },
  subjects: [
    { code: "CS101", name: "Data Structures", credits: 4 },
    { code: "CS102", name: "Database Systems", credits: 3 },
    { code: "CS103", name: "Computer Networks", credits: 3 },
  ],
};

export class CatalogService {
  private readonly db = getPrisma();

  async ensureDefaultCatalog() {
    const departmentCount = await this.db.department.count();
    if (departmentCount > 0) {
      return;
    }

    const department = await this.db.department.create({
      data: DEFAULT_CATALOG.department,
    });

    const course = await this.db.course.create({
      data: {
        ...DEFAULT_CATALOG.course,
        departmentId: department.id,
      },
    });

    await this.db.subject.createMany({
      data: DEFAULT_CATALOG.subjects.map((subject) => ({
        ...subject,
        departmentId: department.id,
        courseId: course.id,
      })),
    });
  }

  async getCatalog() {
    await this.ensureDefaultCatalog();

    const departments = await this.db.department.findMany({
      orderBy: { name: "asc" },
      include: {
        courses: { orderBy: { name: "asc" } },
        subjects: { orderBy: { name: "asc" } },
      },
    });

    return { departments };
  }
}
