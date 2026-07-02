"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { QrScanner, parseQrAttendancePayload } from "@/components/qr-scanner";
import { apiRequest } from "@/lib/api";
import { getDeviceFingerprint, getGeoPayload } from "@/lib/geo";
import { getAttendanceSocket, joinClassRoom, joinSessionRoom } from "@/lib/socket";
import type { AttendanceSession } from "@/types/attendance";

export default function StudentAttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [otp, setOtp] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSessions = useCallback(async () => {
    const result = await apiRequest<{ sessions: AttendanceSession[] }>(
      "/api/attendance/sessions?activeOnly=true",
    );
    setSessions(result.sessions);
    if (!selectedSessionId && result.sessions[0]) {
      setSelectedSessionId(result.sessions[0].id);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    loadSessions().catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions"));
  }, [loadSessions]);

  useEffect(() => {
    const socket = getAttendanceSocket();

    function refresh() {
      void loadSessions();
    }

    socket?.on("session:started", refresh);
    socket?.on("session:closed", refresh);
    socket?.on("attendance:marked", refresh);

    for (const session of sessions) {
      joinSessionRoom(session.id);
      joinClassRoom(session.classId);
    }

    return () => {
      socket?.off("session:started", refresh);
      socket?.off("session:closed", refresh);
      socket?.off("attendance:marked", refresh);
    };
  }, [sessions, loadSessions]);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;

  const handleQrScan = useCallback(
    (value: string) => {
      const parsed = parseQrAttendancePayload(value);
      if (parsed.sessionId && sessions.some((session) => session.id === parsed.sessionId)) {
        setSelectedSessionId(parsed.sessionId);
      }
      setQrToken(value);
      setMessage("QR scanned. Review and submit to mark attendance.");
      setScanning(false);
    },
    [sessions],
  );

  async function markAttendance(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSession) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const geo = await getGeoPayload();
      const parsed = parseQrAttendancePayload(qrToken);

      if (selectedSession.mode === "QR" && parsed.sessionId && parsed.sessionId !== selectedSession.id) {
        throw new Error("Scanned QR belongs to a different session");
      }

      const result = await apiRequest<{
        attendance: { status: string; isLate: boolean; distanceMeters: number | null };
      }>("/api/attendance/mark", {
        method: "POST",
        body: {
          sessionId: selectedSession.id,
          otp: selectedSession.mode === "OTP" ? otp : undefined,
          qrToken: selectedSession.mode === "QR" ? parsed.token : undefined,
          latitude: geo.latitude,
          longitude: geo.longitude,
          accuracy: geo.accuracy,
          deviceFingerprint: getDeviceFingerprint(),
        },
      });

      setMessage(
        `Attendance marked as ${result.attendance.status}${result.attendance.isLate ? " (late)" : ""}.`,
      );
      setOtp("");
      setQrToken("");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark attendance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard role="STUDENT">
      <AppShell role="Student">
        <section className="grid gap-6">
          <div className="rounded-4xl border border-(--border) bg-white/85 p-8 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">Mark Attendance</p>
            <h1 className="mt-3 text-4xl font-semibold">Verify with OTP or QR inside the geofenced area</h1>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-(--primary)">{message}</p> : null}
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-3xl border border-(--border) bg-white/85 p-6 text-sm text-(--muted) shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
              No active attendance sessions right now. You will be notified when a teacher starts one.
            </div>
          ) : (
            <form
              onSubmit={markAttendance}
              className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]"
            >
              <h2 className="text-lg font-semibold">Active session</h2>
              <select
                className="mt-4 w-full rounded-xl border border-(--border) bg-white px-4 py-3"
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.class?.subject} · {session.class?.name} ({session.mode})
                  </option>
                ))}
              </select>

              {selectedSession?.myAttendance ? (
                <div className="mt-4 rounded-2xl border border-(--border) bg-[linear-gradient(160deg,rgba(15,118,110,0.08),rgba(245,158,11,0.06))] px-4 py-3 text-sm">
                  Already marked: <strong>{selectedSession.myAttendance.status}</strong> at{" "}
                  {new Date(selectedSession.myAttendance.markedAt).toLocaleTimeString()}
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {selectedSession?.mode === "OTP" ? (
                    <input
                      className="rounded-xl border border-(--border) bg-white px-4 py-3"
                      placeholder="Enter OTP from teacher"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      required
                    />
                  ) : null}
                  {selectedSession?.mode === "QR" ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setScanning((current) => !current)}
                          className="rounded-full border border-(--border) px-4 py-2 text-xs font-medium"
                        >
                          {scanning ? "Stop camera" : "Scan QR with camera"}
                        </button>
                      </div>
                      <QrScanner active={scanning} onScan={handleQrScan} />
                      <input
                        className="rounded-xl border border-(--border) bg-white px-4 py-3"
                        placeholder="Or paste QR payload (sessionId:token)"
                        value={qrToken}
                        onChange={(event) => setQrToken(event.target.value)}
                        required
                      />
                    </>
                  ) : null}
                  <p className="text-sm text-(--muted)">
                    Your location will be verified within {selectedSession?.allowedRadiusMeters}m of the classroom
                    center. Allow location access when prompted.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Mark attendance"}
                  </button>
                </div>
              )}
            </form>
          )}

          <div className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
            <h2 className="text-lg font-semibold">Open sessions</h2>
            <ul className="mt-4 grid gap-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {session.class?.subject} · {session.class?.name}
                    </p>
                    <p className="text-(--muted)">
                      {session.mode} · expires {new Date(session.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-(--muted)">
                    {session.myAttendance ? session.myAttendance.status : "Not marked"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
