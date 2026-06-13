---
paths:
  - "apps/**/*"
  - "packages/**/*"
---

# 규칙 — 모노레포 공통 (전 워크스페이스)

> 코드 일관성의 단일 출처(SSOT). 이 파일은 각 폴더의 `CLAUDE.md`에서 `@import` 되어 로드된다.
> 적용 범위: `apps/api`, `apps/web`, `packages/shared` 전부.

## 언어 규칙

- **한국어**: 주석, 커밋 메시지, 사용자에게 보이는 UI 문구.
- **영어**: 모든 식별자 — 변수·함수·타입·파일명·디렉토리명.
- 한 줄 안에서도 이 경계를 지킨다. (예: `const remaining = ...; // 남은 할 일 개수`)

## 타입 계약 단일 출처

- api ↔ web 이 주고받는 **도메인 타입은 `@todo/shared`에서만 정의**한다.
- 앱 내부에서 `Todo`, `CreateTodoInput` 같은 도메인 타입을 **재정의·복제하지 않는다**.
- 타입이 필요한데 없으면 → 앱에 만들지 말고 **먼저 `packages/shared`에 추가**한다.
- 타입 전용 import 는 반드시 `import type { ... } from "..."` 를 쓴다 (`isolatedModules`/번들러 트리셰이킹 보장).

## 응답 봉투 통일

api 가 내보내고 web 이 동일하게 해석하는 단일 계약:

| 결과 | 형태 | 출처 타입 |
|---|---|---|
| 성공 | `{ data: T }` | `ApiResponse<T>` |
| 실패 | `{ error: string }` | `ApiError` |
| 본문 없음(204) | 응답 바디 없음 | — |

- api: 성공은 `res.json({ data })`, 실패는 `res.status(code).json({ error })`.
- web: `lib/api` 의 공통 래퍼가 `{ data }` 를 벗기고, 실패 시 `error` 메시지로 throw 한다.
- 이 봉투 형태를 **앱마다 다르게 바꾸지 않는다.** 바꿔야 하면 `@todo/shared` 의 타입부터 고친다.

## 패키지 매니저 — npm workspaces

- 의존성은 **워크스페이스 단위**로 설치: `npm i -w <workspace> <pkg>`
  - 예: `npm i -w apps/api zod`, `npm i -D -w apps/web @types/xxx`
- 워크스페이스 간 참조는 버전 `"*"` 로 건다 (예: `"@todo/shared": "*"`). 루트에서 심볼릭 링크됨.
- 루트에 직접 런타임 의존성을 추가하지 않는다 (루트 `package.json` 은 오케스트레이션 스크립트만).

## 검증 (변경 후 필수)

- 변경 후 **루트에서** 전 워크스페이스 타입 검사: `npm run typecheck`
- 단일 워크스페이스만: `npm run typecheck -w apps/api`
- 타입이 깨진 채로 작업을 마치지 않는다. `@todo/shared` 를 고치면 api·web 양쪽이 영향을 받으므로 반드시 전체 검사.

## 새 기능 작업 순서 (권장)

1. 두 앱이 공유할 타입이 필요하면 → **먼저 `packages/shared`** 에 정의. (`shared-types.md`)
2. API 엔드포인트 → `express-api.md` 규칙대로 (라우트/계층/에러/상태코드).
3. 화면·컴포넌트 → `nextjs-web.md` 규칙대로 (서버/클라 경계, `lib/api` 경유).

이 순서를 지키면 타입 계약이 항상 api·web 보다 먼저 확정되어 양쪽 구현이 어긋나지 않는다.
