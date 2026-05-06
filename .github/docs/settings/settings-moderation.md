# GitHub 仓库 Moderation Options 设置说明

> 本文档对应 Settings → Access → Moderation options 下的两个子页面，说明互动限制与代码审查限制的作用及建议配置。

---

## Interaction limits（临时互动限制）

**路径：** Settings → Moderation options → Interaction limits

临时限制哪类外部用户可以与仓库互动（评论、提 Issue、创建 PR），持续时间可配置（24 小时 / 3 天 / 1 周 / 1 个月 / 6 个月）。常用于遭遇骚扰、刷 Issue 等情况下的应急冷静期处理。

> 注：也可在账号级别（Account settings）统一设置，对名下所有仓库生效。

### Limit to existing users（限制为老用户）

近期新注册的账号无法互动，老用户、贡献者、协作者不受影响。

**适用场景：** 仓库被新注册小号批量骚扰时启用。

### Limit to prior contributors（限制为历史贡献者）

只有曾经向本仓库 master 分支提交过代码的用户才能互动，普通用户无法评论或提 Issue。

**适用场景：** 需要更严格地限制外部噪音，只保留核心贡献者互动。

### Limit to repository collaborators（限制为协作者）

只有被明确邀请为协作者的用户才能互动，所有外部用户均无法评论、提 Issue 或创建 PR。

**适用场景：** 需要完全关闭外部互动时使用（等同于私有仓库的互动体验）。

**当前值：** 全部未启用
**建议：** 平时保持全部关闭，遇到骚扰情况时按需临时开启，到期自动解除。

---

## Code review limits（代码审查权限限制）

**路径：** Settings → Moderation options → Code review limits

> ⚠️ **当前状态：** "This setting is currently overridden by the owner's account"
>
> 账号级别已设置了覆盖策略，仓库级别的开关暂时无法生效。如需单独配置本仓库，需先在账号设置中解除覆盖。

### Limit to users explicitly granted read or higher access（限制审查权限为授权用户）

**当前值：** ☐ 未启用（且被账号级别覆盖）

启用后，只有被明确授予 Read 或更高权限的用户，才能提交 "Approve" 或 "Request changes" 类型的 PR Review。任何人仍可提交 Comment 类型的 Review。

**适用场景：** 防止陌生用户通过 Approve 等操作干扰代码合并流程，适合多协作者的中大型项目。

**建议：** 本仓库为个人模板仓库，无外部协作者，此设置意义不大，保持关闭。账号级别的覆盖策略保持现状即可。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Interaction limits | — 未启用 | 遇到骚扰时按需临时开启 |
| Code review limits | — 未启用（被账号级覆盖） | 个人模板仓库无需 |
