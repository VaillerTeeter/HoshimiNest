# GitHub 仓库 Rules / Rulesets 设置说明

> 本文档对应 Settings → Code and automation → Rules → Rulesets 页面。

---

## 概览

**当前状态：** 未创建任何 Ruleset

Rulesets 是 GitHub 推出的新一代规则系统，用于替代经典的 Branch protection rules 和已废弃的 Protected tags。

---

## Rulesets 与经典 Branch Protection 的区别

| 对比项 | 经典 Branch Protection | Rulesets |
| --- | --- | --- |
| 作用目标 | 仅分支 | 分支 + Tag |
| 规则优先级/分层 | 不支持 | 支持多个 Ruleset 叠加 |
| Evaluate 模式（测试模式） | 不支持 | 支持（只记录违规，不阻断） |
| Bypass list | 仅管理员 | 可精确指定用户或角色 |
| 组织级统一策略 | 不支持 | 支持（Organization Rulesets） |
| 当前维护状态 | 仍可用，但不再推荐 | GitHub 官方推荐方案 |

---

## 当前仓库的 Ruleset 配置

本仓库已创建两个 Ruleset，与经典 Branch Protection 并存（规则叠加，取最严格策略生效）。

---

## protect-version-tags（Tag Ruleset）

**ID：** 15233152 | **目标：** Tags 匹配 `v*` | **状态：** Active

替代已废弃的经典 Protected tags，保护所有语义版本 tag 不被意外删除或覆盖。

| 规则 | 说明 |
| --- | --- |
| deletion | 禁止删除已有 tag |
| non_fast_forward | 禁止强制覆盖已有 tag（`git push --force`） |

**Bypass：** 无（任何人包括管理员均不可删除或覆盖版本 tag）

---

## protect-master（Branch Ruleset）

**ID：** 15233270 | **目标：** Branch `master` | **状态：** Active

以 Ruleset 形式完整复现经典 Branch Protection 规则，作为最佳实践范本。

| 规则 | 说明 |
| --- | --- |
| deletion | 禁止删除 master 分支 |
| non_fast_forward | 禁止 force push |
| pull_request | 合并前必须通过 PR，新提交自动废除旧 Approve，合并前需解决所有对话 |
| required_status_checks | 必须通过 Markdown Lint + YAML Lint，Strict 模式（分支须与 master 同步） |

**Bypass：** Repository Admin 角色可 bypass（保留管理员应急操作能力）

---

## 与经典 Branch Protection 的关系

两套规则目前并存，效果叠加（取最严格的规则生效）。经典 Branch Protection 可继续保留，也可在确认 Ruleset 运行稳定后手动删除。

---

## 本仓库配置汇总

| Ruleset | 目标 | 状态 |
| --- | --- | --- |
| protect-version-tags | Tags 匹配 `v*` | ✅ Active |
| protect-master | Branch `master` | ✅ Active |
