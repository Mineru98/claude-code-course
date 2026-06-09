#!/usr/bin/env bash
# PreToolUse hook: Bash 도구가 `ls` 계열 명령을 실행하기 직전에 발동.
# stdin 으로 들어오는 JSON 에서 tool_input.command 를 읽어 패턴을 검사한다.
# `ls` 명령이 감지되면 permissionDecision:"deny" 를 내보내 실행을 차단한다.

here="$(cd "$(dirname "$0")" && pwd)"
log="$here/ls-hook.log"

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"

# 실행 증거: 모든 Bash 호출마다 로그 파일에 기록 (hook 자체가 도는지 확인용)
printf '[%s] PreToolUse fired. command=%q\n' "$(date '+%H:%M:%S')" "$command" >> "$log"

# 명령 시작 위치(또는 ; && || | 뒤)에 오는 `ls` 만 차단한다.
# echo "ls" 처럼 인자/문자열 안의 ls, pre-ls.sh 같은 파일명 속 ls 는 매칭하지 않는다.
if printf '%s' "$command" | grep -Eq '(^|[|;&])[[:space:]]*ls([[:space:]]|$)'; then
  printf '[%s] PreToolUse BLOCKED ls command.\n' "$(date '+%H:%M:%S')" >> "$log"
  # permissionDecision:"deny" 로 실행을 막고, 사유를 Claude 에게 전달한다.
  jq -nc \
    --arg reason "[PreToolUse hook] ls 명령은 이 프로젝트에서 차단되어 있습니다. (요청: $command)" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
fi

# ls 가 아니면 그대로 진행
exit 0
