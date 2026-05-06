# Settings → Models

> **Preview 功能** — 界面和 API 可能随时变动，不建议在生产仓库中依赖此功能。

---

## Models in this repository

| 属性 | 说明 |
| --- | --- |
| 路径 | Settings → Models |
| 状态标注 | Preview（预览） |
| 当前配置 | **Disabled（禁用）** |

### 功能说明

启用后，仓库导航栏会出现 **Models** 标签页，提供两项子功能：

- **Prompt editor（提示词编辑器）**：在仓库上下文中直接编写、运行和调试 AI Prompt，无需离开 GitHub 界面。
- **Comparison tooling（模型对比工具）**：同时向多个 AI 模型发送同一 Prompt，并排对比各模型的输出结果，用于评估模型效果。

禁用时，Models 标签页将被隐藏，上述功能均不可用。

### 适用场景

| 场景 | 建议 |
| --- | --- |
| 通用/模板仓库 | 保持 **Disabled** |
| AI / LLM 相关项目 | 可 **Enabled**，方便协作者在仓库内直接测试 Prompt |
| 需要模型输出对比评估 | 可 **Enabled** |

### 本仓库配置

本仓库为通用示例模板，与 AI 模型无直接关联，保持默认的 **Disabled** 状态，无需改动。

---

## 本仓库配置汇总

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Models | Disabled | 模板仓库无 AI 测试需求 |
