# HoshimiNest

基于 [Bangumi API](https://github.com/bangumi/api) 的 Windows 桌面番剧管理工具，使用 Tauri v2 + React + TypeScript + Rust 构建。

## 已实现功能

- **季度番剧查询** — 按年份 + 季度浏览 Bangumi 番剧列表，支持平台 / 来源 / 标签 / 地区 / 受众多维筛选，查看详情、评分、简介、剧集、角色、演职人员；整季通过单次 `air_date` 区间查询 + 4 路并发分页拉取，并做会话内缓存；同时提供**番剧名模糊搜索**入口（`/v0/search/subjects`，相关度排序，最多载入 100 条），只记得名字时可直接查全站番剧条目，关键字模式下自动隐藏「月份」筛选
- **追番管理** — 正在追番 / 补番计划 / 已完番剧三状态收藏，周历视图、网格视图切换
- **资源搜索** — 搜索 Nyaa 字幕组资源，支持多关键词 AND / OR / NOT 逻辑组合，一键添加磁力下载
- **番剧下载** — 内嵌 aria2c sidecar，磁力链接下载，任务全生命周期管理（下载中 / 暂停 / 恢复 / 取消 / 重启），状态机防止非法转换；显示阶段、连接数、做种数诊断信息；BT Tracker / 最大 Peer 数 / 磁盘缓存 / 监听端口等参数集中在 `src-tauri/app-config.json`，编译期生效
- **轨道合并** — MKV 轨道工坊，识别视频 / 音频 / 字幕轨道；A 版视频（取视频 / 音频轨）+ 多份 B 版字幕 / 附加文件（`ass` / `ssa` / `srt` / `sup` / `vtt`，可一次多选）队列合并，实时进度推送；字幕标签按序默认（第 1 条 `zh-Hans`、第 2 条 `zh-Hant`、其余留空即保留源语言），自动清空轨道名称、剔除全部章节，并把 A 版视频 / 音频与唯一一条字幕标记为默认轨，输出目录默认为 A 版文件所在目录；内嵌 mkvmerge sidecar
- **桌面通知** — 下载完成 / 下载错误 / 合并队列完成时推送 Windows 系统通知
- **外部磁力链接下载** — 支持直接输入外部磁力链接添加下载任务，不限于 Nyaa 搜索结果
- **Bangumi 账号** — 使用个人 Access Token 登录，凭据由 Windows DPAPI（当前用户范围）加密后保存在本机；顶栏显示真实头像与昵称，点击头像或昵称用系统默认浏览器打开个人主页，打开账号面板时自动刷新资料

## 网络说明

Bangumi API、封面 / 头像图片与 Nyaa 搜索页统一经由自建反向代理访问（域名集中在 `src/relay.ts` 的 `RELAY_ORIGIN`）：

```text
<RELAY_ORIGIN>/bgm/   -> https://api.bgm.tv/
<RELAY_ORIGIN>/lain/  -> https://lain.bgm.tv/   （封面 / 头像）
<RELAY_ORIGIN>/nyaa/  -> https://nyaa.si/
```

BT 下载由内嵌 aria2c 直连 tracker / peer，不经过反向代理。修改反代域名时需同步更新 `src-tauri/tauri.conf.json` 的 CSP `connect-src`。

## 开发工作流

### 初次克隆后

**Windows（推荐，支持完整 Tauri 窗口）**：

```powershell
# 1. 运行环境检查脚本（自动检测并安装缺失的依赖）
.\scripts\setup-windows.ps1

# 2. 安装 npm 依赖
yarn install
```

脚本会依次检查：winget → Node.js v24 → yarn → rustup → Rust stable MSVC 工具链 → C++ Build Tools → WebView2 → Tauri CLI → aria2c sidecar 下载 → mkvmerge sidecar 下载。

### 日常开发

```bash
# Windows PowerShell — 启动完整 Tauri 桌面窗口（热重载）
# 使用 --config 加载 dev identifier，与生产数据隔离：
#   %APPDATA%\com.vaciller.hoshiminest.dev        （配置 / Bangumi 登录凭据）
#   %LOCALAPPDATA%\com.vaciller.hoshiminest.dev   （WebView2 / localStorage）
yarn tauri:dev
```

### 构建

```bash
# 构建 Windows 安装包（需在 Windows 上运行）
yarn tauri:build
```

## 发版流程

1. 同步更新以下 3 个文件的 `version` 字段为同一版本号：
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
   - `package.json`

   > 前端展示与 Bangumi 请求的 `User-Agent` 版本号由 `vite.config.ts` 在构建期从 `package.json` 注入，无需再手动同步其它文件。

2. 暂存并提交：

   ```bash
   git add src-tauri/tauri.conf.json src-tauri/Cargo.toml package.json
   git commit -m "chore: bump version to X.Y.Z"
   ```

3. 打 tag 并推送：

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push
   git push origin vX.Y.Z
   ```

4. push tag 后，CI（`.github/workflows/release.yml`）自动校验版本一致性、编译打包、创建 GitHub Release。

## 测试手顺

> 详细的 UI 手动测试步骤请参阅 [manual-test-guide.md](.github/docs/testing/manual-test-guide.md)。

## CI 检查说明

> 详细的 CI 检查规则文档已独立维护，请参阅 [ci-checks.md](.github/docs/ci/ci-checks.md)。

## 相关链接

### 本项目

- [HoshimiNest](https://github.com/VaillerTeeter/HoshimiNest) — 本仓库

### Bangumi

- [Bangumi 番组计划](https://bgm.tv/) — 目标数据平台
- [bangumi/api](https://github.com/bangumi/api) — Bangumi 官方 API 仓库
- [Bangumi API 文档](https://bangumi.github.io/api/) — 在线 API 文档（Swagger UI）
- [Bangumi Personal Access Token](https://next.bgm.tv/demo/access-token) — 创建用于认证的 Access Token

### 资源平台

- [Nyaa.si](https://nyaa.si/) — 番剧资源搜索平台（字幕组磁力资源）

### 下载核心

- [aria2](https://aria2.github.io/) — 高性能多协议下载工具（本项目以 Tauri sidecar 方式内嵌）
- [aria2 JSON-RPC 协议文档](https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface) — aria2 RPC 接口参考
- [MKVToolNix](https://mkvtoolnix.download/) — MKV 封装工具集（mkvmerge 以 Tauri sidecar 方式内嵌，用于轨道合并）

### 前端 UI

- [animal-island-ui](https://github.com/ShenQingchuan/animal-island-ui) — 项目使用的 React 组件库（Button / Icon / Modal / Table 等）

### Bangumi API 客户端

- [bangumi-api-client](https://www.npmjs.com/package/bangumi-api-client) — TypeScript Bangumi API 客户端（本项目使用）

### 技术栈

- [Tauri v2](https://tauri.app/) — Windows 桌面应用框架（Rust 后端 + WebView2）
- [React 19](https://react.dev/) — 前端 UI 框架
- [Vite 8](https://vite.dev/) — 前端构建工具（版本号构建期注入）
- [TypeScript](https://www.typescriptlang.org/) — 类型安全的 JavaScript 超集
- React Context — 全局状态（`src/store/` 中的 Provider + hook，未引入额外状态库）
- [Tokio](https://tokio.rs/) — Rust 异步运行时（aria2 轮询、RPC 调用）
- [reqwest](https://docs.rs/reqwest/) — Rust HTTP 客户端（aria2 JSON-RPC、外部网页抓取）
- [Serde](https://serde.rs/) — Rust 序列化 / 反序列化框架

### CI / Lint 工具

- [ESLint](https://eslint.org/) — TypeScript/React 静态分析
- [Prettier](https://prettier.io/) — 代码格式化
- [Stylelint](https://stylelint.io/) — CSS 规范检查
- [Clippy](https://doc.rust-lang.org/clippy/) — Rust 静态分析
- [markdownlint-cli](https://github.com/igorshubovych/markdownlint-cli) — Markdown 规范检查
- [CSpell](https://cspell.org/) — 拼写检查
- [Gitleaks](https://gitleaks.io/) — 密钥 / 凭据泄露扫描
- [Semgrep](https://semgrep.dev/) — OWASP Top 10 安全扫描
- [Knip](https://knip.dev/) — 未使用导出 / 依赖检测
- [Commitlint](https://commitlint.js.org/) — Commit message 规范校验

### 作者

- [GitHub Profile](https://github.com/VaillerTeeter)
