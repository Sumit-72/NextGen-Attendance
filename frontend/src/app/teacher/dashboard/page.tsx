"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { MetricCard } from "@/components/metric-card";
import { apiRequest } from "@/lib/api";

type TeacherDashboard = {
  profile: { name: string; email: string };
  metrics: {
    todaysClasses: number;
    liveJoinCount: number;
    absentStudents: number;
    departmentAverage: string;
  };
  activeSessions: Array<{
    id: string;
    subject: string;
    className: string;
    mode: string;
    joined: number;
    total: number;
    expiresAt: string;
  }>;
  recentActivities: string[];
};

export default function TeacherDashboardPage() {
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<TeacherDashboard>("/api/dashboard/teacher")
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <AuthGuard role="TEACHER">
      <AppShell role="Teacher">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Teacher Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold">
              {dashboard ? `Welcome back, ${dashboard.profile.name}` : "Loading dashboard…"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-(--muted)">
              Live metrics and session data are loaded from the backend API.
            </p>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Today's Classes"
              value={String(dashboard?.metrics.todaysClasses ?? "—")}
              detail="Classes assigned to you."
            />
            <MetricCard
              title="Live Sessions"
              value={String(dashboard?.activeSessions.length ?? "—")}
              detail="Active attendance sessions right now."
            />
            <MetricCard
              title="Students Joined"
              value={String(dashboard?.metrics.liveJoinCount ?? "—")}
              detail="Total check-ins across live sessions."
            />
            <MetricCard
              title="Dept. Average"
              value={dashboard?.metrics.departmentAverage ?? "—"}
              detail="Attendance average across your classes."
            />
          </div>

          {dashboard && dashboard.activeSessions.length > 0 ? (
            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Active Sessions</h2>
              <ul className="mt-4 grid gap-3">
                {dashboard.activeSessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                  >
                    <span>
                      {session.subject} · {session.className}
                    </span>
                    <span className="text-(--muted)">
                      {session.joined}/{session.total} joined · {session.mode}
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
