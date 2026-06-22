import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Todo · 모노레포 예제",
  description: "Turborepo + Next.js 모노레포로 만든 할 일 관리 앱",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 antialiased selection:bg-violet-200/70 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 dark:selection:bg-violet-500/30">
        {children}
      </body>
    </html>
  );
}
