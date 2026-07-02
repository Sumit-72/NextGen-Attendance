"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import type { Role } from "@/types/auth";

export function AuthGuard({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(role === "TEACHER" ? "/teacher/login" : "/student/login");
      return;
    }

    if (user.role !== role && user.role !== "ADMIN") {
      router.replace(user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard");
    }
  }, [user, loading, role, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <p className="text-sm text-(--muted)">Loading your session…</p>
      </div>
    );
  }

  if (!user || (user.role !== role && user.role !== "ADMIN")) {
    return null;
  }

  return children;
}
