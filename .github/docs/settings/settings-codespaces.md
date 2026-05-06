# Settings → Codespaces

> 当前仓库未配置任何 Prebuild。

---

## 功能说明

GitHub Codespaces 是基于云的开发环境：开发者点击仓库的 **"Open in Codespace"** 按钮后，GitHub 在云端启动一个完整的 VS Code 开发容器，无需在本地安装任何开发环境。容器的配置由仓库中的 `.devcontainer/` 目录定义。

```text
开发者点击 Open in Codespace
    → GitHub 按 .devcontainer/ 配置构建容器
    → 启动云端 VS Code
    → 开发者直接编码
```

---

## Prebuild configuration（预构建配置）

### 作用

Prebuild 预先完成创建 Codespace 所需的所有准备工作（拉取基础镜像、安装依赖、编译等），并将结果缓存。后续用户打开 Codespace 时直接使用缓存，启动时间从数分钟缩短到数秒。

### 工作原理

| 步骤 | 说明 |
| --- | --- |
| 配置触发条件 | 指定分支（如 `main`）有 push 时自动重新执行预构建 |
| 执行预构建 | 在 Actions 中运行容器构建任务，消耗 Actions 分钟数 |
| 缓存存储 | 预构建结果存储在 GitHub 存储空间中，消耗 Storage 配额 |
| 用户启动 | 用户打开 Codespace 时命中缓存，秒级启动 |

### 前提条件

- 仓库中存在 `.devcontainer/devcontainer.json` 配置文件
- 仓库已启用 GitHub Codespaces（组织或个人账户层面）

### 收费说明

- Prebuild 构建过程消耗 **Actions 分钟数**
- 缓存文件消耗 **Codespaces Storage** 配额
- GitHub 免费账户有一定免费额度，超出后按量计费

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Prebuild configuration | — 未配置 | 无 `.devcontainer/` 配置，无需预构建 |
