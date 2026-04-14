import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravEx — Transactions",
  description: "Stripe-inspired dashboard design system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
