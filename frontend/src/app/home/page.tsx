import Link from "next/link";
import type { Route } from "next";

const features = [
  "Firebase Authentication with backend role checks",
  "Real-time dashboards and attendance analytics",
  "Secure APIs with validation and audit logging",
  "Geo-fenced, OTP, and QR-based attendance capture",
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 md:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(15,23,32,0.05)]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--primary)]">AttendEdge</p>
          <h1 className="text-lg font-semibold">Public landing page</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <Link href="/teacher/login" className="font-medium text-[var(--foreground)]">
            Teacher Login
          </Link>
          <Link href="/student/login" className="font-medium text-[var(--foreground)]">
            Student Login
          </Link>
          <Link href={"/signup" as Route} className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-strong)]">
            Sign Up
          </Link>
        </nav>
      </header>

      <section className="grid gap-8 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Home</p>
          <h2 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Attendance workflows built for colleges that need clarity and control.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
            The public site introduces the platform, while the authenticated portals remain
            separated by role and verified by the backend.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={"/signup" as Route}
              className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition hover:bg-[var(--primary-strong)]"
            >
              Sign Up / Apply
            </Link>
            <Link
              href="/teacher/login"
              className="rounded-full border border-[var(--border)] bg-white/80 px-5 py-3 text-sm font-medium transition hover:border-[var(--primary)]/30 hover:bg-white"
            >
              Teacher Login
            </Link>
            <Link
              href="/student/login"
              className="rounded-full border border-[var(--border)] bg-white/80 px-5 py-3 text-sm font-medium transition hover:border-[var(--primary)]/30 hover:bg-white"
            >
              Student Login
            </Link>
          </div>
        </div>

        <div className="grid gap-4 rounded-4xl border border-[var(--border)] bg-white/80 p-6 shadow-[0_16px_60px_rgba(16,33,47,0.08)]">
          {features.map((item) => (
            <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="grid gap-4 pb-16 md:grid-cols-2">
        {[
          ["How Attendance Works", "Teacher starts a session, students authenticate, and the backend verifies the record."],
          ["Security Features", "Firebase tokens, role validation, server-side authorization, and audit logging."],
          ["Analytics", "Dashboards and reports will consume backend APIs rather than local sample data."],
          ["Benefits", "Separated portals reduce confusion and keep role-specific workflows focused."],
        ].map(([title, detail]) => (
          <article key={title} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{detail}</p>
          </article>
        ))}
      </section>

      <footer id="contact" className="border-t border-[var(--border)] py-8 text-sm text-[var(--muted)]">
        Attendance System landing page scaffold.
      </footer>
    </main>
  );
}