# Settings → Advanced Security

> 启用 Advanced Security 功能后，GitHub 获得对仓库的只读分析权限。

---

## Private vulnerability reporting

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已启用** ✅ |
| 作用 | 允许社区成员通过私密渠道向维护者报告安全漏洞，报告内容不公开，维护者修复后再披露，避免漏洞在修复前被攻击者利用 |
| 适用场景 | 所有公开仓库均建议启用 |

```bash
# 启用
gh api repos/{owner}/{repo}/private-vulnerability-reporting --method PUT
# 查询状态
gh api repos/{owner}/{repo}/private-vulnerability-reporting --jq '.enabled'
```

---

## Dependency graph

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已启用** ✅ |
| 作用 | 解析仓库中的依赖清单文件（`package.json`、`requirements.txt`、`go.mod` 等），生成完整的依赖关系图；是 Dependabot alerts 和 Security updates 的必要前提 |

### Automatic dependency submission

| 属性 | 说明 |
| --- | --- |
| 当前状态 | Disabled |
| 作用 | 通过 Actions 自动上报构建时才能确定的动态依赖（如 Gradle resolved dependencies、Maven lockfile），补充 Dependency graph 无法静态解析的部分 |
| 本仓库 | 无实际构建依赖，无需启用 |

---

## Dependabot

### Dependabot alerts

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已启用** ✅ |
| 作用 | 依赖出现已知安全漏洞（来自 GitHub Advisory Database / NVD）时发出警告，并可手动触发生成修复 PR |

### Dependabot rules

| 属性 | 说明 |
| --- | --- |
| 当前状态 | 1 rule enabled |
| 作用 | 自定义规则控制哪些 Dependabot 警告自动关闭、降级或忽略（如忽略低严重性、忽略特定包） |

### Dependabot malware alerts

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已启用** ✅ |
| 作用 | 在依赖中检测到恶意软件包时发出警告，与漏洞警告独立 |
| 注意 | GitHub REST API 暂无此项端点，通过 Web UI 手动启用 |

### Dependabot security updates

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已启用** ✅ |
| 作用 | 检测到安全漏洞时，Dependabot 自动创建 PR 将依赖升级到已修复的版本 |

### Grouped security updates

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已启用** ✅ |
| 作用 | 将同一 manifest 文件下的所有安全更新合并为一个 PR（按包管理器分组），减少 PR 噪音 |
| 优先级 | 可被 `dependabot.yml` 中的 `groups` 配置覆盖 |

### Dependabot version updates

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已配置** ✅（via `.github/dependabot.yml`） |
| 作用 | 定期检查依赖的新版本（非安全更新），自动创建 PR 保持依赖最新 |

---

## Code scanning

自动扫描代码中的常见漏洞和编码错误。

### Tools

| 工具 | 当前状态 | 说明 |
| --- | --- | --- |
| **CodeQL analysis** | 未配置 | GitHub 官方静态分析引擎，支持多种语言，适合有实际代码的仓库 |
| **Other tools** | 未配置 | 接入第三方扫描工具（Semgrep、Snyk 等），通过 SARIF 格式上报结果 |

本仓库为示例模板，暂无需配置 Code scanning。实际项目可通过 Actions 启用：

```bash
gh api repos/{owner}/{repo}/code-scanning/default-setup --method PATCH \
  --field state=configured
```

### Copilot Autofix

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **On** ✅ |
| 作用 | CodeQL 发现安全问题时，AI 自动生成修复建议（需 CodeQL 已配置后生效） |

### Protection rules — Check runs failure threshold

设置 Code scanning check run 失败时的严重级别阈值，配合 Branch Ruleset 可阻止不安全代码合入。

| 类型 | 当前阈值 |
| --- | --- |
| Security alert severity | **High or higher** |
| Standard alert severity | **Only errors** |

---

## Secret Protection

| 属性 | 说明 |
| --- | --- |
| 当前状态 | **已启用** ✅ |
| 基础功能 | GitHub 对所有公开仓库自动扫描已知格式的 Secret（API Keys、Token 等），发现后通知合作伙伴（partner pattern scanning） |
| Push protection | **已启用** ✅ — 在 `git push` 阶段即时拦截包含 Secret 的提交，阻止其进入仓库 |

```bash
# 启用 Secret scanning
gh api repos/{owner}/{repo} --method PATCH \
  --field "security_and_analysis[secret_scanning][status]=enabled"

# 启用 Push protection
gh api repos/{owner}/{repo} --method PATCH \
  --field "security_and_analysis[secret_scanning_push_protection][status]=enabled"
```

---

## 本仓库配置汇总

| 功能 | 状态 |
| --- | --- |
| Private vulnerability reporting | ✅ 已启用 |
| Dependency graph | ✅ 已启用 |
| Automatic dependency submission | — 无需（无构建依赖） |
| Dependabot alerts | ✅ 已启用 |
| Dependabot malware alerts | ✅ 已启用（Web UI 手动操作） |
| Dependabot security updates | ✅ 已启用 |
| Grouped security updates | ✅ 已启用 |
| Dependabot version updates | ✅ 已配置（dependabot.yml） |
| CodeQL analysis | — 模板仓库暂不需要 |
| Copilot Autofix | ✅ 已启用 |
| Secret scanning | ✅ 已启用 |
| Secret scanning push protection | ✅ 已启用 |
