# GitHub 仓库 General 设置说明

> 本文档按 Settings → General 页面从上到下的顺序，逐项说明每个设置的作用、当前状态及建议配置。

---

## Repository name（仓库名称）

**当前值：** `Example-of-Github-Repo`

仓库的唯一标识名，影响 URL、clone 地址、GitHub Pages 等。无需修改。

---

## Template repository（模板仓库）

**当前值：** ✅ 已启用

启用后，其他用户可以点击 "Use this template" 一键基于本仓库创建同目录结构的新仓库（不含提交历史）。作为通用模板仓库，此项必须开启。

---

## Default branch（默认分支）

**当前值：** `master`

所有 PR 的默认目标分支、`git clone` 后的默认检出分支。已通过 branch protection rules 保护，无需修改。

---

## Releases（发布）

### Enable release immutability（发布不可变性）

**当前值：** ⚠️ 需手动开启（GitHub API 暂不支持此字段）

启用后，已发布的 Release 的资产文件和 tag 不可被修改或覆盖。防止已发布版本被篡改，确保使用者获取到的是原始文件。

> **操作方法：** Settings → General → Releases → 勾选 **Enable release immutability**（API 不支持，只能手动操作）。

---

## Social preview（社交预览图）

**当前值：** 未上传

在 Twitter、Slack 等平台分享仓库链接时显示的预览图（建议 1280×640px）。纯工具型模板仓库可暂不设置，有品牌需求时可上传。

---

## Features（功能开关）

### Wikis

**当前值：** ☐ 未启用  
本仓库使用 `README.md` + `.github/docs/` 管理文档，无需 Wiki。保持关闭。

### Issues

**当前值：** ✅ 已启用  
Bug 跟踪与需求管理，已配置四套 Issue 模板（中英双语），保持开启。

### Sponsorships（赞助）

**当前值：** ☐ 未启用  
在仓库主页显示 "Sponsor" 按钮，对接 GitHub Sponsors 或第三方捐助渠道。个人工具仓库无需开启。

### Preserve this repository（GitHub Archive Program）

**当前值：** ✅ 已启用  
将本仓库纳入 GitHub Archive Program，定期存档到 Arctic Code Vault 等长期存储介质。公开仓库默认加入，保持开启。

### Discussions

**当前值：** ☐ 未启用  
社区问答论坛，适合开源项目替代部分 Issue。模板仓库暂无社区需求，保持关闭。

### Projects

**当前值：** ☐ 未启用  
跨仓库项目看板，适合多仓库协作的大型项目。个人仓库已禁用，保持关闭。

### Pull requests

**当前值：** ✅ 已启用，Creation allowed by: All users  
PR 功能，所有用户均可创建 PR。保持当前设置。

---

## Pull Requests（合并策略）

### Allow merge commits（允许合并提交）

**当前值：** ✅ 已启用  
将 PR 的所有提交连同一个 merge commit 合并到目标分支，保留完整的分支历史。这是本仓库唯一允许的合并方式。

#### Default commit message（merge 默认提交信息）

**当前值：** `Pull request title`（以 PR 标题作为 merge commit 信息）

### Allow squash merging（允许 squash 合并）

**当前值：** ☐ 已禁用  
squash 会将所有提交压缩为一个，丢失单独提交的上下文。已禁用。

### Allow rebase merging（允许 rebase 合并）

**当前值：** ☐ 已禁用  
rebase 会改写提交哈希，与 merge-only 策略冲突。已禁用。

### Always suggest updating pull request branches（建议更新分支）

**当前值：** ✅ 已启用

当 PR 分支落后于目标分支时，在 PR 页面展示 "Update branch" 按钮，提示贡献者先同步最新代码再合并，减少冲突。

### Allow auto-merge（允许自动合并）

**当前值：** ☐ 未启用  
启用后，PR 在满足全部 CI 检查和审核要求后可自动合并，无需手动点击。对于个人仓库意义不大，暂不启用。

### Automatically delete head branches（合并后自动删除分支）

**当前值：** ✅ 已启用  
PR 合并后自动删除来源分支，避免分支积累。已启用，符合规范。

---

## Commits（提交设置）

### Require contributors to sign off on web-based commits（网页端提交需 sign-off）

**当前值：** ✅ 已启用

通过 GitHub 网页编辑文件并提交时，需要勾选 Developer Certificate of Origin (DCO) 声明，明确贡献者对版权的授权。

### Allow comments on individual commits（允许对单个提交评论）

**当前值：** ✅ 已启用  
允许查看者对具体 commit 添加评论，有助于代码审查和讨论。保持开启。

---

## Archives（归档）

### Include Git LFS objects in archives（归档包含 LFS 对象）

**当前值：** ☐ 未启用  
下载 `.zip`/`.tar.gz` 源码包时是否包含 Git LFS 存储的大文件。本仓库未使用 LFS，保持关闭。

---

## Pushes（推送限制）

### Limit how many branches and tags can be updated in a single push（Preview）

**当前值：** ☐ 未启用  
限制单次 push 可更新的分支/tag 数量，防止批量意外推送。功能处于 Preview 阶段，本仓库已有 branch protection 保护 master，暂不启用。

---

## Issues 相关配置

### Auto-close issues with merged linked pull requests（PR 合并后自动关闭关联 Issue）

**当前值：** ✅ 已启用  
当 PR 合并且描述中含 `Closes #n` / `Fixes #n` 等关键词时，自动关闭关联的 Issue。已启用，符合规范。

---

## 本仓库配置汇总

| 功能 | 状态 |
| --- | --- |
| Template repository | ✅ 已启用 |
| Default branch | `master` |
| Release immutability | ⚠️ 需手动在 Web UI 启用 |
| Wikis | — 已禁用 |
| Issues | ✅ 已启用，已配置 4 套模板 |
| Allow merge commits | ✅ 已启用，默认信息 Pull request title |
| Allow squash merging | ✗ 已禁用 |
| Allow rebase merging | ✗ 已禁用 |
| Always suggest updating branch | ✅ 已启用 |
| Allow auto-merge | — 未启用 |
| Auto-delete head branches | ✅ 已启用 |
| Web commit sign-off | ✅ 已启用 |
| Auto-close issues on PR merge | ✅ 已启用 |
