# Claude Code 구성 요소 수업 — 🪝 Hooks

> Claude Code 구성 요소 학습 저장소의 `course/hooks` 브랜치입니다.
> 전체 목차는 [main 브랜치](https://github.com/Mineru98/claude-code-course/tree/main)에서 확인할 수 있습니다.

Claude Code의 **Hooks**는 도구 실행 같은 특정 시점에 셸 명령을 자동으로 실행하는 기능입니다.
이 브랜치는 `Bash` 도구로 `ls` 계열 명령을 실행할 때 훅이 어떻게 끼어드는지를 예제로 보여줍니다.

## 구성

```
.claude
├── settings.json          # 훅 등록 (PreToolUse / PostToolUse)
└── hooks
    ├── pre-ls.sh          # ls -l 감지 시 안내 메시지 표시
    ├── pre-ls-deny.sh     # ls 명령 실행을 차단(deny)
    └── post-ls.sh         # ls -l 실행 직후 안내 메시지 표시
```

`settings.json`에는 `Bash` 도구를 대상으로 다음 두 훅이 등록되어 있습니다.

| 이벤트 | 실행 스크립트 | 동작 |
| ------ | ------------- | ---- |
| `PreToolUse` | `pre-ls-deny.sh` | 명령 시작 위치의 `ls`를 감지하면 `permissionDecision: "deny"`로 실행을 차단 |
| `PostToolUse` | `post-ls.sh` | `ls -l` 실행이 끝난 직후 `systemMessage`로 알림 표시 |

## 동작 방식

- 훅은 stdin으로 받은 JSON에서 `tool_input.command`를 읽어 패턴을 검사합니다.
- stdout으로 `{"systemMessage": ...}`를 내보내면 사용자 화면에 메시지가 표시됩니다.
- `PreToolUse`에서 `permissionDecision: "deny"`를 내보내면 명령 실행이 차단되고, 사유(`permissionDecisionReason`)가 Claude에게 전달됩니다.
- 모든 호출은 `.claude/hooks/ls-hook.log`에 기록되어 훅이 실제로 동작하는지 확인할 수 있습니다.
- 패턴은 명령 시작 위치(또는 `;`, `&&`, `||`, `|` 뒤)의 `ls`만 매칭하므로 `echo "ls"`나 `pre-ls.sh` 같은 파일명 속 `ls`는 차단하지 않습니다.

> `pre-ls.sh`는 차단 없이 감지만 하는 참고용 스크립트로, 현재 `settings.json`에는 `pre-ls-deny.sh`가 등록되어 있습니다.

## 다른 수업

| 주제 | 브랜치 |
| ---- | ------ |
| 🪝 Hooks | [course/hooks](https://github.com/Mineru98/claude-code-course/tree/course/hooks) |
| 🤖 Agents | [course/agents](https://github.com/Mineru98/claude-code-course/tree/course/agents) |
| 👥 Agent Teams | [course/agent-teams](https://github.com/Mineru98/claude-code-course/tree/course/agent-teams) |
| 📋 Plan | [course/plan](https://github.com/Mineru98/claude-code-course/tree/course/plan) |
