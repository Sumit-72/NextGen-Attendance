"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";
import {
  buildDevIdToken,
  isFirebaseConfigured,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase";

type LoginFormProps = {
  role: "STUDENT" | "TEACHER" | "ADMIN";
  title: string;
  description: string;
};

function portalLabel(role: LoginFormProps["role"]) {
  if (role === "ADMIN") return "Admin Portal";
  if (role === "TEACHER") return "Teacher Portal";
  return "Student Portal";
}

function dashboardPath(role: LoginFormProps["role"]): Route {
  if (role === "ADMIN") return "/admin/dashboard" as Route;
  if (role === "TEACHER") return "/teacher/dashboard";
  return "/student/dashboard";
}

export function LoginForm({ role, title, description }: LoginFormProps) {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firebaseReady = isFirebaseConfigured();
  const devAuthEnabled = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (loading || !user) return;

    if (role === "ADMIN" && user.role === "ADMIN") {
      router.replace("/admin/dashboard" as Route);
      return;
    }

    if (role === "TEACHER" && (user.role === "TEACHER" || user.role === "ADMIN")) {
      router.replace("/teacher/dashboard");
      return;
    }

    if (role === "STUDENT" && user.role === "STUDENT") {
      router.replace("/student/dashboard");
    }
  }, [user, loading, role, router]);

  async function completeSignIn(idToken: string) {
    const user = await signIn(idToken, role);

    if (user.role !== role && user.role !== "ADMIN") {
      throw new Error(`This account is registered as a ${user.role.toLowerCase()}. Use the correct portal.`);
    }

    if (role === "ADMIN" && user.role !== "ADMIN") {
      throw new Error("This account does not have admin access.");
    }

    router.push(dashboardPath(role));
  }

  async function handleEmailSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const idToken = await signInWithEmail(email.trim(), password);
      await completeSignIn(idToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);

    try {
      const idToken = await signInWithGoogle();
      await completeSignIn(idToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Google.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDevSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedName = fullName.trim() || trimmedEmail.split("@")[0] || "User";
      const idToken = buildDevIdToken(role, trimmedEmail, trimmedName);
      await completeSignIn(idToken);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to sign in.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-[1.75rem] border border-(--border) bg-(--surface) p-8 shadow-[0_16px_60px_rgba(16,33,47,0.10)] backdrop-blur-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--primary)">
        {portalLabel(role)}
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-(--muted)">{description}</p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {firebaseReady ? (
        <form className="mt-6 grid gap-4" onSubmit={handleEmailSignIn}>
          <input
            className="rounded-xl border border-(--border) bg-white px-4 py-3 transition focus:border-(--primary)"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="rounded-xl border border-(--border) bg-white px-4 py-3 transition focus:border-(--primary)"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            className="rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) transition hover:bg-(--primary-strong) disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Continue with Email"}
          </button>
          <button
            className="rounded-full border border-(--border) bg-white/80 px-5 py-3 text-sm font-medium transition hover:bg-white disabled:opacity-60"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
          >
            Continue with Google
          </button>
        </form>
      ) : devAuthEnabled ? (
        <form className="mt-6 grid gap-4" onSubmit={handleDevSignIn}>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase is not configured. Use development sign-in for local testing.
          </p>
          <input
            className="rounded-xl border border-(--border) bg-white px-4 py-3 transition focus:border-(--primary)"
            placeholder="Full name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
          />
          <input
            className="rounded-xl border border-(--border) bg-white px-4 py-3 transition focus:border-(--primary)"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <button
            className="rounded-full bg-(--primary) px-5 py-3 text-sm font-medium text-(--primary-foreground) transition hover:bg-(--primary-strong) disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Continue (Dev Sign-in)"}
          </button>
        </form>
      ) : (
        <p className="mt-6 rounded-xl border border-(--border) bg-white/80 px-4 py-3 text-sm text-(--muted)">
          Firebase environment variables are missing. Add them to enable sign-in.
        </p>
      )}
    </section>
  );
}
