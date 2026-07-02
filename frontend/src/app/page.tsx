import Link from "next/link";
import type { Route } from "next";

export default function EntryScreen() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center">
        <section className="grid w-full gap-8 rounded-4xl border border-(--border) bg-(--surface) p-8 shadow-[0_20px_80px_rgba(16,33,47,0.10)] backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">
              College Attendance Platform
            </p>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
                A modern portal for teachers and students.
              </h1>
              <p className="max-w-xl text-base leading-7 text-(--muted) md:text-lg">
                Secure attendance management, role-based access, and real-time analytics
                in a clean workspace designed for campus operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/home"
                className="inline-flex items-center rounded-full bg-(--primary) px-6 py-3 text-sm font-medium text-(--primary-foreground) transition hover:-translate-y-px"
              >
                Enter Portal
              </Link>
              <Link
                href={"/signup" as Route}
                className="inline-flex items-center rounded-full border border-(--border) bg-white/80 px-6 py-3 text-sm font-medium transition hover:-translate-y-px hover:bg-white"
              >
                Create Account
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_40px_rgba(16,33,47,0.08)]">
            <div className="flex h-full min-h-70 flex-col justify-between rounded-[1.4rem] bg-[linear-gradient(160deg,rgba(15,118,110,0.12),rgba(245,158,11,0.10))] p-6">
              <div>
                <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-(--primary)">
                  Attendance System
                </div>
                <h2 className="mt-6 text-2xl font-semibold">University branding area</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-(--muted)">
                  Add logo, college name, and campaign-specific messaging here.
                </p>
              </div>
              <div className="grid gap-3 text-sm text-(--muted)">
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4">Teacher portal</div>
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4">Student portal</div>
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4">Protected APIs</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}