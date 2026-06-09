#!/usr/bin/env bash
# PostToolUse hook: Bash 도구가 `ls -l` 을 실행한 직후에 발동.
# stdin 으로 들어오는 JSON 에서 tool_input.command 를 읽어 패턴을 검사한다.

here="$(cd "$(dirname "$0")" && pwd)"
log="$here/ls-hook.log"

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"

printf '[%s] PostToolUse fired. command=%q\n' "$(date '+%H:%M:%S')" "$command" >> "$log"

if printf '%s' "$command" | grep -Eq '\bls\b.*-l'; then
  printf '{"systemMessage":"[PostToolUse hook] ls -l 실행 완료 (실행 후): %s"}\n' "$command"
fi

exit 0
