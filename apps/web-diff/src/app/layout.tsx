import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo 모노레포",
  description: "npm workspace · Next.js · Express(인메모리) 예제",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
