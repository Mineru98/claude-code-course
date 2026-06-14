// 로그 레벨 — 운영 환경에서 필터링에 사용 (인프라 타입이므로 로컬 정의)
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// LOG_LEVEL 환경변수를 검증해 최소 출력 레벨을 정한다.
// 알 수 없는 값이면 필터가 무력화되지 않도록 기본 info 로 떨어진다.
function resolveMinLevel(): LogLevel {
  const candidate = process.env.LOG_LEVEL;
  return candidate && candidate in LEVEL_ORDER ? (candidate as LogLevel) : "info";
}
// 최소 출력 레벨 (기본 info, LOG_LEVEL 환경변수로 조정)
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
