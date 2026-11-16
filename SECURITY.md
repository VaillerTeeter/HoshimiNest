# 安全策略

## 支持的版本

| 版本 | 支持状态 |
| --- | --- |
| latest (master) | ✅ |

## 报告漏洞

**请勿通过公开的 GitHub Issue 报告安全漏洞。**

如果你发现了安全漏洞，请通过以下方式私下联系我：

- **邮件**：[wyc_19533480830@outlook.com](mailto:wyc_19533480830@outlook.com)
- **邮件主题**：`[SECURITY] 漏洞报告 - <简短描述>`

请在报告中包含以下信息：

1. 漏洞的类型（如 XSS、SQL 注入、路径遍历等）
2. 受影响的文件路径或组件
3. 重现漏洞的步骤
4. 漏洞的潜在影响
5. 如有可能，提供修复建议

我会在 **48 小时内**确认收到你的报告，并在 **7 个工作日内**提供初步评估。

## 本地凭据说明

- Bangumi Access Token 由 Rust 侧使用 **Windows DPAPI（当前用户范围）** 加密后保存在：
  - 正式版：`%APPDATA%\HoshimiNest\bangumi-auth.json`
  - 开发版（`yarn tauri:dev`）：`%APPDATA%\com.vaciller.hoshiminest.dev\bangumi-auth.json`
- 文件中只有密文（`{ "v": 1, "blob": [...] }`），明文不会写入磁盘，也不会存入 `localStorage`。
- 在应用内点「退出登录」或删除上述文件即可清除凭据；更换 Windows 用户或机器后该文件无法解密（属于预期行为）。
- **请勿在 Issue / PR / 截图中粘贴 Access Token。**
