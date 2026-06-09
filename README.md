# Cladue Code 구성 요소 수업

- [Claude Code Hooks](http://github.com/Mineru98/claude-code-course/tree/course/hooks)

---

## Todo 모노레포 (테스트용)

React(TS) 프론트엔드와 Express(JS) 백엔드로 구성된 간단한 Todo 웹앱입니다.
npm workspaces 기반 모노레포입니다.

### 구조

```
.
├── package.json          # 루트 (npm workspaces)
└── packages
    ├── backend           # Express + JavaScript (포트 4000)
    │   └── src/index.js   # 인메모리 Todo CRUD API
    └── frontend          # React + TypeScript + Vite (포트 5173)
        └── src
            ├── App.tsx    # Todo UI
            └── api.ts     # API 클라이언트
```

### 실행 방법

```bash
# 1. 의존성 설치 (루트에서 한 번)
npm install

# 2. 백엔드 실행 (터미널 1)
npm run dev:backend

# 3. 프론트엔드 실행 (터미널 2)
npm run dev:frontend
```

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:4000/api/todos

Vite dev 서버가 `/api` 요청을 백엔드(4000)로 프록시합니다.

### API

| 메서드 | 경로              | 설명             |
| ------ | ----------------- | ---------------- |
| GET    | `/api/todos`      | 목록 조회        |
| POST   | `/api/todos`      | 생성 (`{title}`) |
| PATCH  | `/api/todos/:id`  | 수정 (토글/제목) |
| DELETE | `/api/todos/:id`  | 삭제             |
