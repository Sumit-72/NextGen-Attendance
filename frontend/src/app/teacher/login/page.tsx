import Link from "next/link";
import type { Route } from "next";
import { LoginForm } from "@/components/login-form";

export default function TeacherLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <LoginForm
          role="TEACHER"
          title="Sign in to the teacher dashboard"
          description="Sign in with Firebase to exchange a secure session with the backend."
        />
        <div className="mt-6 flex flex-col gap-3 text-center text-sm text-[var(--muted)]">
          <div className="flex items-center justify-between">
            <Link href="/home">Back to home</Link>
            <Link href="/student/login">Student login</Link>
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            Don't have an account?{" "}
            <Link href={"/signup" as Route} className="font-semibold text-[var(--primary)] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
