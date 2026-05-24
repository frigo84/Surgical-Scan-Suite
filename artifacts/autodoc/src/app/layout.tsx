import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoDoc — Surgical Data Extraction",
  description: "Robotic knee surgery screenshot data extraction tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-900 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
