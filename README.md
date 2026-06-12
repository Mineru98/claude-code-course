# Claude Code 구성 요소 수업 — 🤖 Agents

> Claude Code 구성 요소 학습 저장소의 `course/agents` 브랜치입니다.
> 전체 목차는 [main 브랜치](https://github.com/Mineru98/claude-code-course/tree/main)에서 확인할 수 있습니다.

Claude Code의 **Subagents(서브에이전트)**는 특정 역할에 특화된 보조 에이전트를 정의해 두고,
필요할 때 메인 대화와 분리된 컨텍스트에서 작업을 위임하는 기능입니다.
이 브랜치는 한국어 기술 문서 작성에 특화된 서브에이전트 한 개를 예제로 정의합니다.

## 구성

```
.claude
└── agents
    └── doc-writer.md      # 한국어 기술 문서 작성 서브에이전트
```

## 서브에이전트 정의 (`doc-writer`)

서브에이전트는 마크다운 파일의 프런트매터로 메타데이터를 정의하고, 본문에 시스템 프롬프트를 작성합니다.

| 항목 | 값 |
| ---- | --- |
| `name` | `doc-writer` |
| `description` | 한국어 기술 문서(README·가이드·튜토리얼 등) 작성·정리 시 사용 |
| `tools` | `Read, Write, Edit, Bash, Grep, Glob` |
| `model` | `sonnet` |

본문 시스템 프롬프트는 정확성 우선, 독자 중심 구성, 담백한 문체, 스캔 가능한 구조, 용어·말투 일관성을
작성 원칙으로 제시합니다.

## 사용 방법

- `description`에 부합하는 작업(문서 작성·정리)을 요청하면 Claude가 자동으로 이 서브에이전트에 위임할 수 있습니다.
- "doc-writer 서브에이전트로 README를 정리해줘"처럼 명시적으로 호출할 수도 있습니다.
- 서브에이전트는 자신만의 컨텍스트에서 실행되며, `tools`에 명시된 도구만 사용할 수 있습니다.

## 다른 수업

| 주제 | 브랜치 |
| ---- | ------ |
| 🪝 Hooks | [course/hooks](https://github.com/Mineru98/claude-code-course/tree/course/hooks) |
| 🤖 Agents | [course/agents](https://github.com/Mineru98/claude-code-course/tree/course/agents) |
| 👥 Agent Teams | [course/agent-teams](https://github.com/Mineru98/claude-code-course/tree/course/agent-teams) |
| 📋 Plan | [course/plan](https://github.com/Mineru98/claude-code-course/tree/course/plan) |
