# Settings → Webhooks

> 当前仓库未配置任何 Webhook。

---

## 功能说明

Webhook 是一种**事件推送**机制：当仓库发生指定事件时，GitHub 自动向配置的 URL 发送 HTTP POST 请求，携带事件详情的 JSON Payload。外部服务收到请求后即可做出响应（触发部署、发送通知、更新状态等）。

```text
仓库事件触发 → GitHub 发送 POST 请求 → 外部服务接收并处理
```

---

## 配置项说明

点击 **Add webhook** 后，需填写以下字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| **Payload URL** | ✅ | 接收 POST 请求的目标地址，须为公网可访问的 HTTPS 端点 |
| **Content type** | ✅ | `application/json`（推荐）或 `application/x-www-form-urlencoded` |
| **Secret** | ❌ | 签名密钥，GitHub 用其对 Payload 做 HMAC-SHA256 签名，接收端可验签防伪造 |
| **SSL verification** | ✅ | 验证目标服务器 TLS 证书，默认启用，**不建议关闭** |
| **Events** | ✅ | 触发条件：`Just the push event` / `Send me everything` / 自定义事件列表 |
| **Active** | ✅ | 启用或禁用此 Webhook |

---

## 常用触发事件

| 事件 | 触发时机 |
| --- | --- |
| `push` | 代码推送到任意分支 |
| `pull_request` | PR 创建、更新、关闭、合并 |
| `issues` | Issue 创建、编辑、关闭、标签变更 |
| `issue_comment` | Issue 或 PR 的评论 |
| `release` | 发布 Release |
| `workflow_run` | Actions 工作流完成 |
| `create` / `delete` | 分支或标签的创建 / 删除 |
| `star` | 仓库被加星 |

完整事件列表参见 [GitHub Webhooks 文档](https://docs.github.com/en/webhooks/webhook-events-and-payloads)。

---

## 典型使用场景

| 场景 | 说明 |
| --- | --- |
| 对接自建 CI/CD | push 事件触发构建流水线 |
| 发送 Slack / Discord 通知 | PR、Issue、Release 事件推送到团队频道 |
| 同步到第三方项目管理工具 | Issue 事件同步到 Jira、Linear 等 |
| 触发 CDN 缓存刷新 | push/release 事件后自动刷新静态资源 |

---

## 安全建议

- 始终配置 **Secret**，并在接收端验证 `X-Hub-Signature-256` 请求头，防止伪造请求。
- 保持 **SSL verification** 启用，避免中间人攻击。
- Payload URL 应仅接受来自 GitHub IP 段的请求（可参考 [GitHub IP 范围](https://api.github.com/meta)）。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Webhooks | — 未配置 | 模板仓库无外部推送需求 |
