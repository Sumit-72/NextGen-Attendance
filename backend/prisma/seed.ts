import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Department
  const department = await prisma.department.upsert({
    where: { code: "CSE" },
    update: {},
    create: { code: "CSE", name: "Computer Science & Engineering" },
  });

  // 2. Seed Course
  const course = await prisma.course.upsert({
    where: { code: "BTECH-CSE" },
    update: {},
    create: {
      code: "BTECH-CSE",
      name: "B.Tech Computer Science",
      semesters: 8,
      departmentId: department.id,
    },
  });

  // 3. Seed Subjects
  const subjectsData = [
    { code: "CS101", name: "Data Structures", credits: 4 },
    { code: "CS102", name: "Database Systems", credits: 3 },
    { code: "CS103", name: "Computer Networks", credits: 3 },
  ];

  for (const sub of subjectsData) {
    await prisma.subject.upsert({
      where: { code: sub.code },
      update: {},
      create: {
        code: sub.code,
        name: sub.name,
        credits: sub.credits,
        departmentId: department.id,
        courseId: course.id,
      },
    });
  }

  // 4. Seed Sample Teachers
  const teachers = [
    {
      email: "teacher1@example.com",
      fullName: "Dr. Sarah Connor",
      firebaseUid: "dev-teacher-1",
      employeeId: "T-SARAH1",
    },
    {
      email: "teacher2@example.com",
      fullName: "Dr. John Doe",
      firebaseUid: "dev-teacher-2",
      employeeId: "T-JOHNDOE",
    },
  ];

  for (const t of teachers) {
    const user = await prisma.user.upsert({
      where: { firebaseUid: t.firebaseUid },
      update: {
        email: t.email,
        fullName: t.fullName,
        role: "TEACHER",
        status: "ACTIVE",
      },
      create: {
        firebaseUid: t.firebaseUid,
        email: t.email,
        fullName: t.fullName,
        displayName: t.fullName,
        role: "TEACHER",
        status: "ACTIVE",
        profileComplete: true,
      },
    });

    await prisma.teacher.upsert({
      where: { userId: user.id },
      update: { employeeId: t.employeeId },
      create: {
        userId: user.id,
        employeeId: t.employeeId,
      },
    });
  }

  // 5. Seed Sample Students
  const students = [
    {
      email: "student1@example.com",
      fullName: "Alice Smith",
      firebaseUid: "dev-student-1",
      rollNumber: "CS-2026-001",
      semester: 1,
      division: "A",
    },
    {
      email: "student2@example.com",
      fullName: "Bob Johnson",
      firebaseUid: "dev-student-2",
      rollNumber: "CS-2026-002",
      semester: 1,
      division: "A",
    },
    {
      email: "student3@example.com",
      fullName: "Charlie Brown",
      firebaseUid: "dev-student-3",
      rollNumber: "CS-2026-003",
      semester: 3,
      division: "B",
    },
  ];

  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { firebaseUid: s.firebaseUid },
      update: {
        email: s.email,
        fullName: s.fullName,
        role: "STUDENT",
        status: "ACTIVE",
      },
      create: {
        firebaseUid: s.firebaseUid,
        email: s.email,
        fullName: s.fullName,
        displayName: s.fullName,
        role: "STUDENT",
        status: "ACTIVE",
        profileComplete: true,
      },
    });

    await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        rollNumber: s.rollNumber,
        semester: s.semester,
        division: s.division,
        courseId: course.id,
      },
      create: {
        userId: user.id,
        rollNumber: s.rollNumber,
        semester: s.semester,
        division: s.division,
        courseId: course.id,
      },
    });
  }

  console.log("Seeded default department, course, subjects, sample teachers, and sample students.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
