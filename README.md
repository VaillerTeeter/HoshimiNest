# Example-of-Github-Repo

个人代码示例仓库，收录各类语言和框架的代码片段与实践示例。

## 目录结构

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── config.yml                # 禁用空白 Issue，配置联系链接
│   │   ├── bug_report_zh.md          # Bug 报告模板（中文）
│   │   ├── bug_report_en.md          # Bug Report Template (English)
│   │   ├── feature_request_zh.md     # 功能请求模板（中文）
│   │   └── feature_request_en.md     # Feature Request Template (English)
│   ├── docs/
│   │   ├── ci/
│   │   │   └── ci-checks.md                 # CI 检查说明（详细规则文档）
│   │   ├── hooks/
│   │   │   └── git-guard.md                 # git-guard Hook 说明文档
│   │   ├── mcp/
│   │   │   └── github-tools.md              # GitHub MCP 工具清单
│   │   └── settings/
│   │       ├── settings-general.md
│   │       ├── settings-branches.md
│   │       ├── settings-rules-rulesets.md
│   │       ├── settings-actions.md
│   │       ├── settings-advanced-security.md
│   │       └── ...（共 19 个 GitHub 仓库配置说明文档）
│   ├── hooks/
│   │   ├── git-guard.json            # PreToolUse Hook 注册配置
│   │   └── scripts/
│   │       └── git-guard.sh          # git/gh 写操作拦截脚本
│   ├── instructions/
│   │   └── git-workflow.instructions.md  # AI Git 工作流规范（Copilot 指令文件）
│   ├── workflows/
│   │   └── lint.yml                  # 多语言 lint CI（103 个 job，覆盖所有语言/格式/安全/文档/构建工具）
│   ├── dependabot.yml                # 自动更新 Actions 依赖（每周一）
│   └── PULL_REQUEST_TEMPLATE.md      # PR 模板（中英双语）
├── .lintrc/                          # 所有 lint 配置文件（按功能分类）
│   ├── backend/                      # 后端语言
│   │   ├── c-cpp/
│   │   │   ├── .clang-format         # C/C++ 代码格式化（clang-format）
│   │   │   ├── .clang-tidy           # C 静态分析（clang-tidy）
│   │   │   └── .clang-tidy-cpp       # C++ 静态分析（clang-tidy）
│   │   ├── clojure/
│   │   │   └── config.edn            # Clojure 静态分析（clj-kondo）
│   │   ├── crystal/
│   │   │   └── .ameba.yml            # Crystal 静态分析（Ameba）
│   │   ├── csharp/
│   │   │   ├── .csharp-rules.xml     # C# 编码规范（Roslyn 分析器）
│   │   │   └── .editorconfig-csharp  # C# 格式化规则（dotnet-format）
│   │   ├── dart/
│   │   │   └── analysis_options.yaml # Dart/Flutter 静态分析（dart analyze）
│   │   ├── elixir/
│   │   │   └── .credo.exs            # Elixir 代码检查（Credo）
│   │   ├── erlang/
│   │   │   └── .elvis.config         # Erlang 代码检查（Elvis）
│   │   ├── fsharp/
│   │   │   └── fsharplint.json       # F# 静态分析（FSharpLint）
│   │   ├── go/
│   │   │   └── .golangci.yml         # Go lint 规则（golangci-lint）
│   │   ├── groovy/
│   │   │   └── codenarc.xml          # Groovy 静态分析（CodeNarc）
│   │   ├── haskell/
│   │   │   └── .hlint.yaml           # Haskell 代码检查（HLint）
│   │   ├── java/
│   │   │   ├── checkstyle.xml        # Java 编码规范（Checkstyle）
│   │   │   ├── pmd-ruleset.xml       # Java 静态分析（PMD）
│   │   │   └── spotbugs-exclude.xml  # SpotBugs 排除过滤器
│   │   ├── julia/
│   │   │   └── .JuliaFormatter.toml  # Julia 代码格式化（JuliaFormatter）
│   │   ├── kotlin/
│   │   │   ├── detekt.yml            # Kotlin 静态分析（Detekt）
│   │   │   └── .editorconfig-kotlin  # Kotlin 格式化规则（ktlint）
│   │   ├── lua/
│   │   │   ├── .luacheckrc           # Lua 静态分析（luacheck）
│   │   │   └── stylua.toml           # Lua 代码格式化（StyLua）
│   │   ├── nix/
│   │   │   └── .statix.toml          # Nix 静态分析（statix）
│   │   ├── ocaml/
│   │   │   └── .ocamlformat          # OCaml 代码格式化（ocamlformat）
│   │   ├── perl/
│   │   │   └── .perlcriticrc         # Perl 静态分析（Perl::Critic）
│   │   ├── php/
│   │   │   ├── .php-rules.xml        # PHP 编码规范（phpcs）
│   │   │   ├── phpmd-ruleset.xml     # PHP Mess Detector 规则集
│   │   │   └── phpstan.neon          # PHP 静态分析（PHPStan）
│   │   ├── python/
│   │   │   ├── .flake8               # Python lint（flake8 + 插件）
│   │   │   ├── mypy.ini              # Python 类型检查（mypy）
│   │   │   ├── .pylintrc             # Python 静态分析（pylint）
│   │   │   ├── pyproject.toml        # Python 工具聚合配置（black/isort/bandit/pytest）
│   │   │   └── ruff.toml             # Python 极速 Linter + Formatter（Ruff）
│   │   ├── r/
│   │   │   └── .lintr                # R 代码检查（lintr）
│   │   ├── ruby/
│   │   │   └── .rubocop.yml          # Ruby lint 规则（RuboCop）
│   │   ├── rust/
│   │   │   ├── .clippy.toml          # Rust 静态分析（Clippy）
│   │   │   └── rustfmt.toml          # Rust 代码格式化（rustfmt）
│   │   ├── scala/
│   │   │   └── .scalafmt.conf        # Scala 代码格式化（Scalafmt）
│   │   ├── solidity/
│   │   │   └── .solhint.json         # Solidity 智能合约 lint（solhint）
│   │   └── swift/
│   │       └── .swiftlint.yml        # Swift lint 规则（SwiftLint）
│   ├── data-formats/                 # 数据格式
│   │   ├── graphql/
│   │   │   └── .graphqlrc.yml        # GraphQL lint（graphql-schema-linter）
│   │   ├── openapi/
│   │   │   └── .spectral.yaml        # OpenAPI/Swagger lint（Spectral）
│   │   ├── protobuf/
│   │   │   └── buf.yaml              # Protocol Buffers lint（buf）
│   │   ├── sql/
│   │   │   └── .sqlfluff             # SQL lint 配置（SQLFluff）
│   │   ├── toml/
│   │   │   └── taplo.toml            # TOML 格式化（taplo）
│   │   └── .yamllint.yml             # YAML 格式规范（yamllint 极严格）
│   ├── docs/                         # 文档工具
│   │   ├── latex/
│   │   │   └── .chktexrc             # LaTeX 代码检查（chktex）
│   │   ├── markdown/
│   │   │   └── .markdownlint.json    # Markdown lint 规则配置
│   │   └── vale.ini                  # 技术文档写作质量（Vale）
│   ├── frontend/                     # 前端 / 样式
│   │   ├── biome.json                # JS/TS 统一 Linter + Formatter（Biome）
│   │   ├── knip.json                 # 死代码 & 未使用依赖检测（Knip）
│   │   ├── css-styles/
│   │   │   ├── .stylelintrc.json     # CSS/SCSS/Less lint（Stylelint，极严格）
│   │   │   ├── .stylelintrc-scss.json # SCSS lint（stylelint + stylelint-scss）
│   │   │   └── .stylelintrc-less.json # Less lint（stylelint + postcss-less）
│   │   ├── frameworks/
│   │   │   ├── .eslintrc-astro.json  # Astro lint（eslint-plugin-astro）
│   │   │   ├── .eslintrc-svelte.json # Svelte lint（eslint-plugin-svelte）
│   │   │   └── .eslintrc-vue.json    # Vue3 lint（eslint-plugin-vue）
│   │   ├── html/
│   │   │   └── .htmlhintrc           # HTML lint 规则（HTMLHint）
│   │   ├── javascript/
│   │   │   └── .eslintrc-js.json     # JavaScript lint（ESLint + 插件）
│   │   ├── prettier/
│   │   │   └── .prettierrc           # JS/TS/Vue/CSS 格式化（Prettier）
│   │   └── typescript/
│   │       ├── .eslintrc-ts.json     # TypeScript lint（ESLint + @typescript-eslint）
│   │       └── tsconfig-lint.json    # TypeScript 类型检查（tsc --noEmit）
│   ├── general/                      # 通用工具
│   │   ├── cspell.json               # 拼写检查（CSpell）
│   │   ├── .ls-lint.yml              # 文件命名规范（ls-lint）
│   │   └── .yamllint.yml             # YAML 格式规范（yamllint，通用宽松配置）
│   ├── git/                          # Git 提交规范
│   │   └── .commitlintrc.cjs         # Commit Message 规范（commitlint）
│   ├── infrastructure/               # 基础设施
│   │   ├── checkov.yaml              # IaC 安全扫描（Checkov）
│   │   ├── ansible/
│   │   │   └── .ansible-lint.yml     # Ansible lint（ansible-lint）
│   │   ├── build-systems/
│   │   │   ├── .buildifier.json      # Bazel BUILD lint（buildifier）
│   │   │   └── .cmake-format.yml     # CMakeLists 格式化（cmake-format）
│   │   ├── cloudformation/
│   │   │   └── .cfnlintrc.yml        # AWS CloudFormation lint（cfn-lint）
│   │   ├── docker/
│   │   │   └── .hadolint.yaml        # Dockerfile lint（hadolint）
│   │   ├── kubernetes/
│   │   │   ├── .kube-linter.yaml     # Kubernetes Manifests lint（kube-linter）
│   │   │   └── kubeconform.yml       # K8s Schema 验证参数（kubeconform）
│   │   ├── shell/
│   │   │   ├── .shellcheckrc         # Bash/Shell lint（ShellCheck）
│   │   │   └── PSScriptAnalyzerSettings.psd1 # PowerShell 静态分析（PSScriptAnalyzer）
│   │   └── terraform/
│   │       └── .tflint.hcl           # Terraform lint（TFLint）
│   ├── security/                     # 安全扫描
│   │   ├── .gitleaks.toml            # Secret 泄露检测（Gitleaks）
│   │   ├── .licensed.yml             # License 合规检查（GitHub Licensed）
│   │   ├── .semgrep.yml              # 通用 SAST（Semgrep）
│   │   └── .trivyignore              # Trivy 扫描忽略列表
│   └── testing/                      # 测试工具
│       ├── .gherkin-lintrc           # Gherkin/Cucumber 场景 lint（gherkin-lint）
│       └── .robocop.toml             # Robot Framework 静态分析（Robocop）
├── .env.example                      # GitHub Token 配置模板
├── .gitignore
├── CODE_OF_CONDUCT.md                # 行为准则
├── CONTRIBUTING.md                   # 贡献指南
├── LICENSE                           # GNU GPLv3
├── README.md
└── SECURITY.md                       # 安全漏洞上报流程
```

## 本地配置

1. 复制 Token 模板文件：

    ```bash
    cp .env.example .env
    ```

2. 编辑 `.env`，填入你的 GitHub Personal Access Token：

    ```ini
    GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
    ```

    > Token 申请地址：GitHub → Settings → Developer settings → Personal access tokens

3. 加载环境变量（每次新开终端执行一次）：

    ```bash
    export GH_TOKEN="$(grep '^GH_TOKEN=' .env | cut -d= -f2- | tr -d '\r')"
    ```

4. 验证配置：

    ```bash
    gh auth status
    ```

## CI 检查说明

> 详细的 CI 检查规则文档已独立维护，请参阅 [ci-checks.md](.github/docs/ci/ci-checks.md)。

## 相关链接

- [GitHub Profile](https://github.com/VaillerTeeter)
