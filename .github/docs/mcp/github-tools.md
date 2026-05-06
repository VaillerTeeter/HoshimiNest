# GitHub MCP 工具清单

本文档列出当前工作区配置的 GitHub MCP Server（`@modelcontextprotocol/server-github`）所提供的工具。

配置文件：[`.vscode/mcp.json`](../../../.vscode/mcp.json)

---

## Issue 管理

| 工具 | 功能 |
| --- | --- |
| `mcp_github_list_issues` | 列出仓库的所有 Issues（支持过滤状态、标签等） |
| `mcp_github_get_issue` | 获取指定 Issue 的详情 |
| `mcp_github_create_issue` | 新建 Issue（支持标题、内容、标签、指派人、里程碑） |
| `mcp_github_update_issue` | 更新 Issue（标题、内容、状态、标签等） |
| `mcp_github_add_issue_comment` | 在 Issue 下添加评论 |
| `mcp_github_search_issues` | 跨仓库搜索 Issues 和 PR（支持 GitHub 搜索语法） |

---

## Pull Request 管理

| 工具 | 功能 |
| --- | --- |
| `mcp_github_list_pull_requests` | 列出仓库的所有 PR（支持过滤状态、分支等） |
| `mcp_github_get_pull_request` | 获取指定 PR 的详情 |
| `mcp_github_create_pull_request` | 创建新 PR（标题、内容、source/target 分支、draft 模式） |
| `mcp_github_merge_pull_request` | 合并 PR（支持 merge / squash / rebase 三种策略） |
| `mcp_github_update_pull_request_branch` | 将目标分支的最新提交合入 PR 分支（相当于 Update Branch） |
| `mcp_github_get_pull_request_files` | 获取 PR 变更的文件列表 |
| `mcp_github_get_pull_request_status` | 获取 PR 的 CI 状态检查结果 |
| `mcp_github_get_pull_request_reviews` | 获取 PR 的所有 Review |
| `mcp_github_get_pull_request_comments` | 获取 PR 的行内评论 |
| `mcp_github_create_pull_request_review` | 提交 PR Review（APPROVE / REQUEST_CHANGES / COMMENT，支持行内评论） |

---

## 文件与提交

| 工具 | 功能 |
| --- | --- |
| `mcp_github_get_file_contents` | 读取仓库中指定文件或目录的内容（支持指定分支） |
| `mcp_github_create_or_update_file` | 创建或更新仓库中的单个文件 |
| `mcp_github_push_files` | 一次性推送多个文件到指定分支（单次 commit） |
| `mcp_github_list_commits` | 列出分支的提交历史 |

---

## 分支与仓库

| 工具 | 功能 |
| --- | --- |
| `mcp_github_create_branch` | 创建新分支（可指定来源分支） |
| `mcp_github_create_repository` | 创建新 GitHub 仓库 |
| `mcp_github_fork_repository` | Fork 一个仓库 |

---

## 搜索

| 工具 | 功能 |
| --- | --- |
| `mcp_github_search_repositories` | 搜索 GitHub 上的仓库 |
| `mcp_github_search_code` | 在 GitHub 上搜索代码片段 |
| `mcp_github_search_users` | 搜索 GitHub 用户 |

---

## 使用说明

### Token 配置

首次使用时 VS Code 会弹出输入框，填入 `.env` 文件中的 `GH_TOKEN` 值。Token 由 VS Code 加密存储，不会写入任何配置文件。

### 写操作需要用户确认

以下写操作工具受 `PreToolUse` Hook（[`git-guard.sh`](../hooks/git-guard.md)）拦截，执行前会弹出用户确认框：

| 类型 | 工具 |
| --- | --- |
| PR 写操作 | `mcp_github_create_pull_request` / `mcp_github_merge_pull_request` / `mcp_github_create_pull_request_review` / `mcp_github_update_pull_request_branch` |
| 文件推送 | `mcp_github_push_files` / `mcp_github_create_or_update_file` |
| 分支 / 仓库 | `mcp_github_create_branch` / `mcp_github_create_repository` / `mcp_github_fork_repository` |
| Issue 写操作 | `mcp_github_create_issue` / `mcp_github_update_issue` / `mcp_github_add_issue_comment` |

只读工具（`get_*` / `list_*` / `search_*`）在 `.vscode/settings.json` 中配置为自动批准，无需确认。

### 让 Copilot 优先使用 MCP

在对话中说「用 MCP」或「通过 GitHub MCP」即可触发。
`.github/instructions/git-workflow.instructions.md` 中已包含相关规则，让 Copilot 在所有 GitHub 操作中优先使用 MCP 工具。
