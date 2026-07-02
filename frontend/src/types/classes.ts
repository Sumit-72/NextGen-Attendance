export type CatalogDepartment = {
  id: string;
  code: string;
  name: string;
  courses: Array<{ id: string; code: string; name: string; semesters: number }>;
  subjects: Array<{ id: string; code: string; name: string; credits: number; courseId: string | null }>;
};

export type TeacherClass = {
  id: string;
  code: string;
  name: string;
  semester: number;
  division: string;
  capacity: number;
  subject: { id: string; name: string; code: string };
  course: { id: string; name: string; code: string };
  department: { id: string; name: string; code: string };
  teacher: string;
  enrollmentCounts: {
    pending: number;
    approved: number;
    total: number;
  };
  sessionCount: number;
};

export type StudentClass = {
  id: string;
  code: string;
  name: string;
  semester: number;
  division: string;
  capacity: number;
  seatsUsed: number;
  subject: { id: string; name: string; code: string };
  course: { id: string; name: string; code: string };
  department: { id: string; name: string; code: string };
  teacher: string;
  enrollmentStatus: "PENDING" | "APPROVED" | "REJECTED" | "REMOVED" | null;
  isFull: boolean;
};

export type EnrollmentItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REMOVED";
  requestedAt: string;
  reviewedAt?: string | null;
  class: {
    id: string;
    code: string;
    name: string;
    subject: string;
    teacher?: string;
  };
  student?: {
    id: string;
    rollNumber: string;
    name: string;
    email: string;
  };
};

export type StudentProfile = {
  id: string;
  rollNumber: string;
  semester: number;
  division: string;
  course: {
    id: string;
    name: string;
    code: string;
    department: { id: string; name: string; code: string };
  };
};
