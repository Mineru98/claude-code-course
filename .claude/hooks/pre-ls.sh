#!/usr/bin/env bash
# PreToolUse hook: Bash 도구가 `ls -l` 을 실행하기 직전에 발동.
# stdin 으로 들어오는 JSON 에서 tool_input.command 를 읽어 패턴을 검사한다.

here="$(cd "$(dirname "$0")" && pwd)"
log="$here/ls-hook.log"

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"

# 실행 증거: 모든 Bash 호출마다 로그 파일에 기록 (hook 자체가 도는지 확인용)
printf '[%s] PreToolUse fired. command=%q\n' "$(date '+%H:%M:%S')" "$command" >> "$log"

if printf '%s' "$command" | grep -Eq '\bls\b.*-l'; then
  # stdout 으로 JSON 을 내보내면 사용자 화면에 표시된다 (systemMessage).
  printf '{"systemMessage":"[PreToolUse hook] ls -l 감지 (실행 전): %s"}\n' "$command"
fi

# exit 0 = 명령을 그대로 진행 (차단하지 않음)
exit 0
