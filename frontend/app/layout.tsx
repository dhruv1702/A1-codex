import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMB Ops Copilot",
  description: "Daily operating brief demo for a small business owner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
