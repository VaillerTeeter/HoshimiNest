# CI 检查说明

本项目有以下 GitHub Actions 工作流：

| 工作流 | 文件 | 说明 |
| --- | --- | --- |
| Lint | [lint.yml](../../../.github/workflows/lint.yml) | 代码质量、格式、安全扫描 |
| PR Review Command | [review-command.yml](../../../.github/workflows/review-command.yml) | AI 代码审查（`/review`、`/review-all` 命令） |

---

## Lint 工作流

所有 Pull Request 合并到 `master` 前，必须通过 [.github/workflows/lint.yml](../../../.github/workflows/lint.yml) 中定义的所有检查。

### 触发时机

- **PR 创建 / 更新**：目标分支为 `master` 时自动触发
- **直接 push 到 master**：同样触发检查

---

## Markdown Lint

**工具**：[markdownlint-cli2-action@v23](https://github.com/DavidAnson/markdownlint-cli2-action)
**配置**：[.lintrc/docs/markdown/.markdownlint.json](../../../.lintrc/docs/markdown/.markdownlint.json)
**扫描范围**：`**/*.md`

| 规则 | 状态 | 说明 |
| --- | --- | --- |
| 默认全部规则 | ✅ 启用 | 标题格式、列表缩进、空行等 |
| MD013 行长度 | ⚙️ 放宽 | 最长 400 字符，表格和代码块不限 |
| MD033 内联 HTML | ⚙️ 部分允许 | 仅允许 `<!--` 注释标签 |
| MD041 首行必须是 H1 | ❌ 关闭 | 允许文件不以 H1 开头 |

---

## YAML Lint

**工具**：[yamllint](https://yamllint.readthedocs.io/) 1.35.1
**配置**：[.lintrc/general/.yamllint.yml](../../../.lintrc/general/.yamllint.yml)
**扫描范围**：所有 `*.yml` / `*.yaml`，排除 `node_modules`、`src-tauri/target`、`dist`

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| 基础规则 | `extends: default` | yamllint 默认规则集 |
| 行长度 | 最长 200 字符 | 放宽默认 80 字符限制（CI workflow 中 run 块较长） |
| 布尔值写法 | `true` / `false` / `on` | 允许 `on` 用于 GitHub Actions 触发器 |
| 注释间距 | 最少 1 个空格 | 允许紧贴内容后添加注释 |

---

## TOML Lint

**工具**：[taplo](https://taplo.tamasfe.dev/) 0.9.3
**配置**：[.lintrc/data-formats/toml/taplo.toml](../../../.lintrc/data-formats/toml/taplo.toml)
**扫描范围**：所有 `*.toml`，排除 `.git/`、`src-tauri/target/`

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| 格式对齐 | `align_entries = true` | key-value 条目纵向对齐 |
| 列宽 | `column_width = 100` | 最大行宽 100 字符 |
| 数组紧凑 | `compact_arrays = false` | 多行展开数组 |
| 表格缩进 | `indent_tables = true` | 嵌套表格缩进 |
| Cargo.lock | 跳过格式检查 | 自动生成文件，仅对 `Cargo.toml` 格式化 |

---

## TypeScript / React Lint

**工具**：ESLint 8 + Prettier 3 + tsc
**配置**：

- ESLint：[.lintrc/frontend/typescript/.eslintrc-ts.json](../../../.lintrc/frontend/typescript/.eslintrc-ts.json)
- Prettier：[.lintrc/frontend/prettier/.prettierrc](../../../.lintrc/frontend/prettier/.prettierrc)
- tsc：[tsconfig.json](../../../tsconfig.json)（lint 专用：[.lintrc/frontend/typescript/tsconfig-lint.json](../../../.lintrc/frontend/typescript/tsconfig-lint.json)）

**扫描范围**：`src/**/*.{ts,tsx}`

### ESLint 插件

| 插件 | 说明 |
| --- | --- |
| `@typescript-eslint/strict-type-checked` | TypeScript 严格类型规则（需类型信息） |
| `@typescript-eslint/stylistic-type-checked` | TypeScript 风格规则 |
| `eslint-plugin-react` | React 最佳实践（关闭 `react-in-jsx-scope`，适配 React 19） |
| `eslint-plugin-react-hooks` | Hooks 使用规范（exhaustive-deps 等） |
| `eslint-plugin-jsx-a11y` | JSX 无障碍规则 |
| `eslint-plugin-import` | 模块导入顺序、循环依赖检测 |
| `eslint-plugin-unicorn` | 现代 JS/TS 最佳实践 |
| `eslint-plugin-sonarjs` | SonarQube 代码质量规则 |
| `eslint-plugin-security` | 安全漏洞检测 |
| `eslint-plugin-promise` | Promise 使用规范 |
| `eslint-plugin-jsdoc` | JSDoc 注释规范 |

### 关键规则

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| `no-explicit-any` | error | 禁止使用 `any` 类型 |
| `explicit-function-return-type` | error | 函数必须声明返回类型 |
| `no-floating-promises` | error | Promise 必须处理或 await |
| `strict-boolean-expressions` | error | 禁止隐式布尔转换 |
| `consistent-type-imports` | error | 类型导入必须使用 `import type` |
| `no-unsafe-*` | error | 禁止不安全的类型操作 |
| `max-lines-per-function` | error | 单函数最多 60 行 |
| `max-lines` | error | 单文件最多 500 行 |
| `complexity` | error | 圈复杂度最大 12 |
| `import/no-cycle` | error | 禁止循环依赖 |
| `react/no-danger` | error | 禁止 `dangerouslySetInnerHTML` |
| `react-hooks/rules-of-hooks` | error | 强制 Hooks 调用规则 |
| `react-hooks/exhaustive-deps` | error | 检测 useEffect 依赖缺失 |
| `jsx-a11y/alt-text` | error | 图片必须有 alt 属性 |

---

## CSS Lint

**工具**：[Stylelint](https://stylelint.io/) 16
**配置**：[.lintrc/frontend/css-styles/.stylelintrc.json](../../../.lintrc/frontend/css-styles/.stylelintrc.json)
**扫描范围**：`src/**/*.css`

| 扩展 | 说明 |
| --- | --- |
| `stylelint-config-standard` | Stylelint 官方标准规则集 |
| `stylelint-config-recess-order` | CSS 属性顺序（Bootstrap/Recess 顺序） |
| `stylelint-config-tailwindcss` | 兼容 Tailwind CSS 指令（`@apply`、`@layer` 等） |

| 关键规则 | 配置 | 说明 |
| --- | --- | --- |
| `color-function-notation` | modern | 使用 `rgb()` / `hsl()` 现代写法 |
| `alpha-value-notation` | percentage | 透明度使用百分比（`opacity` 除外） |
| `declaration-block-single-line-max-declarations` | 1 | 单行最多一条声明 |
| `selector-max-type` | 1 | 最多使用一个类型选择器 |
| `declaration-property-value-disallowed-list` | 全方向 border 禁用 | 禁止指定方向 border 的简写，改用 `border-color` 等分属性 |

---

## Rust Lint

**工具**：clippy + rustfmt（stable 工具链）
**配置**：

- Clippy：[.lintrc/backend/rust/.clippy.toml](../../../.lintrc/backend/rust/.clippy.toml)
- rustfmt：[.lintrc/backend/rust/rustfmt.toml](../../../.lintrc/backend/rust/rustfmt.toml)

**扫描范围**：`src-tauri/`（Cargo workspace 根）

| 检查 | 命令 | 说明 |
| --- | --- | --- |
| 格式 | `cargo fmt --all -- --check` | 检查是否已按 rustfmt.toml 格式化 |
| 静态分析 | `cargo clippy --all-targets -- -D warnings` | 所有 clippy lint，警告即失败 |

### 关键 Clippy 配置

| 选项 | 值 | 说明 |
| --- | --- | --- |
| `msrv` | `1.80.0` | 最低支持 Rust 版本 |
| `cognitive-complexity-threshold` | `10` | 认知复杂度阈值 |
| `excessive-nesting-threshold` | `5` | 最大嵌套深度 |
| `max-fn-params-bools` | `2` | 函数参数中 bool 最多 2 个 |
| `disallowed-macros` | `panic!`、`todo!`、`unimplemented!`、`unreachable!`、`dbg!`、`print!`、`println!`、`eprint!`、`eprintln!` | 禁止使用的宏 |
| `allow-unwrap-in-tests` | `false` | 测试代码中也禁止 unwrap |

### 关键 rustfmt 配置

| 选项 | 值 | 说明 |
| --- | --- | --- |
| `trailing_comma` | `Always` | 始终添加尾随逗号 |
| `use_small_heuristics` | `Off` | 关闭启发式换行，保持格式严格一致 |
| `newline_style` | `Unix` | 统一使用 LF 换行 |

---

## Shell Lint

**工具**：[ShellCheck](https://www.shellcheck.net/) via [ludeeus/action-shellcheck@2.0.0](https://github.com/ludeeus/action-shellcheck)
**配置**：[.lintrc/infrastructure/shell/.shellcheckrc](../../../.lintrc/infrastructure/shell/.shellcheckrc)
**扫描范围**：仓库中所有 shell 脚本（`.sh`）
**严重级别**：`style`（捕获所有级别：style / info / warning / error）

| 配置 | 值 | 说明 |
| --- | --- | --- |
| `shell` | `bash` | 目标 shell 方言 |
| `enable` | `all` | 启用全部可选检查（`avoid-nullary-conditions`、`require-variable-braces` 等） |

---

## PowerShell Lint

**工具**：[PSScriptAnalyzer](https://github.com/PowerShell/PSScriptAnalyzer)（最新版）
**配置**：[.lintrc/infrastructure/shell/PSScriptAnalyzerSettings.psd1](../../../.lintrc/infrastructure/shell/PSScriptAnalyzerSettings.psd1)
**扫描范围**：`scripts/` 目录下所有 `.ps1` 文件
**Runner**：`windows-latest`（PowerShell 原生环境）

| 关键规则 | 说明 |
| --- | --- |
| `PSAvoidLongLines` | 最长 100 字符 |
| `PSPlaceOpenBrace` / `PSPlaceCloseBrace` | 大括号风格：开括号同行，闭括号独行 |
| `PSUseConsistentIndentation` | 4 空格缩进，Pipeline 每段独立缩进 |
| `PSUseConsistentWhitespace` | 运算符、管道、参数分隔符前后空格一致 |
| `PSUseCorrectCasing` | Cmdlet 名称大小写必须与官方一致 |
| `PSAvoidUsingCmdletAliases` | 禁止所有 Cmdlet 别名（`AllowList = @()`，`ls`/`dir`/`cat` 等全部禁用） |
| `PSAvoidUsingPositionalParameters` | 禁止使用位置参数，必须显式命名 |
| `PSUseCompatibleSyntax` | 兼容 PS 5.1 / 7.2 / 7.4 语法 |
| `ExcludeRules` | 空（无任何规则豁免） |

---

## React Doctor

**工具**：[React Doctor](https://github.com/millionco/react-doctor)（`millionco/react-doctor@main`）
**用途**：React 代码质量扫描，检测组件过度渲染、不必要的 memoization 等问题
**权限**：`contents: read`、`pull-requests: write`、`statuses: write`

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| `blocking` | `warning` | Warning 级别意见会阻止通过 |
| `comment` | `true` | 在 PR 中发布审查摘要评论 |
| `review-comments` | `true` | 以 PR review comments 形式发布逐行诊断 |

---

## Secret Scan

**工具**：[Gitleaks](https://github.com/gitleaks/gitleaks-action) v2
**配置**：[.lintrc/security/.gitleaks.toml](../../../.lintrc/security/.gitleaks.toml)

- 基于默认规则集（`useDefault = true`）扫描提交历史中的密钥泄漏
- 自定义检测：通用 API Key、通用 Secret 模式
- 白名单：示例凭证（文档用途）、GitHub Actions `${{ secrets.* }}` 引用、`yarn.lock`、`Cargo.lock`

---

## Semgrep Security Scan

**工具**：[Semgrep](https://semgrep.dev/)（最新版）
**配置**：[.lintrc/security/.semgrep.yml](../../../.lintrc/security/.semgrep.yml)
**扫描范围**：`src/`（TypeScript/React 前端）、`src-tauri/src/`（Rust 后端）
**附加规则集**：`p/owasp-top-ten`、`p/secrets`

覆盖 OWASP Top 10 2021 中适用于 TypeScript + Rust 的规则：

| 类别 | 规则示例 |
| --- | --- |
| A01 访问控制 | 硬编码角色判断、路径遍历（JS + Rust）、`opener::open` 用户输入 |
| A02 加密失效 | 硬编码凭证（JS + Rust）、`Math.random()`、硬编码 IV |
| A03 注入 | SQL 拼接、`eval()`、`innerHTML` 赋值、`dangerouslySetInnerHTML`、OS 命令注入（JS + Rust）、`unsafe` 块、`mem::transmute` |
| A04 不安全设计 | `localStorage` 存储 token/password |
| A05 安全配置 | `debug=true`、CORS 通配符、HTTP 请求、`postMessage` 缺少 origin 校验、`unwrap()`/`expect()` |
| A07 认证失效 | 不带 flags 的 Cookie、弱 JWT 算法（HS256/none） |
| A09 日志监控 | 日志中含 password/token/secret |
| A10 SSRF | 用户控制的 URL 直接传入 `fetch()`/`axios` |
| Rust 专项 | `mem::forget`、`unsafe` 块缺少 `SAFETY:` 注释 |

---

## Commit Message Lint

**工具**：[@commitlint/cli](https://commitlint.js.org/) 19.6.0
**配置**：[.lintrc/git/.commitlintrc.cjs](../../../.lintrc/git/.commitlintrc.cjs)
**触发**：仅在 PR 时运行（不检查直接 push 的提交）

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| type 枚举 | feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert/security/deps | 必须使用规定类型 |
| subject 长度 | 10–100 字符 | |
| header 长度 | 最长 120 字符 | |
| header 最短 | 15 字符 | 防止过于简短的描述 |
| subject 大小写 | 禁止首字母大写、PascalCase、全大写 | |

---

## Spelling Check

**工具**：[cspell](https://cspell.org/) 8.17.1
**配置**：[.lintrc/general/cspell.json](../../../.lintrc/general/cspell.json)
**扫描范围**：全仓库（排除 `node_modules`、`.git`、`dist`、`.lintrc`、`src-tauri/target`、锁文件）

- 使用英语词典（`en_US`）+ 软件术语、TypeScript、Node.js、npm、bash、git 等专业词典
- 自定义词汇（`words[]`）：随项目开发逐步填入（Tauri、Bangumi 领域词汇、组件名等）
- `flagWords`：常见笔误（`teh`、`recieve` 等）触发报错 <!-- cspell:ignore teh recieve -->
- `minWordLength: 4`，不检测 3 字符以下的单词

---

## Dead Code Detection

**工具**：[Knip](https://knip.dev/) 5.38.0
**配置**：[.lintrc/frontend/knip.json](../../../.lintrc/frontend/knip.json)

- **入口**：`src/main.tsx`、`vite.config.ts`，从入口追溯可达性
- **扫描范围**：`src/**/*.{ts,tsx}`、`vite.config.ts`
- 检测：未使用文件、未使用依赖、未列出依赖、重复导出等
- `includeEntryExports: false`：从入口导出的公开 API 不纳入死代码检测
- 忽略二进制：`commitlint`、`cspell`、`eslint`、`prettier`、`tauri`（由外部工具调用）

---

## File Naming Check

**工具**：[ls-lint](https://ls-lint.org/) 2.3.1
**配置**：[.lintrc/general/.ls-lint.yml](../../../.lintrc/general/.ls-lint.yml)

### 全局默认规则

| 文件类型 | 规则 | 示例 |
| --- | --- | --- |
| `.ts` | `kebab-case` 或 `camelCase` | `api-client.ts`、`apiClient.ts` |
| `.tsx` | `PascalCase` 或 `camelCase` | `AppShell.tsx`、`useTheme.tsx` |
| `.css` | `kebab-case` 或 `camelCase` | `app-shell.css`、`appShell.css` |
| `.json` | `kebab-case` 或 `camelCase` | `package.json` |
| `.yml` / `.yaml` | `kebab-case` 或全大写 | `lint.yml`、`CODEOWNERS` |
| `.md` | `SCREAMING_SNAKE_CASE` 或 `kebab-case` 或 `snake_case` | `README.md`、`ci-checks.md` |
| `.toml` | `kebab-case` 或 `snake_case` | `Cargo.toml`、`tauri.conf.json` |

### 目录级覆盖规则

| 目录 | 文件类型 | 规则 |
| --- | --- | --- |
| `.github/` | `.yml` / `.yaml` | 仅 `kebab-case` |
| `scripts/` | `.ps1` | `kebab-case` |
| `src-tauri/` | `.rs` | `snake_case` |
| `src-tauri/` | `.toml` / `.json` | `kebab-case` 或 `snake_case` |

**忽略路径**：`.git`、`node_modules`、`dist`、`src-tauri/target`

---

## Summary Gate

Lint 工作流中所有独立 job 通过后，`all-checks` 汇总 gate 将所有结果聚合为单一状态检查 `All Lint Checks Passed`。

| 前置 job | 说明 |
| --- | --- |
| `markdown-lint` | Markdown 格式 |
| `yaml-lint` | YAML 格式 |
| `toml-lint` | TOML 格式 |
| `typescript-lint` | TypeScript / React（ESLint + Prettier + tsc） |
| `stylelint-lint` | CSS |
| `rust-lint` | Rust（clippy + rustfmt） |
| `shell-lint` | Shell 脚本 |
| `react-doctor` | React 代码质量扫描 |
| `powershell-lint` | PowerShell 脚本 |
| `secret-scan` | Gitleaks 密钥泄漏扫描 |
| `semgrep-scan` | Semgrep 安全扫描 |
| `commitlint-lint` | 提交信息规范 |
| `cspell-lint` | 拼写检查 |
| `knip-lint` | 死代码检测 |
| `ls-lint` | 文件命名规范 |

**机制**：使用 `if: always()` 确保 gate 始终运行，通过 `needs.*.result` 检查所有前置 job 的结果。任何 job 失败或取消时，gate 报错退出。此 gate 被配置为仓库的必需状态检查，必须通过方可合并 PR。

---

## PR Review Command 工作流

通过 PR 评论中的命令触发 AI 代码审查，由 [.github/workflows/review-command.yml](../../../.github/workflows/review-command.yml) 定义。

### 触发方式

在 PR 中发布 issue comment 包含以下命令：

| 命令 | 审查范围 | 说明 |
| --- | --- | --- |
| `/review` | 增量（diff） | 仅审查当前 PR 的变更 |
| `/review-all` | 全量（full） | 审查 PR 涉及的全部文件 |

### 执行流程

1. **检出 PR 代码**：`refs/pull/<number>/head`
2. **设置 Node.js 24** 环境
3. **执行**：`node .github/scripts/ai-review.mjs`

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `GITHUB_TOKEN` | `${{ secrets.GITHUB_TOKEN }}` |
| `OPENAI_API_KEY` | `${{ secrets.CLINE_API_KEY }}` |
| `OPENAI_API_ENDPOINT` | `https://api.cline.bot/api/v1` |
| `MODEL` | `deepseek/deepseek-v4-pro` |
| `LANGUAGE` | `Chinese`（审查意见语言） |
| `REVIEW_MODE` | 根据命令自动设置（`full` 或 `diff`） |

### 权限

`contents: read`、`pull-requests: write`（需要 `pull-requests: write` 以发布审查评论）
