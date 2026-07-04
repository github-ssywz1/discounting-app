#!/bin/bash
# check-gate.sh — 门禁检查脚本
# 由 Claude Code PreToolUse hook 调用，拦截 git commit
# 检查 .claude/.test-result 和 .claude/.quality-result 是否都是 PASS

PROJECT_DIR="${CLAUDE_PROJECT_DIR}"
INPUT=$(cat)

# 从 stdin JSON 中提取 command 字段（不依赖 jq，用 sed）
COMMAND=$(echo "$INPUT" | sed -n 's/.*"command":"\([^"]*\)".*/\1/p')

# 不是 git commit 命令 → 直接放行
if ! echo "$COMMAND" | grep -qE '(^|;|&&|\|\|)\s*git commit|^git commit'; then
  exit 0
fi

TEST_RESULT="${PROJECT_DIR}/.claude/.test-result"
QUALITY_RESULT="${PROJECT_DIR}/.claude/.quality-result"

MISSING=""

if [ ! -f "$TEST_RESULT" ] || [ "$(cat "$TEST_RESULT" 2>/dev/null)" != "PASS" ]; then
  MISSING="${MISSING} [单元测试]"
fi

if [ ! -f "$QUALITY_RESULT" ] || [ "$(cat "$QUALITY_RESULT" 2>/dev/null)" != "PASS" ]; then
  MISSING="${MISSING} [代码质量检查]"
fi

if [ -n "$MISSING" ]; then
  echo "🚫 git commit 被门禁拦截！以下检查未通过:${MISSING}" >&2
  echo "请通过 gitcommit-agent 提交（说"提交"即可），或先运行 tester 和 quality-engineer。" >&2
  exit 2
fi

# 全部通过，放行前立刻删除通行证（一次性使用）
rm -f "$TEST_RESULT" "$QUALITY_RESULT"
exit 0
