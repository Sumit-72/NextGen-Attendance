"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { apiRequest, downloadFile } from "@/lib/api";
import type { TeacherClass } from "@/types/classes";
import type { CorrectionRequest, LeaveRequest } from "@/types/requests";

export default function TeacherRequestsPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [exportClassId, setExportClassId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [classesRes, leaveRes, correctionRes] = await Promise.all([
      apiRequest<{ classes: TeacherClass[] }>("/api/classes"),
      apiRequest<{ requests: LeaveRequest[] }>("/api/requests/leave?status=PENDING"),
      apiRequest<{ requests: CorrectionRequest[] }>("/api/requests/corrections?status=PENDING"),
    ]);

    setClasses(classesRes.classes);
    setLeaveRequests(leaveRes.requests);
    setCorrectionRequests(correctionRes.requests);
    if (!exportClassId && classesRes.classes[0]) {
      setExportClassId(classesRes.classes[0].id);
    }
  }, [exportClassId]);

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : "Failed to load requests"));
  }, [loadData]);

  async function reviewLeave(requestId: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/requests/leave/${requestId}/review`, {
        method: "PATCH",
        body: { status },
      });
      setMessage(status === "APPROVED" ? "Leave approved." : "Leave rejected.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review leave");
    }
  }

  async function reviewCorrection(
    requestId: string,
    status: "APPROVED" | "REJECTED",
    requestedStatus: "PRESENT" | "EXCUSED" = "PRESENT",
  ) {
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/requests/corrections/${requestId}/review`, {
        method: "PATCH",
        body: { status, requestedStatus },
      });
      setMessage(status === "APPROVED" ? "Correction approved." : "Correction rejected.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review correction");
    }
  }

  async function exportReport() {
    if (!exportClassId) return;
    setError(null);

    try {
      const klass = classes.find((item) => item.id === exportClassId);
      await downloadFile(
        `/api/reports/teacher/${exportClassId}/export`,
        `${klass?.code ?? "class"}-attendance.csv`,
      );
      setMessage("Report exported.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export report");
    }
  }

  return (
    <AuthGuard role="TEACHER">
      <AppShell role="Teacher">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Review Queue</p>
            <h1 className="mt-3 text-4xl font-semibold">Approve leave and attendance correction requests</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-(--primary)">{message}</p> : null}
          </div>

          <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
            <h2 className="text-lg font-semibold">Export attendance report</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <select
                className="rounded-xl border border-(--border) bg-white px-4 py-3 text-sm"
                value={exportClassId}
                onChange={(event) => setExportClassId(event.target.value)}
              >
                {classes.map((klass) => (
                  <option key={klass.id} value={klass.id}>
                    {klass.subject.name} · {klass.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportReport}
                disabled={!exportClassId}
                className="rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) disabled:opacity-60"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Pending leave requests</h2>
              {leaveRequests.length === 0 ? (
                <p className="mt-4 text-sm text-(--muted)">No pending leave requests.</p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {leaveRequests.map((request) => (
                    <li key={request.id} className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm">
                      <p className="font-medium">{request.student?.name}</p>
                      <p className="text-(--muted)">
                        {new Date(request.fromDate).toLocaleDateString()} –{" "}
                        {new Date(request.toDate).toLocaleDateString()}
                      </p>
                      <p className="mt-2">{request.reason}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => reviewLeave(request.id, "APPROVED")}
                          className="rounded-full bg-(--primary) px-3 py-1.5 text-xs font-medium text-(--primary-foreground)"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewLeave(request.id, "REJECTED")}
                          className="rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Pending correction requests</h2>
              {correctionRequests.length === 0 ? (
                <p className="mt-4 text-sm text-(--muted)">No pending correction requests.</p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {correctionRequests.map((request) => (
                    <li key={request.id} className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm">
                      <p className="font-medium">{request.student?.name}</p>
                      <p className="text-(--muted)">
                        {request.context?.subject} · {request.context?.currentStatus}
                      </p>
                      <p className="mt-2">{request.reason}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => reviewCorrection(request.id, "APPROVED", "PRESENT")}
                          className="rounded-full bg-(--primary) px-3 py-1.5 text-xs font-medium text-(--primary-foreground)"
                        >
                          Approve as Present
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewCorrection(request.id, "APPROVED", "EXCUSED")}
                          className="rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium"
                        >
                          Approve as Excused
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewCorrection(request.id, "REJECTED")}
                          className="rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
