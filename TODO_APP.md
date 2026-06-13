# Todo 모노레포 예제

npm workspace 기반 모노레포로 구성한 Todo 웹앱입니다.

## 구조

```
.
├── package.json          # 루트 — npm workspaces 정의 및 통합 스크립트
├── apps/
│   ├── web/              # Next.js(App Router) 프론트엔드  (포트 3000)
│   └── api/              # Express API 서버 (인메모리 저장)  (포트 4000)
└── packages/
    └── shared/           # 프론트·백엔드가 공유하는 TypeScript 타입
```

- `@todo/shared` 패키지의 `Todo` 타입을 `web`과 `api`가 함께 참조해 API 계약을 일치시킵니다.
- 데이터는 **인메모리**로만 저장되며, API 서버를 재시작하면 초기화됩니다.

## 설치

```bash
npm install
```

## 실행

API와 웹을 동시에 실행:

```bash
npm run dev
```

개별 실행:

```bash
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:3000
```

웹은 `NEXT_PUBLIC_API_URL`(기본값 `http://localhost:4000`)로 API에 접근합니다.
필요 시 `apps/web/.env.example`을 `.env.local`로 복사해 수정하세요.

## API

| 메서드 | 경로          | 설명             |
| ------ | ------------- | ---------------- |
| GET    | `/todos`      | 목록 조회        |
| POST   | `/todos`      | 생성 (`{title}`) |
| PATCH  | `/todos/:id`  | 수정 (제목/완료) |
| DELETE | `/todos/:id`  | 삭제             |
| GET    | `/health`     | 헬스 체크        |

## 검증

```bash
npm run typecheck        # 전체 워크스페이스 타입체크
npm run build            # 전체 빌드
```
