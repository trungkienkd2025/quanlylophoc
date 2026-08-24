import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans-family",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "QLLH",
  description: "Quản lý lớp học đơn giản cho giáo viên tiểu học.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${fontSans.variable} h-full antialiased`}
    >
      <body className={`${fontSans.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
