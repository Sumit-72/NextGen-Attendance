"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useAuth } from "@/context/auth-context";

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "ADMIN") {
      router.replace("/admin/login" as Route);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <p className="text-sm text-(--muted)">Loading admin session…</p>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return children;
}
