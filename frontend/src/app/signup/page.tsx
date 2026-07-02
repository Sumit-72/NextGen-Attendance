"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/api";
import { isFirebaseConfigured, signUpWithEmail, buildDevIdToken } from "@/lib/firebase";
import type { CatalogDepartment } from "@/types/classes";

export default function SignUpPage() {
  const router = useRouter();
  const { signIn, refresh, user, loading } = useAuth();
  
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Student specific fields
  const [rollNumber, setRollNumber] = useState("");
  const [semester, setSemester] = useState("1");
  const [division, setDivision] = useState("A");
  const [courseId, setCourseId] = useState("");
  
  const [catalog, setCatalog] = useState<CatalogDepartment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firebaseReady = isFirebaseConfigured();
  const devAuthEnabled = process.env.NODE_ENV !== "production";

  // Fetch catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await apiRequest<{ departments: CatalogDepartment[] }>("/api/catalog");
        setCatalog(res.departments);
        const firstCourse = res.departments[0]?.courses[0];
        if (firstCourse) {
          setCourseId(firstCourse.id);
        }
      } catch (err) {
        console.error("Failed to load course catalog", err);
      }
    }
    loadCatalog();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "ADMIN") {
      router.replace("/admin/dashboard" as Route);
    } else if (user.role === "TEACHER") {
      router.replace("/teacher/dashboard" as Route);
    } else if (user.role === "STUDENT") {
      router.replace("/student/dashboard" as Route);
    }
  }, [user, loading, router]);

  const courses = catalog.flatMap((dept) => dept.courses);

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let idToken: string;

      if (firebaseReady) {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        idToken = await signUpWithEmail(email.trim(), password);
      } else if (devAuthEnabled) {
        idToken = buildDevIdToken(role, email.trim(), fullName.trim());
      } else {
        throw new Error("Authentication is not configured.");
      }

      // 1. Sign in (Exchange Session)
      await signIn(idToken, role);

      // 2. Complete Profile
      if (role === "STUDENT") {
        if (!rollNumber.trim()) throw new Error("Roll number is required.");
        if (!courseId) throw new Error("Course selection is required.");

        await apiRequest("/api/profile/student", {
          method: "POST",
          body: {
            rollNumber: rollNumber.trim(),
            semester: Number(semester),
            division: division.trim(),
            courseId,
          },
        });
      } else {
        await apiRequest("/api/profile/teacher", {
          method: "POST",
        });
      }

      // 3. Hydrate context and redirect
      await refresh();
      
      if (role === "STUDENT") {
        router.push("/student/dashboard" as Route);
      } else {
        router.push("/teacher/dashboard" as Route);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign up.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-lg">
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_16px_60px_rgba(16,33,47,0.10)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
            AttendEdge Portal
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Create an Account</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign up to get access to your attendance portal.
          </p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!firebaseReady && devAuthEnabled && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Firebase is not configured. Creating account via development flow.
            </p>
          )}

          <form onSubmit={handleSignUp} className="mt-6 grid gap-4">
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--surface-strong)] p-1 border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setRole("STUDENT")}
                className={`rounded-xl py-2 text-sm font-medium transition ${
                  role === "STUDENT"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                I'm a Student
              </button>
              <button
                type="button"
                onClick={() => setRole("TEACHER")}
                className={`rounded-xl py-2 text-sm font-medium transition ${
                  role === "TEACHER"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                I'm a Teacher
              </button>
            </div>

            {/* Common Fields */}
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide px-1">Full Name</label>
              <input
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 transition focus:border-[var(--primary)]"
                placeholder="John Doe"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide px-1">Email Address</label>
              <input
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 transition focus:border-[var(--primary)]"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {firebaseReady && (
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide px-1">Password</label>
                <input
                  className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 transition focus:border-[var(--primary)]"
                  placeholder="At least 6 characters"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Student Specific Fields */}
            {role === "STUDENT" && (
              <div className="mt-2 border-t border-[var(--border)] pt-4 grid gap-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Student Profile Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide px-1">Roll Number</label>
                    <input
                      className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 transition focus:border-[var(--primary)]"
                      placeholder="e.g. CS-2026-045"
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid gap-1">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide px-1">Course</label>
                    <select
                      className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 transition focus:border-[var(--primary)]"
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      required
                    >
                      {courses.length === 0 ? (
                        <option value="">Loading courses...</option>
                      ) : (
                        courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name} ({course.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide px-1">Semester</label>
                    <select
                      className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 transition focus:border-[var(--primary)]"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      required
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <option key={num} value={num}>
                          Semester {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide px-1">Division</label>
                    <input
                      className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 transition focus:border-[var(--primary)]"
                      placeholder="e.g. A"
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value.toUpperCase())}
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] transition hover:bg-[var(--primary-strong)] disabled:opacity-60 cursor-pointer text-center"
            >
              {submitting ? "Creating Account…" : "Register Account"}
            </button>
          </form>
        </section>

        <div className="mt-6 flex items-center justify-between text-sm text-[var(--muted)]">
          <Link href="/home" className="hover:underline">Back to home</Link>
          <div className="space-x-4">
            <Link href="/student/login" className="hover:underline">Student Sign In</Link>
            <Link href="/teacher/login" className="hover:underline">Teacher Sign In</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
