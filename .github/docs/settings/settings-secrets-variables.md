# Settings → Secrets and variables

Settings → Secrets and variables 包含三个子页面：Actions、Codespaces、Dependabot。

> **通用规则**：所有 Secret 均为加密存储，写入后不可再次读取，只能覆盖或删除。所有 Secret 和 Variable **均不传递给 fork 仓库**触发的 workflow，防止外部贡献者窃取凭证。

---

## 1. Actions

用于 GitHub Actions workflow 的配置数据，分为 **Secrets**（加密）和 **Variables**（明文）两类。

### Secrets（加密，用于敏感数据）

| 层级 | 说明 | 优先级 |
| --- | --- | --- |
| **Environment secrets** | 仅在引用了对应 Environment 的 job 中可访问 | 最高（覆盖同名 Repository secret） |
| **Repository secrets** | 对仓库内所有 Actions workflow 可用 | 次之 |

在 workflow 中引用：

```yaml
steps:
  - run: echo "${{ secrets.MY_SECRET }}"
```

### Variables（明文，用于非敏感数据）

| 层级 | 说明 | 优先级 |
| --- | --- | --- |
| **Environment variables** | 仅在引用了对应 Environment 的 job 中可访问 | 最高 |
| **Repository variables** | 对仓库内所有 Actions workflow 可用 | 次之 |

在 workflow 中引用：

```yaml
steps:
  - run: echo "${{ vars.MY_VAR }}"
```

### 安全说明

- fork 触发的 PR workflow **不会**获得 Secrets 和 Variables，防止恶意 PR 窃取凭证
- 有 collaborator（write）权限的人可以在 workflow 中使用这些值，但无法读取明文

### 常见使用场景

| 类型 | 示例内容 |
| --- | --- |
| Secrets | 云服务访问密钥、Docker Hub 密码、PyPI Token、SSH 私钥 |
| Variables | 部署域名、镜像标签前缀、Feature Flag、通知用邮箱地址 |

### CLI 管理

```bash
# 设置 Repository secret
gh secret set MY_SECRET --body "value"

# 列出所有 Repository secrets（只显示名称）
gh secret list

# 设置 Repository variable
gh variable set MY_VAR --body "value"

# 列出所有 Repository variables
gh variable list
```

---

## 2. Codespaces

用于 GitHub Codespaces 开发容器的加密环境变量，注入到 `.devcontainer/` 定义的容器环境中，供开发者在 Codespace 内使用。

| 属性 | 说明 |
| --- | --- |
| **作用范围** | Codespace 容器内的开发环境 |
| **与 Actions Secrets 的区别** | 仅用于 Codespaces，不影响 Actions workflow |
| **传递给 fork** | 否 |

### 典型使用场景

- 私有 npm/PyPI registry 的认证 Token
- 开发调试用的第三方 API Key
- 个人专属的开发环境配置凭证

---

## 3. Dependabot

Dependabot 在更新依赖时可能需要访问**私有 registry**（私有 npm、Maven、PyPI、Docker 等），此处存放对应的认证凭证。

| 属性 | 说明 |
| --- | --- |
| **作用范围** | Dependabot 执行依赖更新 PR 时使用 |
| **与 Actions Secrets 的区别** | 仅 Dependabot 任务可访问；普通 Actions workflow 默认无法访问 Dependabot secrets |
| **传递给 fork** | 否 |

在 `dependabot.yml` 中引用：

```yaml
registries:
  my-private-npm:
    type: npm-registry
    url: https://npm.example.com
    token: ${{ secrets.MY_NPM_TOKEN }}   # 引用 Dependabot secret
```

---

## 本仓库配置汇总

| 子页面 | 状态 | 说明 |
| --- | --- | --- |
| Actions Secrets | — 空 | 模板仓库无部署流程 |
| Actions Variables | — 空 | 无需配置 |
| Codespaces Secrets | — 空 | 无 `.devcontainer/` 配置 |
| Dependabot Secrets | — 空 | 依赖均来自公开 registry |
