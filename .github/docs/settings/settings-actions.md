# GitHub 仓库 Actions 设置说明

> 本文档对应 Settings → Code and automation → Actions → General 页面。

---

## Actions permissions（Actions 权限）

控制本仓库中的 workflow 可以使用哪些来源的 Actions 和 Reusable Workflows。

| 选项 | 说明 |
| --- | --- |
| Allow all actions and reusable workflows | 允许使用任意来源的 Action，包括第三方 |
| Disable actions | 完全禁用 Actions 功能 |
| Allow VaillerTeeter actions and reusable workflows | 仅允许本账号名下仓库的 Action |
| Allow VaillerTeeter, and select non-VaillerTeeter actions | 本账号 + 手动指定的第三方 Action |

**当前值：** Allow all actions and reusable workflows

**建议：** 改为第四项（Allow VaillerTeeter, and select non-VaillerTeeter...），并手动指定已审查的可信 Action（如 `actions/*`、`DavidAnson/*`、`ibiqlik/*`等），防止恶意第三方 Action 在 workflow 中执行。但对于模板仓库，为降低使用门槛，保持全部允许亦可接受。

### Require actions to be pinned to a full-length commit SHA（要求 Action 固定到完整 SHA）

**当前值：** ☐ 未启用

启用后，workflow 文件中引用 Action 必须使用完整的 40 位 commit SHA（如 `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`），而不能使用 tag 或 branch 名（如 `@v4`、`@main`）。

**优点：** 防止 Action 发布者替换 tag 指向恶意版本（供应链攻击）。  
**缺点：** SHA 不直观，且 Dependabot 无法自动更新 SHA 固定版本（实际上 Dependabot 支持更新 SHA，但需要手动确认）。

**建议：** 个人仓库中使用知名官方 Action，风险可控，暂不强制，保持关闭。

---

## Artifact and log retention（构建产物与日志保留期）

**当前值：** 90 天（账号级最大值）

Actions 运行产生的日志文件和上传产物（Artifacts）的保留天数，到期后自动删除。本仓库 lint workflow 不上传 Artifact，日志 90 天后自动清理，无需修改。

---

## Cache（缓存）

### Cache retention（缓存保留期）

**当前值：** 7 天

Actions 缓存（如依赖包缓存）在最后一次访问后 7 天内未被使用则自动删除。本仓库 workflow 未使用缓存，保持默认值。

### Cache size eviction limit（缓存容量上限）

**当前值：** 10 GB

仓库缓存总容量上限，超出后按最近最少使用（LRU）策略淘汰旧缓存。本仓库未使用缓存，保持默认值。

---

## Approval for running fork pull request workflows from contributors（Fork PR 的 workflow 审批策略）

控制来自 Fork 仓库的 PR 在触发 workflow 时是否需要手动审批，防止陌生贡献者的 PR 自动运行恶意 workflow 并读取仓库 Secrets。

| 选项 | 说明 |
| --- | --- |
| Require approval for first-time contributors who are new to GitHub | 仅对 GitHub 新账号（从未有 commit/PR 合并记录）要求审批 |
| Require approval for first-time contributors | 在本仓库第一次贡献的用户都需审批（默认推荐） |
| Require approval for all external contributors | 所有非成员/Owner 的用户每次 PR 都需审批 |

**当前值：** Require approval for first-time contributors ✅

在本仓库首次提交 PR 的用户需手动审批才能触发 workflow，老贡献者免审批。此为 GitHub 推荐的默认值，平衡安全性与贡献体验，无需修改。

---

## Workflow permissions（Workflow 默认权限）

设置 `GITHUB_TOKEN` 在 workflow 中的默认权限级别，可在具体 workflow YAML 中通过 `permissions:` 字段覆盖。

| 选项 | 说明 |
| --- | --- |
| Read and write permissions | 所有 scope 均可读写，风险较高 |
| Read repository contents and packages permissions | 仅 contents 和 packages 可读，其余默认禁止 |

**当前值：** Read repository contents and packages permissions ✅

最小权限原则，与 `lint.yml` 中已声明的 `permissions: contents: read` 保持一致，无需修改。

### Allow GitHub Actions to create and approve pull requests

**当前值：** ☐ 未启用

允许 workflow 通过 `GITHUB_TOKEN` 自动创建 PR 或 Approve PR。除非有自动化发布等明确需求，否则应保持关闭，防止 CI 绕过人工审查自动合并代码。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Actions permissions | Allow all actions | 模板仓库保持宽松，实际项目可收紧 |
| Fork PR workflow approval | ✅ Require first-time contributors | GitHub 推荐默认值 |
| Artifact & log retention | 90 天 | 账号最大值，无需修改 |
| Cache retention | 7 天 | 未使用缓存，默认即可 |
| Workflow permissions | ✅ Read-only（contents: read） | 最小权限原则 |
| Allow Actions to create PRs | — 未启用 | 无自动化发布需求 |
