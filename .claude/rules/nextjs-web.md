---
paths:
  - "apps/web/**/*"
---

# 규칙 — Next.js 웹 (`apps/web`)

> 코드 일관성의 단일 출처(SSOT). `apps/web/CLAUDE.md` 에서 `@import` 된다.
> 스택: Next.js 14 App Router · React 18 · TypeScript.

## App Router 구조

- 라우팅은 `src/app/` 디렉토리 기반. 재사용 컴포넌트는 `src/components/`, 클라이언트/유틸은 `src/lib/`, 훅은 `src/hooks/`.
- 특수 파일(고정 이름):

  | 파일 | 역할 | 비고 |
  |---|---|---|
  | `page.tsx` | 라우트 화면 | 기본 **서버 컴포넌트** |
  | `layout.tsx` | 공통 레이아웃 | `metadata` export 가능 |
  | `loading.tsx` | 로딩 UI(Suspense) | |
  | `error.tsx` | 에러 바운더리 | **`"use client"` 필수** |
  | `not-found.tsx` | 404 화면 | `notFound()` 가 트리거 |

## 서버 컴포넌트 vs 클라이언트 컴포넌트 (핵심 경계)

- **서버 컴포넌트가 기본이다.** `"use client"` 가 없으면 서버 컴포넌트.
- `"use client"` 는 **다음이 필요할 때만**, 파일 **최상단**에 선언한다:
  - `useState` / `useEffect` 등 React 훅, 이벤트 핸들러(`onClick`, `onSubmit`), 브라우저 전용 API(`window`, `localStorage`).
- **클라이언트 경계는 최대한 잎(leaf)으로 내린다.** `page.tsx`/`layout.tsx` 는 가능하면 서버 컴포넌트로 두고, 상호작용이 필요한 부분만 별도 클라이언트 컴포넌트로 분리해 렌더한다.
  ```tsx
  // page.tsx — 서버 컴포넌트(기본). 클라이언트 컴포넌트를 렌더만 한다.
  import TodoApp from "@/components/TodoApp";
  export default function Page() {
    return <TodoApp />;
  }
  ```

## 데이터 페칭

- **서버 컴포넌트**: `async` 컴포넌트에서 직접 `fetch` (SSR 마다 최신이 필요하면 `{ cache: "no-store" }`). 결과를 클라이언트 컴포넌트에 props 로 내려준다.
- **클라이언트 상호작용**(추가/토글/삭제 등): 아래 `lib/api` 경유로 호출하고 `useState` 로 로컬 상태를 갱신한다.

## API 접근 — 반드시 `@/lib/api` 경유 (강제)

- **컴포넌트에서 `fetch` 를 직접 호출하지 않는다.** 모든 API 호출은 `src/lib/api.ts` 의 도메인 클라이언트(`todoApi`)를 통한다.
- 새 엔드포인트는 `lib/api.ts` 의 공통 `request<T>` 래퍼로 추가한다. 래퍼가 봉투(`{ data }`)를 벗기고, 실패 시 `{ error }` 메시지로 `throw` 하며, `204` 를 처리한다.
  ```ts
  export const todoApi = {
    list: () => request<Todo[]>("/todos"),
    create: (input: CreateTodoInput) =>
      request<Todo>("/todos", { method: "POST", body: JSON.stringify(input) }),
  };
  ```
- 컴포넌트는 `try/catch` 로 받아 `error` 상태에 담아 사용자에게 한국어로 보여준다.
- 도메인 타입은 `@todo/shared` 에서 import (`import type { Todo } from "@todo/shared"`). web 에서 재정의 금지. (`shared-types.md`)

## 경로 별칭 & import

- `@/*` → `src/*` (tsconfig `paths`). 상대경로 `../../` 대신 **항상 `@/` 별칭**을 쓴다.
  - ✅ `import { todoApi } from "@/lib/api";`
- 공유 패키지는 `@todo/shared` 로 import (Next 가 `transpilePackages` 로 트랜스파일).

## 컴포넌트 작성

- 파일명 `PascalCase.tsx`, `src/components/` 에. `default export` 1개. (`naming.md`)
- 함수형 컴포넌트만. props 는 인라인 타입 또는 명시적 `Props` 타입.
- 상태는 가능한 한 가까운 컴포넌트에 둔다(로컬 `useState`). 전역 상태 도구는 필요해질 때까지 도입하지 않는다.

## 환경변수 & 스타일

- 브라우저에 노출할 값만 `NEXT_PUBLIC_` 접두사: `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"`. 접두사 없는 값은 서버에서만 읽힌다.
- 스타일은 현재 `globals.css` + `className` 방식. 같은 방식을 유지하고, 도입 시 팀 합의 없이 CSS 체계를 바꾸지 않는다.

## 검증

- 변경 후 루트에서 `npm run typecheck`.
