"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 렌더링 중 발생한 오류를 구조적 로그로 기록
    logger.error("렌더링 오류 발생", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="container">
      <h1>문제가 발생했습니다</h1>
      <p className="subtitle">잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={() => reset()}>
        다시 시도
      </button>
    </main>
  );
}
