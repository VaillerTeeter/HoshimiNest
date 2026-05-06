# GitHub 仓库 Tags 设置说明

> 本文档对应 Settings → Code and automation → Tags 页面。

---

## 概览

**当前状态：** Protected tags（经典标签保护）功能已被 GitHub 废弃，页面显示空列表。

> ⚠️ **官方废弃通知**
>
> "Protected tags are being deprecated. To continue protecting tags, please migrate to a tag ruleset by August 30th."
>
> 经典 Protected tags 功能将于 **2026 年 8 月 30 日** 正式下线，GitHub 要求迁移到 Rulesets（仓库规则集）来管理 tag 保护。

---

## Tag 保护的作用

Tag 通常用于标记版本发布（如 `v1.0.0`）。保护 tag 可以防止：

- 已发布的版本 tag 被强制覆盖（`git push --force origin v1.0.0`）
- tag 被意外删除
- 随意创建符合版本命名规范的 tag

---

## 推荐做法：使用 Rulesets 管理 tag 保护

经典 Protected tags 已废弃，新的 tag 保护规则应通过 Settings → Rules → Rulesets 创建，选择 **Tag** 作为目标。

Rulesets 支持：

- 通配符匹配（如 `v*` 匹配所有版本 tag）
- 禁止删除 tag
- 禁止非快进式更新（防止强制覆盖）
- Bypass list（指定特定用户/角色可以绕过规则）

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 经典 Protected tags | 已废弃 | 所有浏览器中已不可用 |
| protect-version-tags Ruleset | ✅ Active | 保护所有 `v*` 标签 |
