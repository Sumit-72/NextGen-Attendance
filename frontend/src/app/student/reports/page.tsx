"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { apiRequest } from "@/lib/api";

type SubjectSummary = {
  subject: string;
  total: number;
  present: number;
  percent: number;
};

type AttendanceRecord = {
  id: string;
  subject: string;
  className: string;
  teacher: string;
  date: string;
  status: string;
};

export default function StudentReportsPage() {
  const [summary, setSummary] = useState<SubjectSummary[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ summary: SubjectSummary[]; records: AttendanceRecord[] }>("/api/reports/student")
      .then((report) => {
        setSummary(report.summary);
        setRecords(report.records);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports"));
  }, []);

  return (
    <AuthGuard role="STUDENT">
      <AppShell role="Student">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Reports</p>
            <h1 className="mt-3 text-4xl font-semibold">Subject-wise attendance summary</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {summary.length === 0 ? (
              <p className="text-sm text-(--muted)">No attendance data yet.</p>
            ) : (
              summary.map((item) => (
                <article
                  key={item.subject}
                  className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]"
                >
                  <p className="text-sm text-(--muted)">{item.subject}</p>
                  <p className="mt-3 text-3xl font-semibold">{item.percent}%</p>
                  <p className="mt-2 text-sm text-(--muted)">
                    {item.present}/{item.total} sessions
                  </p>
                </article>
              ))
            )}
          </div>

          <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
            <h2 className="text-lg font-semibold">Attendance history</h2>
            {records.length === 0 ? (
              <p className="mt-4 text-sm text-(--muted)">No records found.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {records.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {record.subject} · {record.className}
                      </p>
                      <p className="text-(--muted)">
                        {record.date} · {record.teacher}
                      </p>
                    </div>
                    <span className="uppercase text-(--muted)">{record.status}</span>
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
