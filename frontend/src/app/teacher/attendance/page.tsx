"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { QrDisplay } from "@/components/qr-display";
import { apiRequest } from "@/lib/api";
import { getGeoPayload } from "@/lib/geo";
import {
  getAttendanceSocket,
  joinSessionRoom,
  leaveSessionRoom,
} from "@/lib/socket";
import type { TeacherClass } from "@/types/classes";
import type { AttendanceSession, SessionCredentials, StartSessionResult } from "@/types/attendance";

type StartForm = {
  classId: string;
  mode: "OTP" | "QR" | "GEO";
  durationMinutes: string;
  allowedRadiusMeters: string;
};

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [credentials, setCredentials] = useState<SessionCredentials | null>(null);
  const [form, setForm] = useState<StartForm>({
    classId: "",
    mode: "OTP",
    durationMinutes: "10",
    allowedRadiusMeters: "100",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [classesRes, sessionsRes] = await Promise.all([
      apiRequest<{ classes: TeacherClass[] }>("/api/classes"),
      apiRequest<{ sessions: AttendanceSession[] }>("/api/attendance/sessions?activeOnly=true"),
    ]);

    setClasses(classesRes.classes);
    setSessions(sessionsRes.sessions);

    const current = sessionsRes.sessions[0] ?? null;
    setActiveSession(current);

    if (current) {
      const detail = await apiRequest<{ session: AttendanceSession }>(
        `/api/attendance/sessions/${current.id}`,
      );
      setActiveSession(detail.session);
    }
  }, []);

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : "Failed to load attendance"));
  }, [loadData]);

  useEffect(() => {
    if (!activeSession) return;

    joinSessionRoom(activeSession.id);
    const socket = getAttendanceSocket();

    function handleMarked() {
      void loadData();
    }

    socket?.on("attendance:marked", handleMarked);
    socket?.on("session:closed", () => void loadData());

    return () => {
      socket?.off("attendance:marked", handleMarked);
      leaveSessionRoom(activeSession.id);
    };
  }, [activeSession, loadData]);

  async function startSession(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const geo = await getGeoPayload();
      const result = await apiRequest<StartSessionResult>("/api/attendance/sessions", {
        method: "POST",
        body: {
          classId: form.classId,
          mode: form.mode,
          durationMinutes: Number(form.durationMinutes),
          allowedRadiusMeters: Number(form.allowedRadiusMeters),
          centerLatitude: geo.latitude,
          centerLongitude: geo.longitude,
          minGpsAccuracyMeters: Math.max(30, Math.round(geo.accuracy)),
        },
      });

      setActiveSession(result.session);
      setCredentials(result.credentials);
      setMessage("Attendance session started.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setSubmitting(false);
    }
  }

  async function regenerateOtp() {
    if (!activeSession) return;
    setError(null);

    try {
      const result = await apiRequest<{ otp: string }>(
        `/api/attendance/sessions/${activeSession.id}/regenerate-otp`,
        { method: "POST" },
      );
      setCredentials((current) => ({ ...current, otp: result.otp }));
      setMessage("OTP regenerated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate OTP");
    }
  }

  async function closeSession() {
    if (!activeSession) return;
    setError(null);

    try {
      await apiRequest(`/api/attendance/sessions/${activeSession.id}/close`, { method: "POST" });
      setActiveSession(null);
      setCredentials(null);
      setMessage("Session closed.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close session");
    }
  }

  return (
    <AuthGuard role="TEACHER">
      <AppShell role="Teacher">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Live Attendance</p>
            <h1 className="mt-3 text-4xl font-semibold">Start sessions with OTP, QR, or geofencing</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-(--primary)">{message}</p> : null}
          </div>

          {!activeSession ? (
            <form
              onSubmit={startSession}
              className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]"
            >
              <h2 className="text-lg font-semibold">Start a session</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={form.classId}
                  onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}
                  required
                >
                  <option value="">Select class</option>
                  {classes.map((klass) => (
                    <option key={klass.id} value={klass.id}>
                      {klass.subject.name} · {klass.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  value={form.mode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mode: event.target.value as StartForm["mode"],
                    }))
                  }
                >
                  <option value="OTP">OTP + Geofence</option>
                  <option value="QR">QR + Geofence</option>
                  <option value="GEO">Geofence only</option>
                </select>
                <input
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  type="number"
                  min={1}
                  max={120}
                  value={form.durationMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                  placeholder="Duration (minutes)"
                  required
                />
                <input
                  className="rounded-xl border border-(--border) bg-white px-4 py-3"
                  type="number"
                  min={10}
                  max={1000}
                  value={form.allowedRadiusMeters}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, allowedRadiusMeters: event.target.value }))
                  }
                  placeholder="Allowed radius (meters)"
                  required
                />
              </div>
              <p className="mt-3 text-sm text-(--muted)">
                Your current location will be used as the geofence center when starting the session.
              </p>
              <button
                type="submit"
                disabled={submitting || classes.length === 0}
                className="mt-4 rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) disabled:opacity-60"
              >
                {submitting ? "Starting…" : "Start session"}
              </button>
            </form>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
                <h2 className="text-lg font-semibold">Active session</h2>
                <p className="mt-2 text-sm text-(--muted)">
                  {activeSession.class?.subject} · {activeSession.class?.name}
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <p>
                    <span className="text-(--muted)">Mode:</span> {activeSession.mode}
                  </p>
                  <p>
                    <span className="text-(--muted)">Joined:</span> {activeSession.joinedCount}/
                    {activeSession.totalStudents}
                  </p>
                  <p>
                    <span className="text-(--muted)">Expires:</span>{" "}
                    {new Date(activeSession.expiresAt).toLocaleTimeString()}
                  </p>
                </div>

                {credentials?.otp ? (
                  <div className="mt-6 rounded-2xl border border-(--border) bg-[linear-gradient(160deg,rgba(15,118,110,0.08),rgba(245,158,11,0.08))] p-6 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--muted)">OTP Code</p>
                    <p className="mt-3 text-5xl font-semibold tracking-[0.3em]">{credentials.otp}</p>
                    <button
                      type="button"
                      onClick={regenerateOtp}
                      className="mt-4 rounded-full border border-(--border) px-4 py-2 text-xs font-medium"
                    >
                      Regenerate OTP
                    </button>
                  </div>
                ) : null}

                {credentials?.qrPayload ? <QrDisplay value={credentials.qrPayload} /> : null}

                <button
                  type="button"
                  onClick={closeSession}
                  className="mt-6 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700"
                >
                  Close session
                </button>
              </div>

              <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
                <h2 className="text-lg font-semibold">Live check-ins</h2>
                {activeSession.attendance && activeSession.attendance.length > 0 ? (
                  <ul className="mt-4 grid gap-3">
                    {activeSession.attendance.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                      >
                        <span>
                          {item.student.name} · {item.student.rollNumber}
                        </span>
                        <span className="text-(--muted)">{item.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-(--muted)">Waiting for students to mark attendance…</p>
                )}
              </div>
            </div>
          )}

          {sessions.length > 0 && !activeSession ? (
            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              <h2 className="text-lg font-semibold">Recent active sessions</h2>
              <ul className="mt-4 grid gap-3">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                  >
                    {session.class?.subject} · {session.class?.name} · {session.joinedCount} joined
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
