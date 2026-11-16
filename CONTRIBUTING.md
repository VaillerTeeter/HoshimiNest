# 贡献指南

感谢你有兴趣为本项目做出贡献！

---

## 开始之前

- 请先阅读 [行为准则](./CODE_OF_CONDUCT.md)
- 查看现有的 [Issues](../../issues) 和 [Pull Requests](../../pulls) 以避免重复工作

---

## 本地开发环境

**环境要求**：Windows + PowerShell。

```powershell
# 1. Fork 本仓库到你的账号，然后克隆
git clone git@github.com:VaillerTeeter/HoshimiNest.git
cd HoshimiNest

# 2. 一键检查 / 安装开发依赖（winget、Node.js 24、yarn、rustup、MSVC、WebView2、Tauri CLI、sidecar）
.\scripts\setup-windows.ps1

# 3. 安装前端依赖
yarn install

# 4. 启动完整 Tauri 窗口（dev identifier，数据与正式版隔离）
yarn tauri:dev
```

---

## 提交流程

本仓库所有变更必须通过 Pull Request 合并，**禁止直接 push 到 `master`**。

```powershell
# 1. 基于 master 创建功能分支
git checkout master
git pull origin master
git checkout -b feat/your-feature-name

# 2. 完成修改并提交（消息格式见下一节）
git add <files>
git commit -m "feat: describe your change"

# 3. 推送
git push -u origin feat/your-feature-name
```

创建 PR 前，先把描述写入 `tmp/pr-<number>-body.md`（按 [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md) 填写）并确认，再通过 MCP 工具创建 —— 具体流程见 [.clinerules/git-workflow.md](./.clinerules/git-workflow.md)。

---

## Commit 消息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

| 前缀 | 用途 |
| --- | --- |
| `feat:` | 新功能 |
| `fix:` | Bug 修复 |
| `docs:` | 文档变更 |
| `chore:` | 构建/工具/配置等杂项 |
| `refactor:` | 重构（不新增功能，不修复 Bug） |
| `style:` | 代码格式调整（不影响逻辑） |
| `test:` | 添加或修改测试 |
| `perf:` | 性能优化 |
| `build:` | 构建系统 / 依赖变更 |
| `ci:` | CI 配置变更 |
| `security:` | 安全相关修复 |
| `deps:` | 依赖升级 |

示例：`feat: add Python example code`

---

## Pull Request 要求

- 标题清晰描述改动内容
- 填写 PR 模板中的所有必填项
- 关联对应的 Issue（如有）
- 确保本地无明显错误后再提交

---

## 问题和讨论

如有疑问，欢迎通过 [Issue](../../issues/new/choose) 或 [邮件](mailto:wyc_19533480830@outlook.com) 联系。
