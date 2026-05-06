# GitHub 仓库 Branches 设置说明

> 本文档对应 Settings → Code and automation → Branches 页面，说明分支保护规则的所有选项及当前配置。

---

## 概览

本页面管理 **Branch protection rules（分支保护规则）**，防止对重要分支的意外修改。

当前已为 `master` 分支配置保护规则，覆盖 1 个分支。

> **关于 Repository Rules（Rulesets）**
>
> GitHub 页面顶部提示 Rulesets 是分支保护的新一代替代方案，支持规则分层、evaluate 模式和组织级策略。目前本仓库使用经典 Branch protection rules，功能已满足需求，暂不迁移。

---

## master 分支保护规则详情

### Branch name pattern（分支名称匹配模式）

**当前值：** `master`

使用字符串或通配符匹配目标分支，规则对所有匹配的分支生效。

---

## Protect matching branches（保护匹配分支）

### Require a pull request before merging（合并前必须通过 PR）

**当前值：** ✅ 已启用

所有代码变更必须通过 Pull Request 才能合并到 master，禁止直接 push。这是防止未经审查的代码进入主分支的核心保护。

#### Require approvals（需要审批）

**当前值：** ☐ 未启用

要求至少 N 个人 Approve PR 才能合并。个人仓库无协作者，开启无实际意义，保持关闭。

#### Dismiss stale pull request approvals when new commits are pushed（新提交废除旧 Approve）

**当前值：** ✅ 已启用

PR 获得 Approve 后，若又推送了新提交，原有的 Approve 自动作废，需重新审批。防止审批后偷偷修改代码再合并。

#### Require review from Code Owners（需要 CODEOWNERS 审批）

**当前值：** ☐ 未启用

如果 PR 涉及 `CODEOWNERS` 文件中定义的文件，需要对应 owner 审批。本仓库未配置 CODEOWNERS 文件，保持关闭。

#### Require approval of the most recent reviewable push（需要审批最新推送）

**当前值：** ☐ 未启用

要求 PR 中最后一次推送必须由他人审批（不能自己批准自己的最新推送）。个人仓库无需启用。

---

### Require status checks to pass before merging（合并前必须通过状态检查）

**当前值：** ✅ 已启用

PR 合并前必须通过指定的 CI 检查，防止有问题的代码合入主分支。

#### Require branches to be up to date before merging（要求分支与目标分支保持同步）

**当前值：** ✅ 已启用（Strict 模式）

PR 合并前必须先将目标分支的最新代码合并到 PR 分支，确保 CI 检查基于最新代码运行，而不是过时的基准。

#### Status checks that are required（必须通过的状态检查）

**当前值：**

| 检查名称 | 来源 |
| --- | --- |
| Markdown Lint | any source |
| YAML Lint | any source |

由 `.github/workflows/lint.yml` 定义，PR 合并前两项检查必须全部通过。

---

### Require conversation resolution before merging（合并前必须解决所有对话）

**当前值：** ✅ 已启用

PR 中所有 review 评论必须被标记为 Resolved 后才能合并，防止遗漏未处理的审查意见。

---

### Require signed commits（要求签名提交）

**当前值：** ☐ 未启用

要求推送到此分支的所有 commit 必须包含 GPG/SSH 签名，验证提交者身份的真实性。

**建议：** 若需要更严格的提交溯源，可开启。个人仓库可按需决定，暂不启用。

---

### Require linear history（要求线性历史）

**当前值：** ☐ 未启用

禁止 merge commit 进入此分支，只允许 squash merge 或 rebase merge，强制保持线性提交历史。

**注意：** 本仓库已在 General 设置中禁用了 squash merge 和 rebase merge，只保留 merge commit；若启用此项，将直接禁止 merge commit，与当前仅允许 merge commit 的合并策略冲突，因此应保持关闭。

---

### Require deployments to succeed before merging（要求部署成功后才能合并）

**当前值：** ☐ 未启用

要求指定的部署环境（Environment）成功部署后才能合并。本仓库无部署流程，保持关闭。

---

### Lock branch（锁定分支）

**当前值：** ☐ 未启用

将分支设为只读，任何人（包括管理员）都无法推送新提交。适用于已归档、不再接受变更的历史版本分支。master 分支不应锁定。

---

### Do not allow bypassing the above settings（不允许绕过以上规则）

**当前值：** ☐ 未启用

启用后，以上所有保护规则对仓库管理员和拥有"bypass branch protections"权限的用户同样生效，无一例外。

**建议：** 个人仓库中管理员即本人，有时需要用 `--admin` 参数紧急合并（如 CI 环境问题时），保持关闭以保留操作灵活性。

---

## Rules applied to everyone including administrators（对所有人包括管理员生效的规则）

### Allow force pushes（允许强制推送）

**当前值：** ☐ 未启用

允许有推送权限的用户对此分支执行 `git push --force`，会覆盖历史记录。master 分支绝对不应开启，已关闭。

### Allow deletions（允许删除分支）

**当前值：** ☐ 未启用

允许有推送权限的用户删除 master 分支。绝对不应开启，已关闭。

---

## 本仓库配置汇总

**保护分支：** `master`

| 规则 | 状态 |
| --- | --- |
| Require pull request before merging | ✅ 已启用 |
| Dismiss stale reviews on new commits | ✅ 已启用 |
| Require status checks（Markdown Lint + YAML Lint） | ✅ 已启用，Strict 模式 |
| Require conversation resolution | ✅ 已启用 |
| Require signed commits | — 未启用 |
| Require linear history | — 未启用（启用此项将禁止 merge commit，与当前 merge-commit-only 策略冲突） |
| Allow force pushes | ✗ 已禁用 |
| Allow deletions | ✗ 已禁用 |
