import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusFlow",
  description: "Academic dashboard for attendance, timetable, results, and PESU sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
