"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { MetricCard } from "@/components/metric-card";
import { apiRequest } from "@/lib/api";

type StudentDashboard = {
  profile: { name: string; email: string; rollNumber?: string };
  metrics: {
    todayStatus: string;
    overallAttendance: string;
    geoStatus: string;
    lowAlerts: number;
  };
  joinedClasses: Array<{
    id: string;
    name: string;
    code: string;
    subject: string;
    teacher: string;
  }>;
  activeSessions: Array<{
    id: string;
    subject: string;
    className: string;
    mode: string;
    expiresAt: string;
    joined: number;
  }>;
};

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<StudentDashboard>("/api/dashboard/student")
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <AuthGuard role="STUDENT">
      <AppShell role="Student">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Student Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold">
              {dashboard ? `Welcome, ${dashboard.profile.name}` : "Loading dashboard…"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-(--muted)">
              Your attendance summary and enrolled classes are loaded from the backend.
            </p>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Overall Attendance"
              value={dashboard?.metrics.overallAttendance ?? "—"}
              detail="Across all enrolled subjects."
            />
            <MetricCard
              title="Today's Status"
              value={dashboard?.metrics.todayStatus ?? "—"}
              detail="Your attendance status for today."
            />
            <MetricCard
              title="Active Classes"
              value={String(dashboard?.joinedClasses.length ?? "—")}
              detail="Approved class enrollments."
            />
            <MetricCard
              title="Low Alerts"
              value={String(dashboard?.metrics.lowAlerts ?? "—")}
              detail="Subjects below 75% attendance."
            />
          </div>

          {dashboard && dashboard.joinedClasses.length > 0 ? (
            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">My Classes</h2>
              <ul className="mt-4 grid gap-3">
                {dashboard.joinedClasses.map((klass) => (
                  <li
                    key={klass.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                  >
                    <span>
                      {klass.subject} · {klass.name}
                    </span>
                    <span className="text-(--muted)">
                      {klass.code} · {klass.teacher}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </AppShell>
    </AuthGuard>
  );
}
