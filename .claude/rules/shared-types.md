---
paths:
  - "packages/shared/**/*"
---

# 규칙 — 공유 타입 (`packages/shared`)

> 코드 일관성의 단일 출처(SSOT). `packages/shared/CLAUDE.md` 에서 `@import` 된다.
> 역할: api ↔ web 이 공유하는 **도메인 타입 계약**. `@todo/shared` 로 import 된다.

## 순수 타입만 (런타임 코드 금지)

- 이 패키지는 **타입·인터페이스만** export 한다. 값·함수·클래스·상수 등 **런타임 코드를 두지 않는다.**
- 이유: 이 패키지는 **빌드 산출물 없이 소스가 직접 소비**된다 — `package.json` 의 `main`/`types` 가 `src/index.ts` 를 직접 가리킨다.
  - `apps/api`: NodeNext 로 `.ts` 를 직접 해석.
  - `apps/web`: `next.config.mjs` 의 `transpilePackages: ["@todo/shared"]` 로 트랜스파일.
- 런타임 유틸(검증 함수 등)이 필요하면 여기 말고 각 앱 또는 별도 패키지에 둔다. (타입만 순수하게 유지)

## 도메인 타입 네이밍 계약

| 종류 | 패턴 | 예 |
|---|---|---|
| 엔티티 | `<Entity>` | `Todo` |
| 생성 입력 | `Create<Entity>Input` | `CreateTodoInput` |
| 수정 입력(부분) | `Update<Entity>Input` (필드 `?` optional) | `UpdateTodoInput` |
| 성공 응답 래퍼 | `ApiResponse<T>` = `{ data: T }` | — |
| 실패 응답 | `ApiError` = `{ error: string }` | — |

- 엔티티는 단수형 `PascalCase`. 입력 타입은 위 접두/접미 규칙을 지킨다. (`naming.md`)
- 응답 봉투 타입(`ApiResponse`/`ApiError`)은 여기가 **유일한 출처**다. 앱에서 복제 금지. (`monorepo.md`)

## 파일 구조 & export

- **현재**: 단일 `src/index.ts` 에 모든 타입(barrel).
- **트리거: 도메인이 둘 이상으로 늘면** → 도메인별 파일로 분리하고 `index.ts` 는 재export 전용으로 둔다.
  ```ts
  // src/todo.ts  — Todo 관련 타입
  // src/user.ts  — User 관련 타입
  // src/index.ts — export * from "./todo"; export * from "./user";
  ```
- `index.ts` 에 타입 정의를 계속 쌓지 않는다 (barrel 은 재export 전용).

## 변경 시 주의 — 양쪽에 파급된다

- 여기의 타입을 바꾸면 **api 와 web 양쪽이 즉시 영향**을 받는다. 이것이 이 패키지의 존재 이유(계약 일치)다.
- 필드 추가/삭제/이름변경 같은 파괴적 변경은 **api·web 사용처를 같은 변경 안에서 함께 수정**한다.
- 변경 후 반드시 루트에서 `npm run typecheck` — 전 워크스페이스가 한 번에 검사된다.
