import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remote Support Job Board",
  description:
    "A private, focused job board for verified fully remote customer and product support roles.",
  icons: {
    icon: "/remote-support-job-board/favicon.svg",
    shortcut: "/remote-support-job-board/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
