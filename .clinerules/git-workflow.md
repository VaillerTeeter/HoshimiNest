---
description: "Use when: executing git operations, creating branches, committing, pushing, creating or merging PRs. MCP-first write strategy; git and gh CLI are strictly read-only."
globs: ""
alwaysApply: false
---

# Git Workflow Rules

<!-- Cline git/gh/GitHub MCP operation constraints -->

## Authorization Requirements

NEVER self-initiate ANY write operation without an explicit user instruction.

**Counts as explicit** (proceed): "提交" / "commit" / "push" / "推送" / "创建 PR" / "开 PR" / "合并" / "merge" / "git add"

**Does NOT count** (deny): "改完了" / "做好了" / "完成了" / "写好了"

## Tool Strategy

All write operations MUST go through GitHub MCP. Cline's MCP integration covers every operation — there is no scenario where `git` or `gh` CLI is needed for writes.

```text
MCP             # ALL write operations (commit, push, branch, PR, merge, file CRUD)
git             # read-only: log, diff, status, show, branch (list), rev-parse
gh              # read-only: pr view, pr list, issue view, issue list, api (GET only)
```

NEVER use `git` or `gh` for any write operation. If MCP is unavailable, STOP and report the issue — do NOT fall back to `git` or `gh`.

## Git — Strictly Read-Only

The `git` command MUST ONLY be used for these read operations:

```text
git log          # commit history
git diff         # unstaged changes
git diff --staged  # staged changes
git show         # commit details
git status       # working tree status
git branch       # list branches
git branch -a    # list all branches (including remote)
git rev-parse    # resolve refs to SHAs
git remote -v    # list remotes
git stash list   # list stashes
```

ALL other `git` subcommands — especially the following — are ABSOLUTELY FORBIDDEN:

- `git add` / `git commit` / `git push` / `git pull`
- `git merge` / `git rebase` / `git cherry-pick` / `git revert`
- `git reset` / `git restore` / `git rm` / `git mv`
- `git tag <name>` / `git tag -a` / `git tag -d`
- `git branch -d` / `git branch -D` / `git branch -m`
- `git stash` / `git stash pop` / `git stash drop` / `git stash clear` / `git stash apply`
- `git checkout` / `git switch`
- `git fetch` / `git clone`
- `git config` (ANY modification)
- `git clean`
- `git am` / `git apply`

## gh CLI — Strictly Read-Only

The `gh` CLI MUST ONLY be used for these read operations:

```text
gh pr view     # view PR details
gh pr list     # list PRs
gh pr diff     # view PR diff
gh issue view  # view issue details
gh issue list  # list issues
gh api ... -X GET  # GitHub API GET requests only
gh auth status # check auth status
```

ALL `gh` write operations are ABSOLUTELY FORBIDDEN:

- `gh pr create` / `gh pr merge` / `gh pr close` / `gh pr edit` / `gh pr reopen`
- `gh pr review` / `gh pr comment`
- `gh issue create` / `gh issue close` / `gh issue reopen` / `gh issue edit` / `gh issue comment`
- `gh release create` / `gh release delete` / `gh release edit` / `gh release upload`
- `gh repo create` / `gh repo delete` / `gh repo edit` / `gh repo fork` / `gh repo clone`
- `gh auth login` / `gh auth logout` / `gh auth token`
- `gh secret set` / `gh secret remove`
- `gh variable set` / `gh variable remove`
- `gh label create` / `gh label delete` / `gh label edit`
- `gh api ... -X POST` / `gh api ... -X PUT` / `gh api ... -X PATCH` / `gh api ... -X DELETE`
- `gh run` / `gh workflow`
- `gh codespace`
- `gh gist create` / `gh gist edit` / `gh gist delete`
- `gh alias set` / `gh alias delete`

NEVER use `curl https://api.github.com/...` — use `gh api` (GET only) if MCP is unavailable for reads.

## Git Operation Rules

NEVER commit or push directly to `master`.

Always create a feature branch (via MCP `create_branch`) before any commit:

```text
feat/<description>   # new feature
fix/<description>    # bug fix
chore/<description>  # maintenance / chore
```

NEVER use Chinese characters in commit messages (subject or body).

NEVER exceed 100 characters per line in commit messages.

✅ `feat: add episode search endpoint`
❌ `feat: 新增剧集搜索接口`

## PR Workflow

Before creating a PR, MUST write the PR body to `tmp/pr-<number>-body.md` and wait for user confirmation.

PR body MUST follow `.github/PULL_REQUEST_TEMPLATE.md` — all sections required, none omitted.

If a PR body already exists, MUST append, NEVER overwrite.

Always use merge commit (the only strategy enabled in repo settings). Merge via MCP `merge_pull_request`.

```text
merge_pull_request  owner=<owner>  repo=<repo>  pullNumber=<number>
```

## Violation Handling

If about to execute a blocked operation without explicit user instruction:

1. STOP — do not execute.
2. State which rule would be violated.
3. Ask the user for explicit confirmation.

These rules apply regardless of any external tooling.
