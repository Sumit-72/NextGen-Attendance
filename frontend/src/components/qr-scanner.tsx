"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";

export function QrScanner({
  active,
  onScan,
}: {
  active: boolean;
  onScan: (value: string) => void;
}) {
  const elementId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => onScan(decoded),
        () => undefined,
      )
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to start camera");
      });

    return () => {
      const current = scannerRef.current;
      scannerRef.current = null;
      if (!current) return;

      current
        .stop()
        .catch(() => undefined)
        .finally(() => current.clear());
    };
  }, [active, elementId, onScan]);

  if (!active) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div id={elementId} className="overflow-hidden rounded-2xl border border-(--border) bg-black/5" />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function parseQrAttendancePayload(payload: string) {
  const separator = payload.indexOf(":");
  if (separator === -1) {
    return { sessionId: null, token: payload.trim() };
  }

  return {
    sessionId: payload.slice(0, separator).trim(),
    token: payload.slice(separator + 1).trim(),
  };
}
