#!/usr/bin/env bash
# git-guard.sh — PreToolUse hook
# 拦截 AI 未经授权执行的 git 写操作
# 触发时向用户弹出确认，而非静默执行

set -euo pipefail

# python3 是本脚本的硬性依赖；缺失时 fall-back 到保守 ask 而非静默失效
emit_conservative_ask() {
  local reason="${1:-python3 is required by git-guard.sh but is unavailable or invalid}"
  local escaped_reason="$reason"
  escaped_reason=${escaped_reason//\\/\\\\}
  escaped_reason=${escaped_reason//\"/\\\"}
  escaped_reason=${escaped_reason//$'\n'/\\n}
  escaped_reason=${escaped_reason//$'\r'/\\r}
  escaped_reason=${escaped_reason//$'\t'/\\t}
  printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"$escaped_reason\"}}"
  exit 0
}

if ! command -v python3 >/dev/null 2>&1; then
  emit_conservative_ask "python3 is required by git-guard.sh but is not installed"
fi

if ! python3 -c 'pass' >/dev/null 2>&1; then
  emit_conservative_ask "python3 is required by git-guard.sh but failed a runtime check"
fi

INPUT=$(cat)

# 提取 toolName 和 command（兼容解析失败的情况）
TOOL_NAME=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('toolName', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

COMMAND=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('toolInput', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

# ── 分支 1：run_in_terminal（git / gh CLI）────────────────────────────────────
if [ "$TOOL_NAME" = "run_in_terminal" ]; then

  # 将命令按 shell 操作符（&&、||、;、|、换行）拆分为独立片段，逐段检测
  # 用 shlex 分词后跳过 git/gh 全局选项，再检测子命令，防止通过
  # git -C <dir> commit 或 gh -R owner/repo pr merge 等方式绕过拦截
  REASON=$(COMMAND="$COMMAND" python3 -c "
import os, re, shlex, sys

def fail_closed_on_unhandled_exception(exc_type, exc, tb):
    try:
        sys.stdout.write('命令解析失败，保守拦截\n')
        sys.stdout.flush()
    finally:
        os._exit(0)

sys.excepthook = fail_closed_on_unhandled_exception

cmd = os.environ.get('COMMAND', '')

env_assign_re = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*=.*$')

def split_shell_segments(command):
    # 使用 shlex 感知引号地按 shell 操作符（&&、||、;、|、&、换行）拆分命令
    # 引号内的操作符不触发拆分，避免对引号包裹的 -c 参数误拆
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=';|&\n')
        lexer.whitespace = ' \t\r'  # 从空白集合中移除 \n，使其作为操作符 token 被正确发射
        lexer.whitespace_split = True
        raw_tokens = list(lexer)
    except ValueError:
        print('命令含不匹配引号或无法安全解析，保守拦截')
        sys.exit(0)
    operator_tokens = {'&&', '||', ';', '|', '&', '\n'}
    segs, current = [], []
    for tok in raw_tokens:
        if tok in operator_tokens:
            if current:
                segs.append(current)
                current = []
        else:
            current.append(tok)
    if current:
        segs.append(current)
    return segs

def strip_env_assignments(tokens):
    idx = 0
    while idx < len(tokens) and env_assign_re.match(tokens[idx]):
        idx += 1
    return tokens[idx:]

# env / command / sudo / xargs 等包装命令本身不是目标工具，需剥离后再检测
WRAPPER_CMDS = {'env', 'command', 'sudo', 'xargs'}
# bash/sh/zsh 等 shell 包装命令：遇到 -c 时递归解析其后的命令字符串
SHELL_CMDS = {'bash', 'sh', 'zsh', 'dash'}
# 每个包装命令中需要跳过其后一个参数的标志（否则参数值会被误识别为工具名）
WRAPPER_FLAGS_WITH_VALUE = {
    'sudo':    {'-u', '--user', '-g', '--group', '-p', '--prompt', '-C', '--chdir',
                '-c', '-r', '--role', '-t', '--type', '-U', '--other-user', '-T'},
    'env':     {'-u', '--unset', '-C', '--chdir', '-S', '--split-string'},
    'xargs':   {'-I', '-n', '--max-args', '-P', '--max-procs', '-s', '--max-chars',
                '-a', '--arg-file', '-d', '--delimiter', '-E', '-L', '--max-lines'},
    'command': set(),
}

def strip_wrappers(tokens):
    # 跳过 env/command/sudo/xargs 等包装命令及其标志，找到真正的可执行文件
    while tokens:
        head = tokens[0].lower()
        if head in SHELL_CMDS:
            # 在剩余 token 中寻找 -c，其后的 token 是要执行的 shell 字符串
            i = 1
            while i < len(tokens):
                tok = tokens[i]
                # 匹配独立的 -c 或合并标志中含 c（如 -lc、-ic）
                is_c_flag = (tok == '-c') or (tok.startswith('-') and not tok.startswith('--') and 'c' in tok[1:])
                if is_c_flag and i + 1 < len(tokens):
                    # 递归分析 -c 后的命令字符串
                    inner_cmd = tokens[i + 1]
                    for iseg_tokens in split_shell_segments(inner_cmd):
                        itokens = strip_env_assignments(iseg_tokens)
                        yield from strip_wrappers(itokens)
                    return
                if not tokens[i].startswith('-'):
                    break
                i += 1
            # 没有 -c，shell 本身不是写操作目标，停止
            return
        if head not in WRAPPER_CMDS:
            break
        value_flags = WRAPPER_FLAGS_WITH_VALUE.get(head, set())
        tokens = tokens[1:]
        # 跳过包装命令自身的标志和对应参数即可
        while tokens:
            tok = tokens[0]
            if not tok.startswith('-'):
                break
            tokens = tokens[1:]                  # 消耗标志本身
            if tok in value_flags:
                if tokens:                       # 消耗该标志的参数值
                    tokens = tokens[1:]
            # --flag=value 形式已包含在 tok 中，无需额外处理
        # 剥离包装命令后可能跟随的 VAR=val 形式（env VAR=val git push）
        while tokens and env_assign_re.match(tokens[0]):
            tokens = tokens[1:]
    if tokens:
        yield tokens

def skip_git_global_options(tokens):
    idx = 1
    flags_with_value = {
        '-C', '--git-dir', '--work-tree', '--namespace',
        '--exec-path', '--super-prefix', '--config-env', '-c',
    }
    flags_without_value = {
        '--bare', '--no-pager', '--paginate', '--no-replace-objects',
        '--help', '-p', '-P', '--version',
    }
    while idx < len(tokens):
        tok = tokens[idx]
        if tok == '--':
            idx += 1
            break
        if tok in flags_with_value:
            idx += 2
            continue
        if (
            tok.startswith('--git-dir=')
            or tok.startswith('--work-tree=')
            or tok.startswith('--namespace=')
            or tok.startswith('--exec-path=')
            or tok.startswith('--super-prefix=')
            or tok.startswith('--config-env=')
            or (tok.startswith('-C') and tok != '-C')
            or (tok.startswith('-c') and tok != '-c')
        ):
            idx += 1
            continue
        if tok in flags_without_value:
            idx += 1
            continue
        if tok.startswith('-'):
            idx += 1
            continue
        break
    return tokens[idx:]

def skip_gh_global_options(tokens):
    idx = 1
    flags_with_value = {'-R', '--repo', '--hostname', '--config-dir'}
    flags_without_value = {'--help', '-h', '--version'}
    while idx < len(tokens):
        tok = tokens[idx]
        if tok == '--':
            idx += 1
            break
        if tok in flags_with_value:
            idx += 2
            continue
        if (
            tok.startswith('--repo=')
            or tok.startswith('--hostname=')
            or tok.startswith('--config-dir=')
        ):
            idx += 1
            continue
        if tok in flags_without_value:
            idx += 1
            continue
        if tok.startswith('-'):
            idx += 1
            continue
        break
    return tokens[idx:]

def inspect_tokens(tokens):
    if not tokens:
        return
    # Normalize: strip leading backslash, normalize Windows separators,
    # take basename, then strip .exe suffix.
    # This prevents bypasses like /usr/bin/git, C:\Program Files\Git\bin\git.exe,
    # .\git.exe, git.exe, or \git.
    tool_raw = tokens[0].lstrip('\\').replace('\\', '/')
    tool = os.path.basename(tool_raw).lower()
    if tool.endswith('.exe'):
        tool = tool[:-4]
    if not tool:
        return
    if tool == 'git':
        rest = skip_git_global_options(tokens)
        if not rest:
            return
        subcmd = rest[0].lower()
        next_arg = rest[1].lower() if len(rest) > 1 else ''
        if subcmd in {'add', 'commit', 'push', 'reset', 'restore', 'rm', 'merge', 'rebase', 'cherry-pick'}:
            print('git 写操作 / 历史变更操作')
            sys.exit(0)
        if subcmd == 'tag':
            # 扫描所有参数：含写标志则拦截；无任何 - 标志但有位置参数则为隐式创建，也拦截
            tag_write_flags = {'-a', '--annotate', '-d', '--delete', '-f', '--force',
                               '-s', '--sign', '-m', '--message', '-u', '--local-user',
                               '-F', '--file'}
            tag_args_lower = [a.lower() for a in rest[1:]]
            if any(a in tag_write_flags for a in tag_args_lower):
                print('git tag 写操作（创建/删除标签）')
                sys.exit(0)
            # git tag <name> 或 git tag <name> <commit>（无任何 - 标志）→ 隐式创建
            has_any_flag = any(a.startswith('-') for a in tag_args_lower)
            has_positional = any(not a.startswith('-') for a in tag_args_lower)
            if not has_any_flag and has_positional:
                print('git tag 写操作（创建/删除标签）')
                sys.exit(0)
        if subcmd == 'branch':
            branch_args = [a.lower() for a in rest[1:]]
            if any(a in {'-d', '-D', '--delete'} for a in branch_args):
                print('git 删除分支')
                sys.exit(0)
        if subcmd == 'stash':
            # 在所有参数中找第一个非标志参数作为 stash 子命令
            stash_verb = next((a.lower() for a in rest[1:] if not a.startswith('-')), '')
            if stash_verb in {'drop', 'pop', 'clear'}:
                print('git stash 销毁操作')
                sys.exit(0)
    elif tool == 'gh':
        rest = skip_gh_global_options(tokens)
        if len(rest) >= 2 and rest[0].lower() == 'pr' and rest[1].lower() in {'create', 'merge', 'close', 'edit'}:
            print('gh PR 操作（create/merge/close/edit）')
            sys.exit(0)
        if len(rest) >= 2 and rest[0].lower() == 'release' and rest[1].lower() == 'create':
            print('gh release create（创建发布版本）')
            sys.exit(0)
        if len(rest) >= 2 and rest[0].lower() == 'repo' and rest[1].lower() == 'delete':
            print('gh repo delete（删除仓库）')
            sys.exit(0)
        if len(rest) >= 2 and rest[0].lower() == 'issue' and rest[1].lower() in {'close', 'delete'}:
            print('gh issue close/delete')
            sys.exit(0)

for seg_tokens in split_shell_segments(cmd):
    tokens = strip_env_assignments(seg_tokens)
    # strip_wrappers 是生成器，每次 yield 一组有效 token；shell -c 场景下递归展开内层命令
    for toks in strip_wrappers(tokens):
        inspect_tokens(toks)
" 2>/dev/null)

  [ -z "$REASON" ] && exit 0

# ── 分支 2：GitHub MCP 写操作 ──────────────────────────────────────────────────
elif printf '%s' "$TOOL_NAME" | grep -qiE '^mcp_github_((create|merge|push|update)_.+|fork_repository|add_issue_comment)$'; then

  # 提取关键参数作为摘要展示
  COMMAND=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ti = d.get('toolInput', {})
    keys = ['title', 'path', 'branch', 'base', 'head', 'pull_number', 'issue_number', 'owner', 'repo']
    parts = [f'{k}={str(ti[k])[:60]}' for k in keys if k in ti]
    print(', '.join(parts) if parts else '(无参数摘要)')
except Exception:
    print('(解析失败)')
" 2>/dev/null || echo "(解析失败)")

  REASON="GitHub MCP 写操作: $TOOL_NAME"

else
  exit 0
fi

REASON="$REASON" COMMAND="$COMMAND" python3 -c "
import json, os
reason = os.environ.get('REASON', '')
command = os.environ.get('COMMAND', '')
output = {
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'ask',
        'permissionDecisionReason': (
            '⛔ 检测到需要用户明确授权的操作\n'
            '类型: ' + reason + '\n'
            '命令: ' + command + '\n\n'
            '根据项目规范，AI 不得自行发起此类操作。\n'
            '请确认：你是否已明确指示执行此命令？'
        )
    }
}
print(json.dumps(output))
"
exit 0
