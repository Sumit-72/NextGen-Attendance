import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AttendEdge",
    template: "%s | AttendEdge",
  },
  description: "Production-ready college attendance management platform for teachers, students, and admins.",
  applicationName: "AttendEdge",
  referrer: "origin-when-cross-origin",
  keywords: [
    "college attendance",
    "attendance management",
    "teacher portal",
    "student portal",
    "Firebase authentication",
    "Prisma",
  ],
  authors: [{ name: "AttendEdge Platform" }],
  creator: "AttendEdge Platform",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "AttendEdge",
    description: "College attendance management with secure role-based workflows.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}