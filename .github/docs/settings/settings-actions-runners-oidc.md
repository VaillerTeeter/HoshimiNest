# GitHub 仓库 Actions Runners / OIDC 设置说明

> 本文档对应 Settings → Code and automation → Actions → Runners 和 OIDC 两个子页面。

---

## Runners（自托管运行器）

**路径：** Settings → Actions → Runners

**当前状态：** 未配置任何 Runner

GitHub Actions workflow 的运行环境有两种：

| 类型 | 说明 |
| --- | --- |
| GitHub-hosted runners | GitHub 提供的云端运行器（`ubuntu-latest`、`windows-latest` 等），按分钟计费，开箱即用 |
| Self-hosted runners | 托管在自己服务器上的运行器，可自定义环境、无需额外费用，但需自行维护机器安全 |

本仓库 `lint.yml` 使用 `runs-on: ubuntu-latest`，由 GitHub 云端运行器执行，无需配置自托管 Runner。

**建议：** 保持当前状态，无需添加。只有在需要特定私有环境、本地网络访问或降低 Actions 费用时才考虑接入自托管 Runner。

---

## OIDC Configuration（OpenID Connect 配置）

**路径：** Settings → Actions → OIDC

**当前状态：** Use default template ✅

### 什么是 OIDC

OIDC（OpenID Connect）允许 GitHub Actions workflow 向第三方云服务（如 AWS、Azure、GCP）无密码认证，通过短期令牌替代长期存储的 Access Key/Secret，是部署类 workflow 的安全最佳实践。

workflow 在运行时会获得一个包含 `sub`（subject claim）字段的 OIDC Token，云服务通过验证这个 Token 来确认请求来自哪个仓库的哪个 workflow。

### Subject claim（主体声明）

`sub` 字段的格式决定了第三方云服务如何识别和授权这个 workflow 请求。

**当前值：** Use default template（使用上游默认模板）

默认 `sub` 格式为：

```text
repo:<owner>/<repo>:ref:refs/heads/<branch>
```

例如：`repo:VaillerTeeter/Example-of-Github-Repo:ref:refs/heads/master`

**建议：** 本仓库目前无部署类 workflow，不需要与任何云服务对接，保持默认模板即可。只有在添加部署到 AWS/Azure/GCP 等云平台的 workflow 时，才需要根据对应云服务的要求自定义 `sub` 模板。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Self-hosted Runners | — 未配置 | 使用 GitHub-hosted `ubuntu-latest`，无需自托管 |
| OIDC Subject claim | 默认模板 | 无部署类 workflow，无需自定义 |
