# Settings → Deploy keys

> 当前仓库未配置任何 Deploy key。
>
> GitHub 官方建议：对于需要细粒度权限控制的场景，优先使用 **GitHub Apps** 替代 Deploy keys。

---

## 功能说明

Deploy key 是绑定到**单个仓库**的 SSH 公钥，用于让外部服务器或自动化系统通过 SSH 访问该仓库，无需依赖任何用户账户。

```text
外部服务器持有私钥 → SSH 连接 GitHub → 访问绑定的单个仓库
```

---

## 权限模式

| 模式 | 说明 | 典型场景 |
| --- | --- | --- |
| **Read-only**（默认） | 只能 `git clone` / `git pull` | 生产服务器拉取代码部署 |
| **Read/Write** | 可执行 `git push` | 自动化任务需要写回仓库（如提交构建产物） |

---

## 安全特性与风险

| 项目 | 说明 |
| --- | --- |
| **仓库级别隔离** | 仅对该单个仓库有效，私钥泄露不影响其他仓库或账户 |
| **无密码短语保护** | 私钥文件本身无法设置密码保护，服务器被入侵即意味着 key 同时泄露 |
| **不可跨仓库复用** | 同一公钥不能同时添加到多个仓库（GitHub 全局唯一） |

> **安全建议**：需要 Read/Write 权限时应格外谨慎，优先考虑使用 GitHub Apps 或范围受限的 Fine-grained PAT 替代。

---

## 与其他认证方式对比

| 方式 | 权限范围 | 适用场景 |
| --- | --- | --- |
| **Deploy key** | 单个仓库 | 简单的服务器部署拉取 |
| **GitHub Apps** | 可配置多仓库 + 细粒度权限 | 复杂集成、需要审计日志 |
| **Fine-grained PAT** | 可配置多仓库 + 细粒度权限 | 个人自动化脚本 |
| **Actions `GITHUB_TOKEN`** | 当前仓库（Actions 内） | GitHub Actions workflow 内部操作 |

---

## 管理方式

```bash
# 列出所有 Deploy keys
gh api repos/{owner}/{repo}/keys --jq '.[] | {id, title, read_only}'

# 添加 Deploy key
gh api repos/{owner}/{repo}/keys --method POST \
  --field title="production-server" \
  --field key="ssh-ed25519 AAAA..." \
  --field read_only=true

# 删除 Deploy key
gh api repos/{owner}/{repo}/keys/{key_id} --method DELETE
```

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Deploy keys | — 未配置 | 无外部服务器部署需求 |
