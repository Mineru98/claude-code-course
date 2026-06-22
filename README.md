# Claude Code 구성 요소 수업

Claude Code의 핵심 구성 요소를 한 번에 몰아서 다루지 않고, 주제마다 별도 브랜치로 나눠 하나씩 익히는 교육용 저장소입니다. 훅, 서브에이전트, 에이전트 팀, 플랜 기반 워크플로우, 프로젝트 규칙을 각 브랜치에서 예제와 함께 따라가며 배울 수 있습니다.

`main` 브랜치에는 모든 수업이 공통으로 참고하는 실습용 예제 앱(할 일 관리 웹앱)이 들어 있습니다. 이 앱은 그 자체로 완성된 제품을 보여주려는 것이 아니라, **pnpm + Turborepo 모노레포가 작은 규모에서 어떻게 구성되는지**를 코드로 확인하기 위한 교보재입니다.

## 수업 목차

각 주제는 독립된 `course/*` 브랜치에 예제 코드와 설명이 담겨 있습니다. 아래 링크는 GitHub의 해당 브랜치로 바로 연결됩니다.

| 주제 | 다루는 내용 | 브랜치 |
| ---- | ----------- | ------ |
| Hooks | Claude Code 훅의 구성과 활용 | [course/hooks](https://github.com/Mineru98/claude-code-course/tree/course/hooks) |
| Subagents | 서브에이전트 정의와 사용 | [course/agents](https://github.com/Mineru98/claude-code-course/tree/course/agents) |
| Agent Teams | 다중 에이전트 협업과 오케스트레이션 | [course/agent-teams](https://github.com/Mineru98/claude-code-course/tree/course/agent-teams) |
| Plan | 설계 → 계획 → 구현으로 이어지는 플랜 기반 워크플로우 | [course/plan](https://github.com/Mineru98/claude-code-course/tree/course/plan) |
| Rules | 프로젝트 규칙(`CLAUDE.md`) 작성과 활용 | [course/rules](https://github.com/Mineru98/claude-code-course/tree/course/rules) |

각 브랜치는 이 `main`의 예제 앱을 출발점으로 삼아 해당 주제를 덧붙이는 식으로 구성됩니다. 먼저 아래 내용을 따라 `main`을 실행해 본 뒤 원하는 수업 브랜치로 이동하면 됩니다.

```bash
git switch course/hooks   # 원하는 수업 브랜치로 이동
```

---

## 예제 앱: 할 일 관리 웹앱

`main` 브랜치의 예제 앱은 익숙한 Todo 앱입니다. 다만 초점은 기능이 아니라 구조에 있습니다. 도메인 타입을 어디서 정의해 어떻게 공유하는지, 서버 전용 코드를 클라이언트와 어떻게 분리하는지, 워크스페이스 내부 패키지를 빌드 없이 어떻게 가져다 쓰는지 같은 선택을 작은 코드량 안에서 직접 읽어볼 수 있습니다.

### 기술 스택

| 분류 | 사용 기술 |
| ---- | --------- |
| 모노레포 | Turborepo `2.9.18`, pnpm `10.33.0` (workspaces) |
| 앱 | Next.js `16.2.9` (App Router · Route Handler), React `19.2.7` |
| 스타일 | Tailwind CSS v4 (`4.3.1`, PostCSS 플러그인) |
| 언어 | TypeScript `6.0.3` (strict, `noUncheckedIndexedAccess` 등) |
| 런타임 | Node.js `>= 20` |
| 데이터 | 파일 기반 JSON 저장 — 별도 DB 불필요 |

버전은 모두 각 `package.json`에 고정되어 있습니다. 공통 컴파일러 옵션은 루트 `tsconfig.base.json`에 모아 두고, 각 워크스페이스의 `tsconfig.json`이 이를 `extends` 합니다.

### 구성 요소 한눈에 보기

| 워크스페이스 | 패키지명 | 역할 |
| ------------ | -------- | ---- |
| `apps/web` | `web` | Next.js 앱. UI와 `/api/todos` Route Handler를 함께 제공 |
| `packages/types` | `@todo/types` | 프런트·백이 공유하는 도메인 타입과 상수·검증 함수 |
| `packages/store` | `@todo/store` | 파일 기반 저장소. 서버에서만 동작 |

`web`은 `@todo/types`와 `@todo/store`를 `workspace:*`로 의존하고, `@todo/store`는 다시 `@todo/types`에 의존합니다.

### 눈여겨볼 설계 포인트

**1. 도메인 타입을 프런트와 백이 함께 쓴다.**
`@todo/types`가 `Todo`, `CreateTodoInput`, `UpdateTodoInput`, `TodoPriority`, `TodoFilter` 같은 도메인 타입을 정의하고, 서버의 Route Handler와 브라우저의 API 클라이언트가 똑같은 타입을 import 합니다. 한쪽만 바뀌어 생기는 타입 불일치를 컴파일 단계에서 막자는 의도입니다. 이 패키지는 타입뿐 아니라 우선순위 정렬 가중치(`PRIORITY_WEIGHT`)와 런타임 검증 함수(`isTodoPriority`)도 함께 내보냅니다.

**2. 내부 패키지는 빌드 산출물이 없다.**
`@todo/types`와 `@todo/store`는 컴파일된 결과물 대신 TypeScript 소스를 그대로 노출합니다. 두 패키지 모두 `main`, `types`, `exports` 필드가 `./src/index.ts`를 직접 가리킵니다. 트랜스파일은 앱 쪽 `next.config.ts`의 `transpilePackages: ["@todo/types", "@todo/store"]` 설정이 맡으므로, 패키지마다 별도 빌드 단계를 둘 필요가 없습니다.

**3. 저장소는 서버에서만 동작한다.**
`@todo/store`는 Node.js `fs`(`node:fs/promises`)로 JSON 파일에 데이터를 읽고 씁니다. 그래서 Route Handler와 서버 컴포넌트(`page.tsx`)에서만 import 되며, 클라이언트 번들로 새어 들어가지 않도록 경계를 분명히 둡니다. 저장 경로는 `TODO_DATA_FILE` 환경변수로 덮어쓸 수 있고, 기본값은 프로세스 작업 디렉터리 기준 `.data/todos.json`입니다.

**4. 동시 쓰기를 한 줄로 직렬화한다.**
변경 요청이 동시에 들어와도 store가 Promise 체인 기반 쓰기 잠금(write lock)으로 순서대로 처리합니다. 여러 요청이 같은 파일을 동시에 덮어써 데이터가 유실되는 상황을 막기 위한 장치입니다. 조회(`listTodos`, `getTodo`)는 잠금 없이 읽고, 목록은 생성 시각 기준 최신순으로 정렬해 반환합니다.

**5. UI는 낙관적 업데이트로 반응한다.**
완료 토글, 제목 수정, 우선순위 변경, 삭제, 완료 항목 정리는 서버 응답을 기다리지 않고 화면을 먼저 갱신한 뒤, 요청이 실패하면 이전 상태로 되돌립니다(`apps/web/components/todo-app.tsx`). 체감 반응이 빠른 대신 실패 처리를 직접 다뤄야 한다는 점을 보여줍니다. 반대로 할 일 추가는 서버가 부여한 `id`가 필요하므로 응답을 받은 뒤 목록에 반영합니다.

기능 자체는 익숙합니다. 할 일 추가, 완료 토글, 제목 인라인 수정(더블클릭 → Enter 저장, Escape 취소), 우선순위(낮음/보통/높음) 순환 변경, 삭제, 필터(전체/진행 중/완료), 완료 항목 일괄 정리, 남은 개수 표시를 갖췄고 다크 모드 스타일도 대응합니다.

### 디렉토리 구조

```
.
├── apps/
│   └── web/                      # Next.js 앱 (UI + /api Route Handler)
│       ├── app/
│       │   ├── api/todos/
│       │   │   ├── route.ts       # GET·POST·DELETE /api/todos
│       │   │   └── [id]/route.ts  # PATCH·DELETE /api/todos/:id
│       │   ├── layout.tsx         # 루트 레이아웃 (lang="ko", 다크 모드 그라데이션)
│       │   ├── page.tsx           # 서버 컴포넌트: 초기 목록 로드 후 전달
│       │   └── globals.css
│       ├── components/            # todo-app, todo-input, todo-list, todo-item, todo-filter-bar
│       ├── lib/api-client.ts      # 브라우저 → Route Handler 호출 헬퍼
│       ├── next.config.ts         # transpilePackages 설정
│       ├── postcss.config.mjs     # Tailwind v4 PostCSS 플러그인
│       ├── .env.example           # TODO_DATA_FILE 예시
│       └── package.json
├── packages/
│   ├── types/                    # @todo/types — 공유 도메인 타입 (소스 노출)
│   │   └── src/index.ts
│   └── store/                    # @todo/store — 파일 기반 저장소 (서버 전용)
│       └── src/index.ts
├── package.json                  # 루트: turbo 래퍼 스크립트
├── pnpm-workspace.yaml           # 워크스페이스 범위: apps/*, packages/*
├── turbo.json                    # 태스크 파이프라인
├── tsconfig.base.json            # 공통 컴파일러 옵션
└── .npmrc                        # auto-install-peers 등 pnpm 설정
```

### 사전 요구사항

- **Node.js `>= 20`** (루트 `package.json`의 `engines`에 명시)
- **pnpm `10.33.0`** — 루트 `package.json`의 `packageManager`로 고정되어 있습니다. [Corepack](https://nodejs.org/api/corepack.html)을 쓰면 별도 설치 없이 같은 버전이 활성화됩니다.

```bash
corepack enable            # pnpm 버전을 packageManager 설정에 맞춰 사용
```

### 설치 및 실행

```bash
pnpm install   # 워크스페이스 전체 의존성 설치
pnpm dev       # 개발 서버 실행 (http://localhost:3000)
```

루트의 모든 스크립트는 내부적으로 `turbo run <task>`로 실행됩니다. 예를 들어 `pnpm dev`는 `turbo run dev`를 거쳐 `apps/web`의 `next dev`로 이어집니다.

| 명령어 | 하는 일 |
| ------ | ------- |
| `pnpm dev` | 개발 서버 실행 (`next dev`, 캐시 없음·상시 실행) |
| `pnpm build` | 프로덕션 빌드 (`next build`) |
| `pnpm start` | 빌드 산출물로 서버 실행 (`build` 선행) |
| `pnpm typecheck` | 워크스페이스 전체 타입 검사 (`tsc --noEmit`) |
| `pnpm lint` | 린트 태스크 실행 — 아래 참고 |
| `pnpm clean` | 빌드 캐시 정리 후 루트 `node_modules` 삭제 |

> **`pnpm lint` 참고.** 현재 린트는 타입 검사로 대신합니다. `@todo/types`와 `@todo/store`의 `lint` 스크립트가 `tsc --noEmit`으로 정의돼 있고, `apps/web`에는 `lint` 스크립트가 없어 해당 워크스페이스에서는 아무 작업도 실행되지 않습니다. 별도의 ESLint 설정은 포함돼 있지 않습니다.

특정 워크스페이스만 실행하려면 pnpm의 `--filter`를 사용합니다.

```bash
pnpm --filter web dev          # web 앱만 개발 모드로 실행
pnpm --filter @todo/store typecheck
```

### REST API

브라우저의 API 클라이언트(`apps/web/lib/api-client.ts`)와 서버의 Route Handler가 같은 경로 규약을 공유합니다.

| 메서드 | 경로 | 설명 | 성공 응답 |
| ------ | ---- | ---- | --------- |
| `GET`    | `/api/todos`     | 전체 목록 조회 (최신 생성순) | `200` `{ todos }` |
| `POST`   | `/api/todos`     | 할 일 생성 (`title` 필수, `priority?` 선택) | `201` `{ todo }` |
| `PATCH`  | `/api/todos/:id` | 부분 수정 (`title?`, `completed?`, `priority?`) | `200` `{ todo }` |
| `DELETE` | `/api/todos/:id` | 할 일 삭제 | `204` (본문 없음) |
| `DELETE` | `/api/todos`     | 완료 항목 일괄 정리 | `200` `{ removed }` |

입력은 모두 서버에서 검증합니다. 빈 `title`이나 잘못된 `priority`는 `400`으로 거부하고, JSON이 아닌 본문에도 `400`을 반환하며, 존재하지 않는 `id`에는 `404`를 반환합니다. 오류 응답은 `{ error: string }` 형태이고, 클라이언트는 이 메시지를 그대로 화면에 노출합니다.

### 데이터 저장

데이터는 기본적으로 `apps/web/.data/todos.json`에 저장되며, `.data` 디렉터리는 `.gitignore`에 포함되어 커밋되지 않습니다. 별도 데이터베이스를 띄우지 않아도 바로 실행해 볼 수 있고, 저장 위치를 바꾸려면 `TODO_DATA_FILE` 환경변수를 지정하면 됩니다(예시는 `apps/web/.env.example` 참고). 파일이 아직 없으면 첫 쓰기 시점에 디렉터리째 자동 생성됩니다.
