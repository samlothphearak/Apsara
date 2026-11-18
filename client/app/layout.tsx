import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apsara — Connect with your world",
  description:
    "Apsara is a social media platform that allows you to connect with your friends and family.",
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
