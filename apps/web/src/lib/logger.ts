// 로그 레벨 — 운영 환경에서 필터링에 사용 (인프라 타입이므로 로컬 정의)
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
// 최소 출력 레벨 (기본 info). 브라우저 노출을 위해 NEXT_PUBLIC_ 우선, 서버 전용 LOG_LEVEL 폴백.
// 유효하지 않은 값이 들어와도 레벨 필터가 무력화되지 않도록 LEVEL_ORDER 로 검증한다.
function resolveMinLevel(): LogLevel {
  const raw = process.env.NEXT_PUBLIC_LOG_LEVEL ?? process.env.LOG_LEVEL;
  return raw && raw in LEVEL_ORDER ? (raw as LogLevel) : "info";
}
const MIN_LEVEL: LogLevel = resolveMinLevel();

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};
