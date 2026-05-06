# Settings → Pages

> 当前仓库 GitHub Pages 处于**未启用**状态（Branch = None）。

---

## 功能说明

GitHub Pages 是 GitHub 提供的静态网站托管服务，可将仓库中的 HTML/CSS/JS 文件或经过构建工具生成的静态站点发布到公网，域名格式为：

```text
https://{username}.github.io/{repo}/
```

---

## Build and deployment（构建与发布）

### Source（构建来源）

| 选项 | 说明 | 适用场景 |
| --- | --- | --- |
| **Deploy from a branch** | 直接将指定分支的文件作为静态站点发布，无需 Actions | 纯 HTML/CSS/JS、Jekyll 项目 |
| **GitHub Actions** | 通过自定义 workflow 构建后发布，灵活支持任意构建工具 | Hugo、Next.js、VitePress、Docusaurus 等 |

当前选项：**Deploy from a branch**

### Branch（发布分支）

仅当 Source 为 "Deploy from a branch" 时有效，需选择：

- **分支名**：如 `main`、`gh-pages`
- **发布目录**：`/(root)`（根目录）或 `/docs`（docs 子目录）

| 属性 | 当前状态 |
| --- | --- |
| Branch | **None**（Pages 未启用） |

将 Branch 设置为 None 即表示关闭 GitHub Pages。

---

## Visibility（可见性）

> 需要 **GitHub Enterprise** 账户。

普通 GitHub 账户（Free/Pro/Team）的 Pages 站点可见性规则：

| 仓库类型 | Pages 可见性 |
| --- | --- |
| Public 仓库 | 站点公开可访问 |
| Private 仓库 | 无法启用 Pages（或需付费计划） |

GitHub Enterprise 用户可将 Pages 站点设为私有，仅组织内成员可访问，适合内部文档或知识库。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| GitHub Pages | — 未启用（Branch = None） | 模板仓库无静态站点内容 |
