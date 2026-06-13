# apps/web — Next.js 웹 · 규칙

Next.js 14 App Router · React 18 · TypeScript. Todo UI 를 렌더하고 `@/lib/api` 를 통해 API 를 소비한다.

> 이 파일이 컨텍스트에 로드됐다는 것은 지금 `apps/web` 을 만지고 있다는 뜻이다.
> 아래 가이드와 문서 끝에서 `@import` 되는 상세 규칙(SSOT)을 따른다.

## 새 파일을 만들기 전에 — 반드시 확인 (가장 중요)

규칙은 **파일이 READ 될 때만 적용**된다. 만들기 전에:

1. **무엇을 만드는가** → 아래 *배치 맵*에서 디렉토리와 파일명 패턴을 고른다.
2. **서버 / 클라이언트 경계를 먼저 정한다**:
   - 상태(`useState`)·이펙트(`useEffect`)·이벤트 핸들러·브라우저 API 가 필요하면 → 파일 최상단 `"use client"`. 그 경계는 **최대한 잎(leaf) 컴포넌트로** 내린다.
   - 아니면 → 그대로 **서버 컴포넌트**(기본). `page.tsx`/`layout.tsx` 는 가능하면 서버 컴포넌트로 유지.
3. **디자인 패턴을 적용한다**:
   - API 호출은 컴포넌트에서 직접 `fetch` 하지 말고 **`@/lib/api` 의 클라이언트 경유**. 새 엔드포인트는 `lib/api.ts` 의 `request<T>` 래퍼로 추가.
   - 도메인 타입은 **`@todo/shared`** 에서 import (재정의 금지). import 는 `@/` 별칭 사용.
4. 만든 뒤 루트에서 `npm run typecheck`.

## 배치 맵

| 만들 것 | 위치 | 파일명 패턴 |
|---|---|---|
| 재사용 컴포넌트 | `src/components/` | `PascalCase.tsx` |
| 라우트 화면/레이아웃 | `src/app/<route>/` | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`("use client"), `not-found.tsx` |
| API 클라이언트·유틸 | `src/lib/` | `camelCase.ts` |
| 커스텀 훅 | `src/hooks/` | `use*.ts` |

## 이 폴더에 자동 적용되는 상세 규칙 (SSOT)

아래 규칙은 `.claude/rules/` 에 있고, 각 파일의 `paths` frontmatter 가 `apps/web/**` 와 매칭되어 **이 폴더의 파일을 읽거나 만들 때 자동 로드**된다 (별도 `@import` 불필요):

- `monorepo.md` — 전 워크스페이스 공통 (언어·타입계약·응답봉투·검증)
- `naming.md` — 식별자·파일명·"새 파일" 체크리스트
- `nextjs-web.md` — 이 폴더 상세 (서버/클라 경계 · `lib/api` 경유 · 특수 파일)
