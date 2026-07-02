import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <LoginForm
          role="ADMIN"
          title="Sign in to the admin console"
          description="Manage users, monitor platform activity, and oversee college operations."
        />
        <div className="mt-6 flex items-center justify-between text-sm text-(--muted)">
          <Link href="/home">Back to home</Link>
          <Link href="/teacher/login">Teacher login</Link>
        </div>
      </div>
    </main>
  );
}
