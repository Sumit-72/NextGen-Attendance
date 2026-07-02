"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrDisplay({ value, label = "Scan to mark attendance" }: { value: string; label?: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-(--border) bg-white p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--muted)">{label}</p>
      <div className="mt-4 flex justify-center">
        <QRCodeSVG value={value} size={200} level="M" includeMargin />
      </div>
      <p className="mt-4 break-all font-mono text-xs text-(--muted)">{value}</p>
    </div>
  );
}
