"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { apiRequest } from "@/lib/api";
import type { CatalogDepartment, EnrollmentItem, StudentClass, StudentProfile } from "@/types/classes";

type ProfileForm = {
  rollNumber: string;
  semester: string;
  division: string;
  courseId: string;
};

export default function StudentClassesPage() {
  const [catalog, setCatalog] = useState<CatalogDepartment[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    rollNumber: "",
    semester: "1",
    division: "A",
    courseId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const courses = useMemo(
    () => catalog.flatMap((department) => department.courses),
    [catalog],
  );

  const loadData = useCallback(async () => {
    const [catalogRes, profileRes, classesRes, enrollmentsRes] = await Promise.all([
      apiRequest<{ departments: CatalogDepartment[] }>("/api/catalog"),
      apiRequest<{ complete: boolean; student: StudentProfile | null }>("/api/profile"),
      apiRequest<{ classes: StudentClass[] }>("/api/classes"),
      apiRequest<{ enrollments: EnrollmentItem[] }>("/api/enrollments"),
    ]);

    setCatalog(catalogRes.departments);
    setProfile(profileRes.student);
    setClasses(classesRes.classes);
    setEnrollments(enrollmentsRes.enrollments);

    const firstCourse = catalogRes.departments[0]?.courses[0];
    if (firstCourse) {
      setProfileForm((current) => ({
        ...current,
        courseId: current.courseId || firstCourse.id,
      }));
    }
  }, []);

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : "Failed to load classes"));
  }, [loadData]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await apiRequest<{ student: StudentProfile }>("/api/profile/student", {
        method: "PUT",
        body: {
          rollNumber: profileForm.rollNumber,
          semester: Number(profileForm.semester),
          division: profileForm.division,
          courseId: profileForm.courseId,
        },
      });
      setProfile(result.student);
      setMessage("Student profile saved.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestEnrollment(classId: string) {
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/enrollments/classes/${classId}/request`, { method: "POST" });
      setMessage("Enrollment request submitted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request enrollment");
    }
  }

  return (
    <AuthGuard role="STUDENT">
      <AppShell role="Student">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">My Classes</p>
            <h1 className="mt-3 text-4xl font-semibold">Join classes and track enrollment status</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-(--primary)">{message}</p> : null}
          </div>

          {!profile ? (
            <form
              onSubmit={saveProfile}
              className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]"
            >
              <h2 className="text-lg font-semibold">Complete your student profile</h2>
              <p className="mt-2 text-sm text-(--muted)">
                You need a profile before requesting class enrollment.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  placeholder="Roll number"
                  value={profileForm.rollNumber}
                  onChange={(event) => setProfileForm((current) => ({ ...current, rollNumber: event.target.value }))}
                  required
                />
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={profileForm.courseId}
                  onChange={(event) => setProfileForm((current) => ({ ...current, courseId: event.target.value }))}
                  required
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  placeholder="Semester"
                  type="number"
                  min={1}
                  max={12}
                  value={profileForm.semester}
                  onChange={(event) => setProfileForm((current) => ({ ...current, semester: event.target.value }))}
                  required
                />
                <input
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  placeholder="Division"
                  value={profileForm.division}
                  onChange={(event) => setProfileForm((current) => ({ ...current, division: event.target.value }))}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-4 rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save profile"}
              </button>
            </form>
          ) : null}

          <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
            <h2 className="text-lg font-semibold">Available classes</h2>
            {classes.length === 0 ? (
              <p className="mt-4 text-sm text-(--muted)">No classes are available yet.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {classes.map((klass) => (
                  <li
                    key={klass.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {klass.subject.name} · {klass.name}
                      </p>
                      <p className="text-(--muted)">
                        {klass.code} · {klass.teacher} · {klass.seatsUsed}/{klass.capacity} seats
                      </p>
                    </div>
                    {klass.enrollmentStatus ? (
                      <span className="rounded-full border border-(--border) px-3 py-1 text-xs font-medium uppercase">
                        {klass.enrollmentStatus}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!profile || klass.isFull}
                        onClick={() => requestEnrollment(klass.id)}
                        className="rounded-full bg-(--primary) px-4 py-2 text-xs font-medium text-(--primary-foreground) disabled:opacity-50"
                      >
                        {klass.isFull ? "Full" : "Request join"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
            <h2 className="text-lg font-semibold">My enrollment requests</h2>
            {enrollments.length === 0 ? (
              <p className="mt-4 text-sm text-(--muted)">No enrollment activity yet.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {enrollments.map((enrollment) => (
                  <li
                    key={enrollment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{enrollment.class.name}</p>
                      <p className="text-(--muted)">
                        {enrollment.class.subject} · {enrollment.class.teacher}
                      </p>
                    </div>
                    <span className="rounded-full border border-(--border) px-3 py-1 text-xs font-medium uppercase">
                      {enrollment.status}
                    </span>
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
