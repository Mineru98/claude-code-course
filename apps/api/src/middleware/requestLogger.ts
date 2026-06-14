import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * 요청 로깅 미들웨어.
 * 요청 진입 시점을 기록하고, 응답이 끝나면(`finish`) 처리 시간과 상태코드를 함께 남긴다.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    logger.info("HTTP 요청 처리", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
}
