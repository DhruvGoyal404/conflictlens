import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 antialiased">{children}</body>
    </html>
  );
}
