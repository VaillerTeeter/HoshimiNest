# Settings → Environments

> 当前仓库未配置任何 Environment。

---

## 功能说明

Environment（部署环境）是 GitHub Actions 部署流水线的目标环境抽象，用于区分不同阶段的部署目标（如 `production`、`staging`、`development`）。

在 Actions workflow 中通过 `environment:` 字段引用：

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production   # 引用名为 production 的 Environment
    steps:
      - run: echo "Deploying..."
```

---

## 每个 Environment 可配置的内容

### Protection rules（保护规则）

| 规则 | 说明 |
| --- | --- |
| **Required reviewers** | 部署前必须由指定人员手动批准，最多 6 人 |
| **Wait timer** | 批准后延迟 N 分钟再执行（0–43200 分钟），提供人工叫停的时间窗口 |
| **Deployment branches/tags** | 限制哪些分支或标签可部署到此环境（如仅允许 `main` 或 `v*` 标签） |
| **Prevent self-review** | 禁止触发部署的人自己审批，确保四眼原则 |

### Environment Secrets

- 仅在引用该 Environment 的 Actions job 中可用
- **优先级高于**仓库级（Repository）Secrets，同名时覆盖
- 适合存放生产环境数据库密码、云服务密钥等高敏感凭证

### Environment Variables

- 仅在引用该 Environment 的 Actions job 中可用
- **优先级高于**仓库级 Variables，同名时覆盖
- 适合存放各环境差异化配置（如 API 地址、域名、Feature Flag）

---

## 典型使用模式

```text
development  → 无保护规则，快速迭代
staging      → Wait timer 5 分钟，限制从 main 分支部署
production   → Required reviewers 2 人 + Wait timer 10 分钟，仅允许 v* 标签
```

---

## 与 Copilot Cloud Agent 的关系

Copilot Cloud Agent 的 MCP Server 可以访问名为 **`copilot`** 的特殊 Environment 下的 Secrets，用于向 MCP 工具传递凭证（如访问第三方 API 的 Token）。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Environments | — 未配置 | 模板仓库无部署流程 |
