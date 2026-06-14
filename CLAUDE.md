# Todo 모노레포 — 프로젝트 규칙

npm workspace 기반 학습용 모노레포. **Next.js(웹) + Express(API) + 공유 타입 패키지**로 구성.

## 워크스페이스 맵

| 경로 | 역할 | 스택 | 진입점 규칙 |
|---|---|---|---|
| `apps/web` | 프론트엔드 | Next.js 14 App Router · React 18 · TS | `apps/web/CLAUDE.md` |
| `apps/api` | 백엔드 REST API | Express 4 · TS (ESM/NodeNext) | `apps/api/CLAUDE.md` |
| `packages/shared` | 공유 도메인 타입(계약) | TS 타입 only | `packages/shared/CLAUDE.md` |

## ⚠️ 규칙이 적용되는 방식 — 먼저 이해할 것

규칙은 **2단 구조**다:

1. **폴더별 `CLAUDE.md`(진입점)** — 그 폴더를 만질 때 "무엇을, 어디에, 어떤 패턴으로" 만들지 안내한다. 하위 디렉토리 `CLAUDE.md` 는 그 폴더의 파일을 읽을 때 로드된다.
2. **`.claude/rules/*.md`(SSOT)** — 코드 일관성 규칙의 단일 출처. 각 파일이 `paths` frontmatter 로 적용 범위를 선언하면, 그 경로의 파일을 읽거나 만들 때 **자동 발견되어 로드**된다(경로별 규칙). `@import` 불필요.

핵심 동작 원리:

- **규칙은 그 파일이 컨텍스트로 READ 될 때만 활성화된다.**
- 이 루트 파일은 세션 시작 시 항상 로드된다. 하지만 **하위 폴더의 `CLAUDE.md` 와 `paths` 가 걸린 `.claude/rules/*.md` 는, 그 경로의 파일을 읽거나 수정·생성할 때 비로소 로드된다.**
- 그래서 앱별 세부 규칙은 각 폴더 `CLAUDE.md` + `.claude/rules` 에 둔다 — `apps/api/**` 파일을 만지면 `apps/api/CLAUDE.md` 와 `paths` 가 매칭되는 `express-api.md`(+ `monorepo.md` · `naming.md`)가 자동 적용된다.
- 규칙을 바꾸려면 코드가 아니라 **해당 `.claude/rules/*.md`**(상세 일관성) 또는 폴더 `CLAUDE.md`(진입 절차)를 수정한다.

## 📁 규칙 파일 지도 (`.claude/rules` — 코드 일관성 SSOT)

각 규칙은 YAML frontmatter 의 `paths` 로 적용 범위를 선언하고, 일치하는 파일을 읽거나 만들 때만 자동 로드된다(경로별 규칙).

| 파일 | `paths` (자동 로드 트리거) | 핵심 내용 |
|---|---|---|
| `monorepo.md` | `apps/**/*` · `packages/**/*` | 언어 · 타입 계약 · 응답 봉투 · npm workspace · 검증 |
| `naming.md` | `apps/**/*` · `packages/**/*` | 식별자·파일명 네이밍, "새 파일" 체크리스트 |
| `express-api.md` | `apps/api/**/*` | ESM(`.js`) · 상태코드 · 라우트↔store 계층 · 에러 처리 |
| `nextjs-web.md` | `apps/web/**/*` | 서버/클라 경계 · `lib/api` 경유 · 특수 파일 |
| `shared-types.md` | `packages/shared/**/*` | 순수 타입 · 네이밍 계약 · barrel 구조 |
| `logging.md` | `apps/**/*` | 시스템 로깅 — 레벨·구조적 JSON·로거 위치·레이어별 로깅 지점 |

`.claude/rules/` 의 `.md` 는 **자동 발견**되므로 `@import` 가 필요 없다. 새 규칙은 파일을 추가하고 `paths` 만 선언하면 된다 — SSOT 는 항상 `.claude/rules` 다. `paths` 를 생략하면 모든 세션에 항상 로드된다.

## 🆕 새 파일을 만들 때 (가장 중요)

규칙이 로드되지 않은 채 파일을 생성하면 네이밍·디자인 패턴이 어긋난다. **어느 워크스페이스든 파일을 새로 만들기 전에:**

1. **그 폴더의 `CLAUDE.md` 를 먼저 Read** 한다 → 진입 규칙과 `paths` 가 매칭되는 `.claude/rules` 가 함께 로드된다.
2. **파일명·위치**는 `naming.md` 의 표를 따른다.
3. **디자인 패턴**을 적용한다:
   - api: 라우트(HTTP) ↔ store/service 계층 분리, `{ data }`/`{ error }` 봉투, ESM 상대 import 는 `.js`.
   - web: 서버 컴포넌트 기본 · `"use client"` 는 leaf 로, API 는 `@/lib/api` 경유.
   - shared: 순수 타입만, `Create/Update<Entity>Input` 네이밍.
4. 도메인 타입이 필요하면 **먼저 `packages/shared`** 에 정의한 뒤 api·web 에서 소비한다.
5. 만든 뒤 루트에서 `npm run typecheck`.

## 공통 규칙 (요약 — 상세 SSOT 는 `.claude/rules/monorepo.md`)

- **언어**: 주석·커밋·UI 문구는 한국어, 식별자(변수/함수/타입/파일명)는 영어.
- **타입 계약 단일 출처**: api↔web 도메인 타입은 `@todo/shared` 에서만 정의. 앱 내부 재정의 금지.
- **응답 봉투 통일**: 성공 `{ data: T }`, 실패 `{ error: string }` (`ApiResponse<T>` / `ApiError`).
- **타입 전용 import** 는 `import type`.
- **패키지 매니저**: npm workspaces. 의존성은 워크스페이스 단위로 `npm i -w <workspace> <pkg>`.
- **검증**: 변경 후 루트에서 `npm run typecheck` 로 전 워크스페이스 타입 검사.

## 새 기능 작업 순서 (권장)

1. 두 앱이 공유할 타입이 필요하면 → **먼저 `packages/shared`** 에 정의 (`shared-types.md`).
2. API 엔드포인트 → `apps/api/CLAUDE.md` 규칙대로 (라우트/계층/에러/상태코드).
3. 화면·컴포넌트 → `apps/web/CLAUDE.md` 규칙대로 (서버/클라 경계, `lib/api` 경유).
