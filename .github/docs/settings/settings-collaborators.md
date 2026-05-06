# GitHub 仓库 Collaborators 设置说明

> 本文档对应 Settings → Access → Collaborators 页面，说明协作者与访问权限相关设置。

---

## 仓库可见性（Repository visibility）

**当前值：** Public（公开）

显示仓库当前的可见性状态。此处也提供快捷入口切换可见性（等同于 General → Danger Zone → Change visibility）。

本仓库为公开模板仓库，保持 Public。

---

## Direct access（直接访问）

**当前值：** 0 collaborators，仅仓库所有者可贡献代码

列出所有被直接邀请为协作者的账号及其权限级别。个人仓库无团队协作需求，保持当前状态（仅本人）。

### 权限级别说明

个人仓库可授予协作者以下权限：

| 权限 | 说明 |
| --- | --- |
| Read | 只读，可 clone、Fork、提 Issue |
| Triage | Read + 管理 Issue/PR（无法推送代码） |
| Write | Triage + 推送代码、管理分支 |
| Maintain | Write + 管理仓库设置（不含危险操作） |
| Admin | 完全控制，含敏感操作 |

---

## Manage access（管理访问）

**当前值：** 未邀请任何协作者

通过 "Add people" 可按 GitHub 用户名或邮箱邀请协作者。被邀请者需接受邀请后权限生效。

本仓库为个人模板仓库，无需邀请其他协作者。若未来开放协作，建议授予最小必要权限（Write 而非 Admin）。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 协作者数量 | 0（仅所有者） | 个人模板仓库，无需协作者 |
| 仓库可见性 | Public | 公开模板仓库 |
