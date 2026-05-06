# Settings → Copilot

Settings → Copilot 包含三个子页面：Code review、Cloud agent、Memory。

---

## 1. Code review

### General settings

#### Use custom instructions when reviewing pull requests

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **On（启用）** |
| 作用 | Copilot 在 Review PR 时读取仓库 `.github/instructions/` 目录下的指令文件（如 `git-workflow.instructions.md`），依据其中定义的规范和约定给出审查意见 |

此开关应保持启用。

### Manage Copilot code review automations

通过 Ruleset 配置自动触发 Copilot Review 的规则（例如 PR 创建时自动请求 Copilot 作为 Reviewer）。

| 属性 | 说明 |
| --- | --- |
| 当前状态 | No rulesets（未配置） |
| 配置方式 | 点击 "Create ruleset for default branch" 或在 Settings → Rules 中配置 |

**本仓库配置**：模板仓库无需自动触发，保持未配置状态。实际项目可按需创建 Ruleset 实现自动 Review。

---

## 2. Cloud agent

Copilot Cloud Agent 是一个自主编码 Agent：将 Issue 指派给 Copilot 后，它独立分析任务、编写代码、运行验证，最后发起 PR 请求人工 Review。

```text
Issue 分配给 Copilot → Agent 编码 → 自我验证 → 发起 PR → 人工 Review → 迭代
```

### Internet access（网络访问控制）

限制 Agent 在代码生成和执行期间可访问的网络资源，防止数据外泄。

| 选项 | 推荐 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| **Enable firewall** | ✅ 推荐 | On | 限制 Agent 只能访问白名单内的地址 |
| **Recommended allowlist** | ✅ 推荐 | On | 自动放行安装工具、包管理器（npm、PyPI、apt 等）所需的常用地址 |
| **Custom allowlist** | 按需 | 未配置 | 手动添加额外域名、IP 或 URL |

### Actions workflow approval（工作流审批）

| 选项 | 推荐 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| **Require approval for workflow runs** | ✅ 推荐 | On | Copilot 推送代码后，须由具有 write 权限的维护者批准才能触发 Actions |

> **重要**：此选项应始终保持启用。关闭后，Copilot 生成的未经人工审查的代码可能在 Actions 中运行并获得对仓库或 Actions Secrets 的写访问权限。

### Validation tools（提交前自我验证）

Agent 在请求人工 Review 前，会先运行以下工具对自身工作进行验证：

| 工具 | 推荐 | 当前状态 | 用途 |
| --- | --- | --- | --- |
| **CodeQL code scanning** | ✅ 推荐 | On | 使用 CodeQL 扫描安全漏洞 |
| **Copilot code review** | ✅ 推荐 | On | 使用 Copilot Code Review 识别代码质量问题 |
| **Secret scanning** | ✅ 推荐 | On | 检测误提交的密钥和凭证 |
| **Dependency vulnerability checks** | ✅ 推荐 | On | 对照 GitHub Advisory Database 检查新增依赖的已知漏洞 |

所有推荐项均已启用，无需改动。

### Model Context Protocol (MCP)

MCP 允许通过接入外部工具服务扩展 Agent 能力。

| 属性 | 说明 |
| --- | --- |
| 默认启用 | GitHub MCP Server、Playwright MCP Server |
| GitHub MCP | 让 Agent 可操作仓库（Issues、PRs、文件等） |
| Playwright MCP | 让 Agent 可控制浏览器进行端到端测试 |
| 自定义 MCP | 通过 JSON 配置添加自定义 MCP Server |
| Secrets 访问 | MCP Server 可读取仓库 `copilot` Environment 下的 Secrets |

**MCP configuration（当前配置）**：

```json
{
  "mcpServers": {
  }
}
```

无自定义 MCP Server，保持默认即可。

**本仓库配置**：所有推荐设置已正确启用，无需额外操作。

---

## 3. Memory（Preview）

> **Preview 功能** — 界面和行为可能随时变动。

### 功能说明

Copilot Memory 是仓库级别的 AI 记忆库：Copilot 在 Code Review、Agent 任务等工作过程中，自动提炼并记录关于仓库的关键事实；在后续的审查和代码建议中复用这些上下文，提升回复的准确性和一致性。

### 当前记忆条目

| 内容 | 标签 |
| --- | --- |
| GitHub CLI auth is configured via GH_TOKEN loaded from a root .env file (based on .env.example). | `authentication` `Copilot Code Review` `Caching<gpt-3.2>` |

此条目由 Copilot 在之前的工作过程中自动归纳，内容准确，**保留**。

---

## 本仓库配置汇总

| 功能 | 状态 |
| --- | --- |
| Code review 自定义指令 | ✅ 已启用 |
| Code review 自动触发 Ruleset | — 未配置（模板仓库无需） |
| Cloud agent 防火墙 | ✅ 已启用 |
| Cloud agent 工作流审批 | ✅ 已启用 |
| Cloud agent 验证工具（全部 4 项） | ✅ 全部已启用 |
| Cloud agent MCP 配置 | 默认（GitHub + Playwright MCP） |
| Memory | ✅ 运行中（1 条记忆） |
