# MikanBox

基于 [Bangumi API](https://github.com/bangumi/api) 的 Windows 桌面番剧管理工具，使用 Tauri v2 + React + TypeScript + Rust 构建。

## 已实现功能

- **季度番剧查询** — 按年份 + 季度浏览 Bangumi 番剧列表，支持平台 / 来源 / 标签 / 地区 / 受众多维筛选，查看详情、评分、简介、剧集、角色、演职人员
- **追番管理** — 正在追番 / 补番计划 / 已完番剧三状态收藏，周历视图、网格视图切换
- **资源搜索** — 搜索 Nyaa 字幕组资源，支持多关键词 AND / OR / NOT 逻辑组合，一键添加磁力下载
- **番剧下载** — 内嵌 aria2c sidecar，磁力链接下载，任务全生命周期管理（下载中 / 暂停 / 恢复 / 取消 / 重启），状态机防止非法转换；显示阶段、连接数、做种数诊断信息；下载设置弹窗支持 BT Tracker 列表管理、高级参数配置（最大 Peer 数 / 磁盘缓存 / 监听端口），配置全部持久化到磁盘，支持 JSON 导入 / 导出，脏标记提示未保存修改
- **轨道合并** — MKV 轨道工坊，识别视频 / 音频 / 字幕轨道，支持双文件队列合并（A 版视频 + B 版字幕），实时进度推送，自动清空轨道名称，输出目录默认为 A 版文件所在目录；内嵌 mkvmerge sidecar

## 规划中

- **RSS 自动订阅** — 订阅蜜柑计划 / Nyaa RSS 源，按番剧 + 字幕组规则自动匹配新集并推送到下载队列，无需手动搜索
- **文件自动重命名** — 下载完成后按 `[字幕组] 番剧名 - 集数 [分辨率].mkv` 规范自动重命名，支持自定义模板
- **Bangumi 进度同步** — 在追番页一键将本地观看进度（已看集数）写回 Bangumi，保持在线收藏数据一致
- **本地视频库** — 扫描指定目录，将本地 MKV / MP4 文件与 Bangumi 番剧条目自动关联，支持调用外部播放器
- **桌面通知** — 下载完成、新集到达、合并结束时推送 Windows 系统通知
- **外部磁力链接下载** — 支持直接输入外部磁力链接进行下载，不限于 Nyaa 搜索结果
- **完善测试文档** — 补充端到端测试用例与自动化测试流程，提升项目可维护性

## 目录结构

```text
.
├── .clineignore
├── .clinerules/                               # Cline AI 编码规范（自动加载）
│   ├── backend-rules.md                       # Tauri v2 / Rust 后端规范
│   ├── frontend-rules.md                      # React / TypeScript / CSS / Zustand 规范
│   ├── git-workflow.md                        # Git 操作约束（MCP 写入 / git 只读）
│   └── project-identity.md                    # 项目身份与架构声明
├── .editorconfig                              # 编辑器通用格式规范（缩进/换行/编码）
├── .github/                                   # GitHub 仓库配置与文档
│   ├── ISSUE_TEMPLATE/                        # Issue 模板（中英文 bug/feature 各一份）
│   │   ├── bug_report_en.md
│   │   ├── bug_report_zh.md
│   │   ├── config.yml
│   │   ├── feature_request_en.md
│   │   └── feature_request_zh.md
│   ├── PULL_REQUEST_TEMPLATE.md               # PR 描述模板
│   ├── dependabot.yml                         # Dependabot 自动依赖更新配置
│   ├── docs/                                  # 项目文档
│   │   ├── ci/
│   │   │   └── ci-checks.md                   # CI 检查规则说明
│   │   └── testing/
│   │       ├── manual-test-guide.md           # 手动测试指南
│   │       └── screenshots/                   # 测试截图（42 张）
│   ├── scripts/
│   │   └── ai-review.mjs                      # AI 代码审查脚本
│   └── workflows/
│       ├── lint.yml                           # CI Lint 工作流（15 项检查）
│       └── review-command.yml                 # Review 命令工作流
├── .gitignore                                 # Git 忽略规则
├── .lintrc/                                   # 各工具 Lint 配置
│   ├── backend/
│   │   └── rust/
│   │       ├── .clippy.toml                   # Clippy 静态分析规则
│   │       └── rustfmt.toml                   # Rust 代码格式化配置
│   ├── data-formats/
│   │   ├── toml/
│   │   │   └── taplo.toml                     # TOML 格式化配置
│   │   └── yaml/
│   │       └── issue-config.schema.json       # YAML Issue 配置 schema
│   ├── docs/
│   │   └── markdown/
│   │       └── .markdownlint.json             # Markdown lint 规则
│   ├── frontend/
│   │   ├── css-styles/
│   │   │   └── .stylelintrc.json              # CSS/Stylelint 规则
│   │   ├── knip.json                          # Knip 未使用导出检查配置
│   │   ├── prettier/
│   │   │   └── .prettierrc                    # Prettier 格式化配置
│   │   └── typescript/
│   │       ├── .eslintrc-ts.json              # ESLint TypeScript/React 规则
│   │       └── tsconfig-lint.json             # ESLint 专用 tsconfig
│   ├── general/
│   │   ├── .ls-lint.yml                       # 文件命名规范检查
│   │   ├── .yamllint.yml                      # YAML lint 规则
│   │   └── cspell.json                        # 拼写检查词典配置
│   ├── git/
│   │   └── .commitlintrc.cjs                  # Commit message 规范
│   ├── infrastructure/
│   │   └── shell/
│   │       ├── .shellcheckrc                  # ShellCheck 配置
│   │       └── PSScriptAnalyzerSettings.psd1  # PowerShell 静态分析规则
│   └── security/
│       ├── .gitleaks.toml                     # Gitleaks 密钥泄露扫描配置
│       └── .semgrep.yml                       # OWASP Top 10 安全扫描规则（TS + Rust）
├── .vscode/                                   # VS Code 工作区配置
│   ├── extensions.json                        # 推荐扩展列表
│   └── settings.json                          # 工作区设置（格式化/lint/Tauri 等）
├── CODE_OF_CONDUCT.md                         # 行为准则
├── CONTRIBUTING.md                            # 贡献指南
├── LICENSE                                    # GPL-3.0 许可证
├── README.md                                  # 本文件
├── SECURITY.md                                # 安全漏洞披露政策
├── index.html                                 # Vite 入口 HTML
├── package.json                               # npm 包定义、scripts、依赖声明
├── scripts/
│   ├── download-aria2.ps1                     # 自动下载 aria2c 二进制（Tauri sidecar）
│   ├── download-mkvmerge.ps1                  # 自动下载 mkvmerge 二进制（Tauri sidecar）
│   └── setup-windows.ps1                      # Windows 开发环境一键检查/安装脚本
├── src/                                       # React 前端源代码
│   ├── App.css                                # 全局布局与组件样式（颜色全部引用 theme.css 变量）
│   ├── App.tsx                                # 根组件（主窗口布局：顶栏 + 左侧导航栏 + 下载设置弹窗：Tracker / 高级参数 / 导入导出）
│   ├── assets/
│   │   └── fonts/
│   │       └── ZCOOLKuaiLe-Regular.ttf        # 站酷快乐体（内置，无需网络）
│   ├── main.tsx                               # React 入口
│   ├── pages/                                 # 页面组件（每项导航对应一个页面）
│   │   ├── BacklogPage.tsx                    # 补番计划
│   │   ├── DownloadPage.tsx                   # 下载管理
│   │   ├── FinishedPage.tsx                   # 已完番剧（主文件，拆分逻辑到 finished/）
│   │   ├── QueryPage/                         # 季度查询子组件
│   │   │   ├── CharacterModal.tsx             # 角色详情弹窗
│   │   │   ├── FilterGroup.tsx                # 筛选条件组
│   │   │   ├── PersonModal.tsx                # 人物详情弹窗
│   │   │   ├── queryHelpers.ts                # 查询辅助函数
│   │   │   ├── QueryResultsView.tsx           # 查询结果视图
│   │   │   ├── QuerySearchView.tsx            # 查询搜索视图
│   │   │   ├── ResultsList.tsx                # 结果列表
│   │   │   ├── SubjectDetail.tsx              # 番剧详情
│   │   │   ├── useQueryPageState.ts           # 查询页面状态 hook
│   │   │   └── useSubjectData.ts              # 番剧数据 hook
│   │   ├── QueryPage.tsx                      # 季度查询（主页面）
│   │   ├── SearchPage/                        # 资源搜索子组件
│   │   │   ├── SearchTable.tsx                # 搜索结果表格
│   │   │   ├── types.ts                       # 类型定义
│   │   │   └── useSearchPage.ts               # 搜索页面状态 hook
│   │   ├── SearchPage.tsx                     # 搜索资源（主页面）
│   │   ├── TracksPage.tsx                     # 轨道工坊（主文件，拆分逻辑到 tracks/）
│   │   ├── WatchListPage.tsx                  # 追番列表基础页（主文件，拆分逻辑到 watchlist/）
│   │   ├── WatchingPage.tsx                   # 正在追番
│   │   ├── finished/                          # 已完番剧子组件
│   │   │   ├── DetailModal.tsx                # 番剧详情弹窗
│   │   │   ├── EpisodeList.tsx                # 剧集列表
│   │   │   ├── FinishedCard.tsx               # 番剧卡片
│   │   │   ├── finishedUtils.ts               # 工具函数
│   │   │   ├── PeopleModals.tsx               # 人物弹窗
│   │   │   └── useSubjectData.ts              # 番剧数据 hook
│   │   ├── tracks/                            # 轨道工坊子组件
│   │   │   ├── constants.ts                   # 常量定义
│   │   │   ├── FilePanel.tsx                  # 文件队列面板
│   │   │   ├── TrackRow.tsx                   # 轨道行组件
│   │   │   ├── types.ts                       # 类型定义
│   │   │   └── useTracksPage.ts               # 轨道页面状态 hook
│   │   └── watchlist/                         # 追番列表子组件
│   │       ├── CharactersModal.tsx            # 角色列表弹窗
│   │       ├── constants.ts                   # 常量定义
│   │       ├── DetailModal.tsx                # 番剧详情弹窗
│   │       ├── EpisodePills.tsx               # 剧集进度胶囊
│   │       ├── LayoutContents.tsx             # 布局内容（周历/网格）
│   │       ├── PersonsModal.tsx               # 人物列表弹窗
│   │       ├── SubjectCard.tsx                # 番剧卡片
│   │       ├── types.ts                       # 类型定义
│   │       └── useWatchListPage.ts            # 追番页面状态 hook
│   ├── store/                                 # 全局状态
│   │   ├── downloadStore.tsx                  # 下载任务 Context（状态机 + aria2 事件 + localStorage）
│   │   └── watchStore.ts                      # 追番收藏 localStorage 工具函数
│   ├── styles/
│   │   ├── fonts.css                          # @font-face 声明（引用内置字体文件）
│   │   └── theme.css                          # 主题 CSS 变量（皮肤切换入口）
│   └── vite-env.d.ts                          # Vite 类型声明
├── src-tauri/                                 # Tauri/Rust 后端
│   ├── Cargo.lock                             # 依赖版本锁定
│   ├── Cargo.toml                             # Rust 包定义与依赖声明
│   ├── app-config.json                        # Tauri 应用配置 JSON
│   ├── build.rs                               # Tauri 构建脚本
│   ├── capabilities/
│   │   └── default.json                       # Tauri ACL 权限配置
│   ├── icons/                                 # 应用图标（Windows Store 等多尺寸）
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── 32x32.png
│   │   ├── Square107x107Logo.png
│   │   ├── Square142x142Logo.png
│   │   ├── Square150x150Logo.png
│   │   ├── Square284x284Logo.png
│   │   ├── Square30x30Logo.png
│   │   ├── Square310x310Logo.png
│   │   ├── Square44x44Logo.png
│   │   ├── Square71x71Logo.png
│   │   ├── Square89x89Logo.png
│   │   ├── StoreLogo.png
│   │   ├── icon.icns
│   │   ├── icon.ico
│   │   └── icon.png
│   ├── src/
│   │   ├── lib.rs                             # Tauri 命令 + aria2 控制 + mkvmerge 轨道识别与合并 + BT Tracker 持久化 + 高级参数持久化（AdvancedConfig）
│   │   └── main.rs                            # Rust 程序入口
│   └── tauri.conf.json                        # Tauri 应用配置（窗口/bundle/权限）
├── tsconfig.json                              # TypeScript 编译配置（前端）
├── tsconfig.node.json                         # TypeScript 配置（Vite 配置文件）
├── vite.config.ts                             # Vite 构建配置
└── yarn.lock                                  # Yarn 依赖版本锁定
```

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
yarn tauri dev
```

### 构建

```bash
# 构建 Windows 安装包（需在 Windows 上运行）
yarn tauri build
```

## 测试手顺

> 详细的 UI 手动测试步骤请参阅 [manual-test-guide.md](.github/docs/testing/manual-test-guide.md)。

## CI 检查说明

> 详细的 CI 检查规则文档已独立维护，请参阅 [ci-checks.md](.github/docs/ci/ci-checks.md)。

## 相关链接

### 本项目

- [MikanBox](https://github.com/VaillerTeeter/MikanBox) — 本仓库

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
- [Vite 7](https://vite.dev/) — 前端构建工具
- [TypeScript](https://www.typescriptlang.org/) — 类型安全的 JavaScript 超集
- [Tokio](https://tokio.rs/) — Rust 异步运行时（aria2 轮询、RPC 调用）
- [reqwest](https://docs.rs/reqwest/) — Rust HTTP 客户端（aria2 JSON-RPC 通信）
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
