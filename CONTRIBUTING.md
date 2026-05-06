# 贡献指南

感谢你有兴趣为本项目做出贡献！

---

## 开始之前

- 请先阅读 [行为准则](./CODE_OF_CONDUCT.md)
- 查看现有的 [Issues](../../issues) 和 [Pull Requests](../../pulls) 以避免重复工作

---

## 本地开发环境

```bash
# 1. Fork 本仓库到你的账号，然后克隆
git clone git@github.com:<your-username>/Example-of-Github-Repo.git
cd Example-of-Github-Repo

# 2. 配置 GitHub Token
cp .env.example .env
# 编辑 .env，填入你的 GH_TOKEN

# 3. 加载 Token
export GH_TOKEN="$(grep "^GH_TOKEN=" .env | cut -d= -f2- | tr -d '\r')"
```

---

## 提交流程

本仓库所有变更必须通过 Pull Request 合并，**禁止直接 push 到 `master`**。

```bash
# 1. 基于 master 创建功能分支
git checkout master
git pull origin master
git checkout -b feat/your-feature-name

# 2. 完成修改，提交
git add .
git commit -m "feat: describe your change"

# 3. 推送
git push origin feat/your-feature-name

# 4. 创建 PR（需先写 body 文件，等待确认后再执行）
# 参考 .github/instructions/git-workflow.instructions.md 中的 PR Workflow 规范
# a. 将 PR body 写入 tmp/pr-<number>-body.md（按 .github/PULL_REQUEST_TEMPLATE.md 填写）
# b. 确认内容后执行：
gh pr create --title "标题" --body-file tmp/pr-<number>-body.md --base master
```

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
