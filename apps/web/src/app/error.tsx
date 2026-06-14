"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

// Next.js 에러 바운더리 특수 파일 — 렌더링 중 발생한 오류를 잡아 폴백 UI 를 보여준다
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("렌더링 오류 발생", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="container">
      <h1>⚠️ 문제가 발생했습니다</h1>
      <p className="subtitle">잠시 후 다시 시도해 주세요.</p>
      <p className="error">{error.message}</p>
      <button type="button" onClick={() => reset()}>
        다시 시도
      </button>
    </main>
  );
}
