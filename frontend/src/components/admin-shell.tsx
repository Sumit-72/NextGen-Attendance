"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

const links = [
  ["Dashboard", "/admin/dashboard"],
  ["Users", "/admin/dashboard#users"],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/admin/login" as Route);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0.32)_100%)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-(--border) bg-[color:rgba(255,255,255,0.66)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-10 lg:px-16">
          <Link href="/home" className="flex items-center gap-3 text-lg font-semibold tracking-wide">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e3a5f,var(--primary))] text-sm font-bold text-white shadow-[0_10px_30px_rgba(15,118,110,0.24)]">
              AE
            </span>
            <span>
              AttendEdge
              <span className="block text-xs font-normal uppercase tracking-[0.3em] text-(--muted)">
                Admin Portal
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap items-center gap-2 rounded-full border border-(--border) bg-white/70 p-2 text-sm text-(--muted)">
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href as Route}
                  className="rounded-full px-4 py-2 transition hover:bg-[var(--foreground)]/5 hover:text-(--foreground)"
                >
                  {label}
                </Link>
              ))}
            </nav>
            {user ? (
              <div className="flex items-center gap-3 rounded-full border border-(--border) bg-white/80 px-4 py-2 text-sm">
                <div className="text-right leading-tight">
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-xs text-(--muted)">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10 lg:px-16">{children}</main>
    </div>
  );
}
