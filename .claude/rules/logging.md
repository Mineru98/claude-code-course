---
paths:
  - "apps/**/*"
---

# 규칙 — 시스템 로깅 (런타임 앱 공통)

> 코드 일관성의 단일 출처(SSOT). `paths` 가 매칭되는 `apps/**` 파일을 읽거나 만들 때 자동 발견되어 로드된다.
> 적용 범위: `apps/api`, `apps/web`, `apps/web-diff` — 즉 **런타임이 있는 앱 전부**.

## 목적 & 적용 범위

- 모든 런타임 앱에 **외부 의존성 없는 경량 구조적(JSON) 시스템 로거**를 일관되게 적용한다.
- 로그는 사람이 읽는 자유 문장이 아니라 **한 줄 JSON** 으로 출력해, 수집·검색·필터가 가능하게 한다.
- **`packages/shared` 는 로깅 대상이 아니다.** 순수 타입(런타임 코드 없음)만 두는 패키지이므로 로거를 넣지 않는다. (`shared-types.md`)
- 외부 로깅 라이브러리는 도입하지 않는다 — 아래 자체 경량 로거가 유일한 출처다. (의존성 정책 참고)

## 로거 인터페이스 (계약)

모든 앱의 로거는 동일한 계약을 따른다. 형태가 같아야 로그가 앱 경계를 넘어도 같은 방식으로 해석된다.

| 요소 | 형태 |
|---|---|
| 레벨 | `LogLevel = "debug" \| "info" \| "warn" \| "error"` |
| 호출 | `logger.{debug,info,warn,error}(message: string, context?: Record<string, unknown>)` |
| 출력 | 한 줄 JSON `{ timestamp, level, message, context? }` |

- `timestamp` 는 `new Date().toISOString()` (UTC ISO-8601).
- `context` 는 **있을 때만** 직렬화한다(없으면 키 자체를 생략).
- `message` 는 한국어 허용. `context` 의 **키는 영어**(`statusCode`, `durationMs` 등).
- `error` / `warn` 은 `console.error` / `console.warn` 으로, 그 외는 `console.log` 로 내보낸다(스트림 분리).

### 표준 구현 (각 앱 공통 — `MIN_LEVEL` 한 줄만 앱별로 다름)

아래가 모든 앱이 공유하는 표준 로거다. **딱 한 줄, `MIN_LEVEL` 의 출처만 앱별로 다르다** — api(서버)는 `LOG_LEVEL`, web 은 브라우저에 노출되는 `NEXT_PUBLIC_LOG_LEVEL` 을 먼저 읽는다(아래 "환경변수"). 나머지(`emit`/`logger`)는 그대로 복제한다.

```ts
export type LogLevel = "debug" | "info" | "warn" | "error";
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// apps/api (서버): LOG_LEVEL 만 읽는다.
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";
// apps/web · apps/web-diff: 브라우저에 노출되는 NEXT_PUBLIC_LOG_LEVEL 을 먼저, 서버 런타임용 LOG_LEVEL 을 폴백으로.
// const MIN_LEVEL: LogLevel =
//   (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) ?? (process.env.LOG_LEVEL as LogLevel) ?? "info";
function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const entry = { timestamp: new Date().toISOString(), level, message, ...(context ? { context } : {}) };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => emit("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => emit("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => emit("error", m, c),
};
```

- `MIN_LEVEL` 보다 낮은 레벨은 조기 반환으로 버린다(레벨 게이팅). 환경변수로 출력량을 조절한다(아래 "환경변수").
- web 은 브라우저에서도 동작해야 하므로 `NEXT_PUBLIC_LOG_LEVEL` 을 먼저 읽고, 서버 런타임(RSC/SSR)에서는 `LOG_LEVEL` 폴백이 의미가 있다. 브라우저 번들에는 `NEXT_PUBLIC_` 값만 인라인되므로 클라이언트에서는 `NEXT_PUBLIC_LOG_LEVEL`(또는 `info`)이 적용된다.

## 파일 위치 규약

| 위치 | 파일 | 역할 |
|---|---|---|
| 모든 앱 | `<app>/src/lib/logger.ts` | 로거 코어(위 표준 구현) |
| `apps/api` | `src/middleware/requestLogger.ts` | HTTP 요청/응답 로깅 미들웨어 |
| `apps/api` | `src/middleware/errorHandler.ts` | 중앙 에러 핸들러(처리되지 않은 오류 로깅) |
| `apps/web` · `apps/web-diff` | `src/app/error.tsx` | 렌더링 에러 바운더리(`"use client"`)에서 `logger.error` 호출 |

- 파일명은 `naming.md` 를 따른다 — `logger.ts`, `requestLogger.ts`, `errorHandler.ts` (미들웨어는 `<name>.ts`).
- **apps/api (Express, ESM/NodeNext)**: 상대 import 에 `.js` 접미사를 붙인다 — 예: `import { logger } from "../lib/logger.js";`. (`express-api.md`)
- **apps/web · apps/web-diff (Next.js)**: `@/` 별칭으로 import 한다 — 예: `import { logger } from "@/lib/logger";`. (`nextjs-web.md`)

## 레이어별 — 무엇을 로깅하나

로깅은 **경계(boundary)에서** 한다. 순수 로직 계층에 로그를 흩뿌리지 않는다.

### apps/api

- **부트스트랩**: 서버 시작 시 1회(`info`) — 포트 등.
- **HTTP 요청/응답**: `requestLogger` 미들웨어에서 `method` · `path` · `statusCode` · `durationMs` 를 `context` 로 남긴다(`info`).
- **처리되지 않은 오류**: 중앙 에러 핸들러(`errorHandler.ts`)에서 `logger.error` 로 한 번만 남긴다(`{ data }`/`{ error }` 봉투는 그대로 유지).
- **스토어/서비스 계층은 순수 로직으로 유지** — 여기서는 로깅하지 않는다. 로그 경계는 미들웨어다. (`express-api.md` 의 라우트↔store 계층 분리와 동일한 정신)

### apps/web · apps/web-diff

- **API 호출**: `src/lib/api.ts` 의 공통 `request` 래퍼에서 호출과 실패를 로깅한다(컴포넌트가 아니라 래퍼가 경계). (`nextjs-web.md` 의 "API 는 `lib/api` 경유" 규칙과 일치)
- **사용자 액션**: 추가/토글/삭제 같은 의미 있는 액션을 로깅한다(`info`).
- **렌더링 오류**: `src/app/error.tsx`(`"use client"`)에서 `logger.error` 로 바운더리에 잡힌 오류를 남긴다.

## 환경변수 — 최소 출력 레벨

| 앱 | 읽는 변수(우선순위) | 최종 폴백 |
|---|---|---|
| `apps/api`(서버) | `LOG_LEVEL` | `info` |
| `apps/web` · `apps/web-diff` | `NEXT_PUBLIC_LOG_LEVEL` → (서버 런타임 한정) `LOG_LEVEL` | `info` |

- `LOG_LEVEL`/`NEXT_PUBLIC_LOG_LEVEL` 로 그 레벨 미만의 로그를 끈다(예: 운영은 `info`, 디버깅은 `debug`).
- 브라우저에 노출되는 값만 `NEXT_PUBLIC_` 접두사를 붙인다 — 접두사 없는 값은 Next 가 클라이언트 번들로 전달하지 않는다. 그래서 web 의 `LOG_LEVEL` 폴백은 **서버 런타임(RSC/SSR)에서만** 적용되고, 브라우저에서는 `NEXT_PUBLIC_LOG_LEVEL`(없으면 `info`)이 쓰인다. (`nextjs-web.md`)

## 언어 & 네이밍

- 로그 `message` 는 **한국어 허용**(사용자/운영자가 읽는 문구). 코드 식별자·파일명·`context` 키는 **영어**. (`monorepo.md` 언어 규칙)
- 파일명은 `naming.md` 준수: `logger.ts`, `requestLogger.ts`, `errorHandler.ts`.

## 의존성 정책

- **외부 로깅 라이브러리(pino · winston · morgan 등) 도입 금지.** 위 자체 경량 로거만 사용한다(런타임 의존성 0).
- `LogLevel` 등 **로깅 인프라 타입은 도메인 타입이 아니다** — `@todo/shared` 가 아니라 **각 앱 로컬**(`<app>/src/lib/logger.ts`)에 둔다. `@todo/shared` 는 api↔web 이 주고받는 도메인 계약만 담는다. (`monorepo.md` · `shared-types.md`)

## 검증

- 변경 후 루트에서 `npm run typecheck`. (`monorepo.md`)
