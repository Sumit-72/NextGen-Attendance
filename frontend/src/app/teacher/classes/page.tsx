"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { apiRequest } from "@/lib/api";
import type { CatalogDepartment, EnrollmentItem, TeacherClass } from "@/types/classes";

type CreateClassForm = {
  name: string;
  departmentId: string;
  courseId: string;
  subjectId: string;
  semester: string;
  division: string;
  capacity: string;
};

const emptyForm: CreateClassForm = {
  name: "",
  departmentId: "",
  courseId: "",
  subjectId: "",
  semester: "1",
  division: "A",
  capacity: "120",
};

export default function TeacherClassesPage() {
  const [catalog, setCatalog] = useState<CatalogDepartment[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<EnrollmentItem[]>([]);
  const [form, setForm] = useState<CreateClassForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedDepartment = useMemo(
    () => catalog.find((item) => item.id === form.departmentId) ?? null,
    [catalog, form.departmentId],
  );

  const loadData = useCallback(async () => {
    const [catalogRes, classesRes, enrollmentsRes] = await Promise.all([
      apiRequest<{ departments: CatalogDepartment[] }>("/api/catalog"),
      apiRequest<{ classes: TeacherClass[] }>("/api/classes"),
      apiRequest<{ enrollments: EnrollmentItem[] }>("/api/enrollments?status=PENDING"),
    ]);

    setCatalog(catalogRes.departments);
    setClasses(classesRes.classes);
    setPendingEnrollments(enrollmentsRes.enrollments);

    const firstDepartment = catalogRes.departments[0];
    if (firstDepartment && !form.departmentId) {
      const firstCourse = firstDepartment.courses[0];
      const firstSubject = firstDepartment.subjects[0];
      setForm((current) => ({
        ...current,
        departmentId: firstDepartment.id,
        courseId: firstCourse?.id ?? "",
        subjectId: firstSubject?.id ?? "",
      }));
    }
  }, [form.departmentId]);

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : "Failed to load classes"));
  }, [loadData]);

  async function handleCreateClass(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest("/api/profile/teacher", { method: "POST" });
      await apiRequest("/api/classes", {
        method: "POST",
        body: {
          name: form.name,
          departmentId: form.departmentId,
          courseId: form.courseId,
          subjectId: form.subjectId,
          semester: Number(form.semester),
          division: form.division,
          capacity: Number(form.capacity),
        },
      });
      setForm((current) => ({ ...emptyForm, departmentId: current.departmentId, courseId: current.courseId, subjectId: current.subjectId }));
      setMessage("Class created successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewEnrollment(enrollmentId: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/enrollments/${enrollmentId}/review`, {
        method: "PATCH",
        body: { status },
      });
      setMessage(status === "APPROVED" ? "Enrollment approved." : "Enrollment rejected.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review enrollment");
    }
  }

  return (
    <AuthGuard role="TEACHER">
      <AppShell role="Teacher">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Class Management</p>
            <h1 className="mt-3 text-4xl font-semibold">Create classes and review enrollment requests</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-(--primary)">{message}</p> : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <form
              onSubmit={handleCreateClass}
              className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]"
            >
              <h2 className="text-lg font-semibold">Create a class</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  placeholder="Class name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={form.departmentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                      courseId: "",
                      subjectId: "",
                    }))
                  }
                  required
                >
                  <option value="">Select department</option>
                  {catalog.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={form.courseId}
                  onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value }))}
                  required
                >
                  <option value="">Select course</option>
                  {selectedDepartment?.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={form.subjectId}
                  onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
                  required
                >
                  <option value="">Select subject</option>
                  {selectedDepartment?.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    className="rounded-xl border border-(--border) bg-white px-4 py-3"
                    placeholder="Semester"
                    type="number"
                    min={1}
                    max={12}
                    value={form.semester}
                    onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))}
                    required
                  />
                  <input
                    className="rounded-xl border border-(--border) bg-white px-4 py-3"
                    placeholder="Division"
                    value={form.division}
                    onChange={(event) => setForm((current) => ({ ...current, division: event.target.value }))}
                    required
                  />
                  <input
                    className="rounded-xl border border-(--border) bg-white px-4 py-3"
                    placeholder="Capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) disabled:opacity-60"
                >
                  {submitting ? "Creating…" : "Create class"}
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Pending enrollments</h2>
              {pendingEnrollments.length === 0 ? (
                <p className="mt-4 text-sm text-(--muted)">No pending enrollment requests.</p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {pendingEnrollments.map((enrollment) => (
                    <li
                      key={enrollment.id}
                      className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{enrollment.student?.name}</p>
                          <p className="text-(--muted)">
                            {enrollment.student?.rollNumber} · {enrollment.class.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => reviewEnrollment(enrollment.id, "APPROVED")}
                            className="rounded-full bg-(--primary) px-3 py-1.5 text-xs font-medium text-(--primary-foreground)"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => reviewEnrollment(enrollment.id, "REJECTED")}
                            className="rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
            <h2 className="text-lg font-semibold">Your classes</h2>
            {classes.length === 0 ? (
              <p className="mt-4 text-sm text-(--muted)">No classes created yet.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {classes.map((klass) => (
                  <li
                    key={klass.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {klass.subject.name} · {klass.name}
                      </p>
                      <p className="text-(--muted)">
                        {klass.code} · Sem {klass.semester}-{klass.division}
                      </p>
                    </div>
                    <div className="text-(--muted)">
                      {klass.enrollmentCounts.approved}/{klass.capacity} enrolled · {klass.enrollmentCounts.pending} pending
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
