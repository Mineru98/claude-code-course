import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * 매칭되는 라우트가 없을 때의 404 핸들러.
 * 에러 핸들러 직전, 모든 라우트 뒤에 등록한다.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "요청한 리소스를 찾을 수 없습니다." });
}

/**
 * 중앙 에러 핸들러 (4-인자 시그니처).
 * 처리되지 않은 오류를 기록하고 일관된 500 응답 봉투로 변환한다.
 * Express 4 는 인자 4개짜리 미들웨어를 에러 핸들러로 인식하므로 `next` 인자를 유지한다.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error("처리되지 않은 오류", {
    message,
    stack,
    path: req.originalUrl,
  });

  res.status(500).json({ error: "서버 오류가 발생했습니다." });
}
