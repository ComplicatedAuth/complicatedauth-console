import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ComplicatedAuth", template: "%s · ComplicatedAuth" },
  description:
    "Project-scoped authentication infrastructure, managed without ambiguity.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="text-zinc-950 antialiased dark:text-white">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&amp;display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
