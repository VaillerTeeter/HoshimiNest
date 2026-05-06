# Settings → GitHub Apps

> 此页面显示已安装并授权访问本仓库的 GitHub Apps。

---

## 功能说明

GitHub App 是以**独立 bot 身份**接入 GitHub 的第三方集成工具。与 OAuth App 或 Personal Access Token 相比，其优势在于：

| 特性 | 说明 |
| --- | --- |
| **细粒度权限** | 仅申请所需的最小权限，而非全账户访问权 |
| **独立 bot 身份** | 操作以 App 名义记录在审计日志中，不绑定任何个人账户 |
| **仓库级授权** | 安装时可选择允许哪些仓库被该 App 访问，不必开放所有仓库 |
| **自动 Token 轮换** | App 使用短期 Installation Token，无需长期保存凭证 |

---

## 已安装的 Apps

### Cursor

| 属性 | 说明 |
| --- | --- |
| 开发者 | [cursor](https://cursor.com) |
| 用途 | AI 代码编辑器 Cursor 的 GitHub 集成，授权后 Cursor 可读取仓库代码、创建分支和 PR，用于在 Cursor 编辑器中直接对 GitHub 仓库进行操作 |
| 配置 | 在 Cursor 编辑器侧管理，此处仅控制其对本仓库的访问权限 |

### Vercel

| 属性 | 说明 |
| --- | --- |
| 开发者 | [vercel](https://vercel.com) |
| 用途 | 前端部署平台 Vercel 的 GitHub 集成，监听仓库 push 和 PR 事件，自动触发预览部署（Preview）和生产部署（Production），并在 PR 中评论预览链接 |
| 配置 | 在 Vercel Dashboard 侧管理项目与仓库的绑定关系 |

---

## 管理说明

- 点击 **Configure** 可调整各 App 对本仓库的权限范围（如切换为只读、或取消对本仓库的授权）
- 若要完全卸载某个 App，需前往账户级别的 Settings → Applications → Installed GitHub Apps
- 新增 App 可前往 [GitHub Marketplace](https://github.com/marketplace) 搜索安装

---

## 本仓库配置汇总

| App | 状态 | 说明 |
| --- | --- | --- |
| Cursor | ✅ 已安装 | AI 编辑器集成，个人工具链 |
| Vercel | ✅ 已安装 | 前端部署平台集成，个人工具链 |
| 其他 App | — 未安装 | 按需添加 |
