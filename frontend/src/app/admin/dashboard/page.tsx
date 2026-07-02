"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AdminShell } from "@/components/admin-shell";
import { MetricCard } from "@/components/metric-card";
import { apiRequest } from "@/lib/api";

type Overview = {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    teachers: number;
    students: number;
    classes: number;
    activeSessions: number;
    pendingEnrollments: number;
    pendingLeave: number;
    pendingCorrections: number;
    attendanceToday: number;
  };
  recentAuditLogs: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    actor: string;
    createdAt: string;
  }>;
};

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  department: string | null;
  employeeId: string | null;
  rollNumber: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [overviewRes, usersRes] = await Promise.all([
      apiRequest<Overview>("/api/admin/overview"),
      apiRequest<{ users: AdminUser[] }>("/api/admin/users"),
    ]);
    setOverview(overviewRes);
    setUsers(usersRes.users);
  }, []);

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : "Failed to load admin data"));
  }, [loadData]);

  async function updateUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status },
      });
      setMessage(`User status updated to ${status.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  return (
    <AdminAuthGuard>
      <AdminShell>
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Admin Console</p>
            <h1 className="mt-3 text-4xl font-semibold">Platform overview and user management</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-(--primary)">{message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Total Users" value={String(overview?.metrics.totalUsers ?? "—")} detail="All registered accounts." />
            <MetricCard title="Active Users" value={String(overview?.metrics.activeUsers ?? "—")} detail="Currently active accounts." />
            <MetricCard title="Live Sessions" value={String(overview?.metrics.activeSessions ?? "—")} detail="Attendance sessions in progress." />
            <MetricCard title="Today's Check-ins" value={String(overview?.metrics.attendanceToday ?? "—")} detail="Attendance marked today." />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard title="Teachers" value={String(overview?.metrics.teachers ?? "—")} detail="Faculty profiles." />
            <MetricCard title="Students" value={String(overview?.metrics.students ?? "—")} detail="Student profiles." />
            <MetricCard title="Classes" value={String(overview?.metrics.classes ?? "—")} detail="Classes across departments." />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Pending actions</h2>
              <ul className="mt-4 grid gap-2 text-sm">
                <li>Enrollment requests: {overview?.metrics.pendingEnrollments ?? 0}</li>
                <li>Leave requests: {overview?.metrics.pendingLeave ?? 0}</li>
                <li>Correction requests: {overview?.metrics.pendingCorrections ?? 0}</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Recent audit activity</h2>
              <ul className="mt-4 grid gap-3">
                {(overview?.recentAuditLogs ?? []).length === 0 ? (
                  <li className="text-sm text-(--muted)">No audit logs yet.</li>
                ) : (
                  overview?.recentAuditLogs.map((log) => (
                    <li key={log.id} className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm">
                      <p className="font-medium">{log.action}</p>
                      <p className="text-(--muted)">
                        {log.actor} · {log.entity} · {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div id="users" className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
            <h2 className="text-lg font-semibold">Users</h2>
            <ul className="mt-4 grid gap-3">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {user.fullName} · {user.role}
                    </p>
                    <p className="text-(--muted)">
                      {user.email}
                      {user.rollNumber ? ` · ${user.rollNumber}` : ""}
                      {user.employeeId ? ` · ${user.employeeId}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="uppercase text-(--muted)">{user.status}</span>
                    {user.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() => updateUserStatus(user.id, "SUSPENDED")}
                        className="rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateUserStatus(user.id, "ACTIVE")}
                        className="rounded-full bg-(--primary) px-3 py-1.5 text-xs font-medium text-(--primary-foreground)"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </AdminShell>
    </AdminAuthGuard>
  );
}
