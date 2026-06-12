# Claude Code 구성 요소 수업 — 👥 Agent Teams

> Claude Code 구성 요소 학습 저장소의 `course/agent-teams` 브랜치입니다.
> 전체 목차는 [main 브랜치](https://github.com/Mineru98/claude-code-course/tree/main)에서 확인할 수 있습니다.

**Agent Teams**는 여러 서브에이전트를 병렬·단계별로 오케스트레이션해 하나의 작업을
분석 → 구현 → 검증으로 나눠 협업시키는 방식입니다.
이 브랜치는 실습 대상인 Todo 모노레포와, 다중 에이전트로 보안·UI를 개선한 결과 보고서를 함께 담고 있습니다.

## 구성

```
.
├── .claude/agents/doc-writer.md   # 문서 작성 서브에이전트
├── packages/                      # 실습 대상 Todo 모노레포 (아래 참고)
└── reports/                       # 다중 에이전트 개선 작업 산출물
    ├── IMPROVEMENT-REPORT.md      # 보안·UI 개선 보고서
    └── screenshots/               # 개선 전/후 검증 스크린샷
```

## 다중 에이전트 오케스트레이션 예제

`reports/IMPROVEMENT-REPORT.md`는 Todo 앱을 대상으로 다음 흐름을 수행한 기록입니다.

- **병렬 분석** — 백엔드 보안과 프론트 UI/UX를 각각의 에이전트가 동시에 점검
- **구현** — 식별된 문제(보안 10건, UI/UX 18건)를 개선
- **단계별 독립 검증** — `build-verify`(빌드), `backend-verify`(curl 보안 동작), `screen-verify`(스크린샷 육안 검증) 등 별도 에이전트가 교차 검증

검증은 1차(백엔드 강화 후)·2차(프론트 개선 후)로 나눠 진행했고 전 항목을 통과했습니다.

---

## Todo 모노레포 (실습 대상)

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

## 다른 수업

| 주제 | 브랜치 |
| ---- | ------ |
| 🪝 Hooks | [course/hooks](https://github.com/Mineru98/claude-code-course/tree/course/hooks) |
| 🤖 Agents | [course/agents](https://github.com/Mineru98/claude-code-course/tree/course/agents) |
| 👥 Agent Teams | [course/agent-teams](https://github.com/Mineru98/claude-code-course/tree/course/agent-teams) |
| 📋 Plan | [course/plan](https://github.com/Mineru98/claude-code-course/tree/course/plan) |
