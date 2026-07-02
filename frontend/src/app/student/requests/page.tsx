"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { apiRequest } from "@/lib/api";
import type { EnrollmentItem } from "@/types/classes";
import type { CorrectionRequest, LeaveRequest } from "@/types/requests";

type AttendanceRecord = {
  id: string;
  subject: string;
  className: string;
  date: string;
  status: string;
};

export default function StudentRequestsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [leaveForm, setLeaveForm] = useState({
    fromDate: "",
    toDate: "",
    reason: "",
    classId: "",
  });
  const [correctionForm, setCorrectionForm] = useState({
    attendanceId: "",
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [enrollmentsRes, reportRes, leaveRes, correctionRes] = await Promise.all([
      apiRequest<{ enrollments: EnrollmentItem[] }>("/api/enrollments"),
      apiRequest<{ records: AttendanceRecord[] }>("/api/reports/student"),
      apiRequest<{ requests: LeaveRequest[] }>("/api/requests/leave"),
      apiRequest<{ requests: CorrectionRequest[] }>("/api/requests/corrections"),
    ]);

    setEnrollments(enrollmentsRes.enrollments.filter((item) => item.status === "APPROVED"));
    setAttendanceRecords(reportRes.records);
    setLeaveRequests(leaveRes.requests);
    setCorrectionRequests(correctionRes.requests);
  }, []);

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : "Failed to load requests"));
  }, [loadData]);

  async function submitLeave(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest("/api/requests/leave", {
        method: "POST",
        body: {
          fromDate: leaveForm.fromDate,
          toDate: leaveForm.toDate,
          reason: leaveForm.reason,
          classId: leaveForm.classId || undefined,
        },
      });
      setLeaveForm({ fromDate: "", toDate: "", reason: "", classId: "" });
      setMessage("Leave request submitted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCorrection(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest("/api/requests/corrections", {
        method: "POST",
        body: {
          attendanceId: correctionForm.attendanceId,
          reason: correctionForm.reason,
        },
      });
      setCorrectionForm({ attendanceId: "", reason: "" });
      setMessage("Correction request submitted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit correction request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard role="STUDENT">
      <AppShell role="Student">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Requests</p>
            <h1 className="mt-3 text-4xl font-semibold">Apply for leave or request attendance corrections</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-(--primary)">{message}</p> : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={submitLeave}
              className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]"
            >
              <h2 className="text-lg font-semibold">Apply for leave</h2>
              <div className="mt-4 grid gap-3">
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={leaveForm.classId}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, classId: event.target.value }))}
                >
                  <option value="">All classes (optional)</option>
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.class.id} value={enrollment.class.id}>
                      {enrollment.class.subject} · {enrollment.class.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={leaveForm.fromDate}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, fromDate: event.target.value }))}
                  required
                />
                <input
                  type="date"
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={leaveForm.toDate}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, toDate: event.target.value }))}
                  required
                />
                <textarea
                  className="min-h-24 rounded-xl border border-(--border) bg-white px-4 py-3"
                  placeholder="Reason for leave"
                  value={leaveForm.reason}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))}
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) disabled:opacity-60"
                >
                  Submit leave request
                </button>
              </div>
            </form>

            <form
              onSubmit={submitCorrection}
              className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]"
            >
              <h2 className="text-lg font-semibold">Request attendance correction</h2>
              <div className="mt-4 grid gap-3">
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={correctionForm.attendanceId}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({ ...current, attendanceId: event.target.value }))
                  }
                  required
                >
                  <option value="">Select attendance record</option>
                  {attendanceRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.subject} · {record.date} · {record.status}
                    </option>
                  ))}
                </select>
                <textarea
                  className="min-h-24 rounded-xl border border-(--border) bg-white px-4 py-3"
                  placeholder="Explain why this should be corrected"
                  value={correctionForm.reason}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  required
                />
                <button
                  type="submit"
                  disabled={submitting || attendanceRecords.length === 0}
                  className="rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) disabled:opacity-60"
                >
                  Submit correction request
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Leave history</h2>
              <ul className="mt-4 grid gap-3">
                {leaveRequests.length === 0 ? (
                  <li className="text-sm text-(--muted)">No leave requests yet.</li>
                ) : (
                  leaveRequests.map((request) => (
                    <li key={request.id} className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {new Date(request.fromDate).toLocaleDateString()} –{" "}
                          {new Date(request.toDate).toLocaleDateString()}
                        </span>
                        <span className="uppercase text-(--muted)">{request.status}</span>
                      </div>
                      <p className="mt-2 text-(--muted)">{request.reason}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Correction history</h2>
              <ul className="mt-4 grid gap-3">
                {correctionRequests.length === 0 ? (
                  <li className="text-sm text-(--muted)">No correction requests yet.</li>
                ) : (
                  correctionRequests.map((request) => (
                    <li key={request.id} className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {request.context?.subject} · {request.context?.currentStatus}
                        </span>
                        <span className="uppercase text-(--muted)">{request.status}</span>
                      </div>
                      <p className="mt-2 text-(--muted)">{request.reason}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
