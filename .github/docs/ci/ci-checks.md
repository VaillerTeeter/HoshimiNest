# CI 检查说明

所有 Pull Request 合并到 `master` 前，必须通过以下自动检查（定义于 [.github/workflows/lint.yml](../../../.github/workflows/lint.yml)）：

## Markdown Lint

使用 [markdownlint-cli2-action@v23](https://github.com/DavidAnson/markdownlint-cli2-action)（markdownlint v0.40.0）检查所有 `*.md` 文件，规则如下：

| 规则 | 状态 | 说明 |
| --- | --- | --- |
| 默认全部规则 | ✅ 启用 | 包含标题格式、列表缩进、空行等 |
| MD013 行长度限制 | ❌ 关闭 | 允许长行（文档场景不适合限制行长） |
| MD033 内联 HTML | ❌ 关闭 | 允许在 Markdown 中使用 HTML 标签 |
| MD041 首行必须是 H1 | ❌ 关闭 | 允许文件不以 H1 开头 |
| MD060 表格列样式 | ✅ 启用 | 要求表格分隔行与数据行风格一致（compact） |

## YAML Lint

使用 [action-yamllint](https://github.com/ibiqlik/action-yamllint) 检查所有 `.yml` / `.yaml` 文件，规则如下：

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| 基础规则 | `extends: default` | yamllint 默认规则集 |
| 行长度 | 最长 200 字符 | 放宽默认的 80 字符限制 |
| 布尔值写法 | 仅允许 `true` / `false` / `on` | 禁止 `yes` / `no` / `off` 等写法；`on` 保留用于 GitHub Actions 触发器 |

## 触发时机

- **PR 创建 / 更新**：目标分支为 `master` 时自动触发
- **直接 push 到 master**（仅管理员可操作）：同样触发检查

---

## C 代码检查说明

所有 `*.c` / `*.h` 文件在 CI 中经过四层检查，配置文件均位于仓库根目录。

### clang-format（格式规范）

配置文件：[.clang-format](../../../.lintrc/backend/c-cpp/.clang-format)，基于 LLVM 风格定制，主要规则：

| 规则 | 配置值 | 说明 |
| --- | --- | --- |
| 缩进宽度 | 4 空格 | 禁用 Tab |
| 行宽上限 | 100 字符 | 超出自动换行 |
| 大括号风格 | Allman | 大括号独占一行 |
| 短代码合并 | 全部禁用 | 禁止 if / loop / function 合并为单行 |
| 参数换行 | 全量换行 | 禁止参数列表混合打包 |
| 连续赋值对齐 | 启用 | 同一块内的 `=` 号列对齐 |
| 连续宏对齐 | 跨空行启用 | `#define` 值列对齐 |
| 指针对齐 | 右侧 | `int *p` 而非 `int* p` |
| include 排序 | 大小写敏感 | 系统头 `<...>` 与本地头 `"..."` 分组 |
| 最大空行数 | 1 | 压缩多余空行 |

### clang-tidy（静态分析）

配置文件：[.clang-tidy](../../../.lintrc/backend/c-cpp/.clang-tidy)，启用以下检查类别，所有警告视为错误：

| 检查类别 | 说明 | 主要检测内容 |
| --- | --- | --- |
| `bugprone-*` | 易错模式 | 整数溢出、字符串操作越界、条件判断问题等 |
| `cert-*` | CERT 安全编码 | 符合 CERT C 安全编码标准的检查 |
| `clang-analyzer-*` | Clang 静态分析 | 内存泄漏、空指针解引用、除零等深度分析 |
| `misc-*` | 杂项检查 | 未使用参数、throw/catch 问题等 |
| `performance-*` | 性能检查 | 不必要的拷贝、低效循环等 |
| `portability-*` | 可移植性 | 依赖平台特性、类型宽度假设等 |
| `readability-*` | 可读性 | 命名规范、冗余代码、复杂度等 |

**命名规范**（`readability-identifier-naming`）：

| 标识符类型 | 规范 | 示例 |
| --- | --- | --- |
| 函数 / 变量 / 参数 | `snake_case` | `read_buffer`, `max_size` |
| 全局变量 | `g_` 前缀 + `snake_case` | `g_error_count` |
| 宏定义 / 枚举常量 | `UPPER_CASE` | `MAX_BUF_SIZE`, `STATE_IDLE` |
| `typedef` 类型 | `snake_case` + `_t` 后缀 | `handle_t`, `config_t` |
| `struct` / `enum` 名 | `snake_case` | `packet_header`, `error_code` |

**已禁用的检查**：

| 检查名 | 禁用原因 |
| --- | --- |
| `bugprone-easily-swappable-parameters` | 误报率高，C 语言常见模式 |
| `cert-dcl37-c` / `cert-dcl51-cpp` | C++ 专属规则，不适用于纯 C |
| `misc-no-recursion` | 递归在 C 中有合理使用场景 |
| `readability-magic-numbers` | 嵌入式 / 底层代码中常用字面量 |
| `readability-identifier-length` | 对短变量名（`i`, `n` 等）过于严格 |

### cppcheck（补充静态检查）

通过 `--enable=all` 启用全部检查类型：

| 检查类型 | 说明 |
| --- | --- |
| `warning` | 代码缺陷警告 |
| `style` | 编码风格问题（未使用变量、冗余代码等） |
| `performance` | 性能优化建议 |
| `portability` | 可移植性问题（平台差异、未定义行为） |
| `information` | 检查过程提示信息 |
| `unusedFunction` | 未被调用的函数（已禁用，适合库代码） |
| `missingInclude` | 缺失的头文件（已禁用，CI 环境无完整依赖） |

编译标准：`--std=c11`，目标平台：`--platform=unix64`，支持 `// cppcheck-suppress` 内联抑制注释。

### flawfinder（安全漏洞扫描）

针对常见 C 安全漏洞进行模式匹配扫描，基于 CWE（通用缺陷枚举）：

| 风险等级 | 描述 | CI 策略 |
| --- | --- | --- |
| 0 — 无风险 | 纯信息 | 不报告 |
| 1 — 极低风险 | 潜在问题但极少被利用 | 报告，不失败 |
| 2 — 低风险 | 需关注但有缓解手段 | 报告，不失败 |
| 3 — 中风险 | 较常见的安全缺陷 | 报告，不失败 |
| 4 — 高风险 | 严重安全漏洞（如缓冲区溢出、格式字符串漏洞） | **报告且 CI 失败** |
| 5 — 极高风险 | 已知危险函数（`gets`、`strcpy` 等） | **报告且 CI 失败** |

扫描起始级别：1 级（`--minlevel=1`），失败阈值：4 级（`--error-level=4`）。

---

## C++ 代码检查说明

所有 `*.cpp` / `*.cc` / `*.cxx` / `*.hpp` / `*.hh` / `*.hxx` 文件在 CI 中经过五层检查。格式规则共用 [.clang-format](../../../.lintrc/backend/c-cpp/.clang-format)，静态分析使用独立的 [.clang-tidy-cpp](../../../.lintrc/backend/c-cpp/.clang-tidy-cpp)。

### clang-format（C++ 格式规范）

与 C 共用 [.clang-format](../../../.lintrc/backend/c-cpp/.clang-format) 配置，在 C 规则基础上新增以下 C++ 专属格式规则：

| 规则 | 配置值 | 说明 |
| --- | --- | --- |
| 访问修饰符偏移 | -4 | `public` / `private` / `protected` 与类体同级（顶格） |
| 命名空间缩进 | 无 | 命名空间内容不额外缩进 |
| 命名空间折叠 | 禁止 | 嵌套命名空间不合并为一行 |
| 命名空间注释 | 自动补充 | 右括号后自动加 `// namespace foo` |
| 构造函数初始化列表 | 每项单行 | 禁止多个初始化器打包 |
| 继承列表冒号 | 换行前置 | 基类列表冒号在换行前 |
| `using` 声明排序 | 启用 | 自动排序 using 声明 |
| 模板声明换行 | 强制 | `template<...>` 独占一行 |
| Lambda 缩进 | 签名对齐 | Lambda 主体与捕获列表签名对齐 |
| 短 Lambda 单行 | 仅内联 | 仅作函数参数时允许单行 Lambda |
| C++11 `{}` 空格 | 无 | 统一初始化语法 `{}` 前不加空格 |

### clang-tidy（C++ 静态分析）

配置文件：[.clang-tidy-cpp](../../../.lintrc/backend/c-cpp/.clang-tidy-cpp)，在 C 检查基础上新增三个 C++ 专属检查类别，所有警告视为错误：

| 检查类别 | 说明 | 主要检测内容 |
| --- | --- | --- |
| `bugprone-*` | 易错模式 | 整数溢出、危险的函数使用、逻辑判断问题等 |
| `cert-*` | CERT 安全编码 | 符合 CERT C++ 安全编码标准的检查 |
| `clang-analyzer-*` | Clang 静态分析 | 内存泄漏、空指针、除零等深度路径分析 |
| `cppcoreguidelines-*` | C++ 核心准则 | Bjarne Stroustrup 的 C++ Core Guidelines 检查 |
| `hicpp-*` | 高完整性 C++ | High Integrity C++ 编码标准（航空航天级规范） |
| `misc-*` | 杂项检查 | 未使用参数、重复 include、悬空 else 等 |
| `modernize-*` | 现代化改写 | 建议使用 C++11/14/17 特性替代旧式写法 |
| `performance-*` | 性能检查 | 不必要的拷贝、按值传递大对象、低效操作等 |
| `portability-*` | 可移植性 | 平台相关假设、类型宽度、字节序问题等 |
| `readability-*` | 可读性 | 命名规范、冗余代码、圈复杂度等 |

**命名规范**（`readability-identifier-naming`）：

| 标识符类型 | 规范 | 示例 |
| --- | --- | --- |
| 函数 / 方法 / 变量 / 参数 | `snake_case` | `read_buffer`, `get_value()` |
| 全局变量 | `g_` 前缀 + `snake_case` | `g_error_count` |
| 成员变量 | `m_` 前缀 + `snake_case` | `m_capacity`, `m_data` |
| 静态成员变量 | `s_` 前缀 + `snake_case` | `s_instance_count` |
| 类 / struct | `PascalCase` | `PacketHeader`, `ErrorCode` |
| 命名空间 | `snake_case` | `net_utils`, `core` |
| 模板类型参数 | `PascalCase` | `ValueType`, `Allocator` |
| 宏定义 / 枚举常量 | `UPPER_CASE` | `MAX_BUF_SIZE`, `STATE_IDLE` |
| `enum class` 名 | `PascalCase` | `ConnectionState`, `ErrorKind` |
| 类型别名（`using`） | `PascalCase` | `ByteBuffer`, `Callback` |
| `typedef` 类型 | `snake_case` + `_t` 后缀 | `handle_t`, `config_t` |

**已禁用的检查**：

| 检查名 | 禁用原因 |
| --- | --- |
| `bugprone-easily-swappable-parameters` | 误报率高，参数顺序相似是常见设计模式 |
| `cert-dcl37-c` | C 专属规则，不适用于 C++ |
| `cppcoreguidelines-avoid-magic-numbers` | 与 `readability-magic-numbers` 重复 |
| `cppcoreguidelines-pro-bounds-array-to-pointer-decay` | 与 C API 交互时数组退化不可避免 |
| `cppcoreguidelines-pro-type-reinterpret-cast` | 底层系统编程中有合理使用场景 |
| `cppcoreguidelines-pro-type-vararg` / `hicpp-vararg` | `printf` 风格接口仍被广泛使用 |
| `hicpp-no-array-decay` | 与 C API 交互时不可避免 |
| `misc-no-recursion` | 递归在算法实现中有合理使用场景 |
| `modernize-use-trailing-return-type` | 尾置返回类型风格争议较大 |
| `readability-magic-numbers` / `readability-identifier-length` | 嵌入式 / 算法代码中常见写法 |

### cppcheck（C++ 静态检查）

通过 `--enable=all` 启用全部检查类型，编译标准：`--std=c++17`，目标平台：`--platform=unix64`：

| 检查类型 | 说明 |
| --- | --- |
| `warning` | 代码缺陷警告（未初始化变量、越界等） |
| `style` | 编码风格问题（未使用变量、冗余代码等） |
| `performance` | 性能优化建议（不必要的拷贝、后置递增等） |
| `portability` | 可移植性问题（未定义行为、平台差异等） |
| `information` | 检查过程提示信息 |
| `unusedFunction` | 未被调用的函数 |
| `missingInclude` | 缺失的头文件（已禁用，CI 环境无完整依赖） |

支持 `// cppcheck-suppress` 内联抑制注释。

### flawfinder（C++ 安全扫描）

针对 C/C++ 常见安全漏洞进行模式匹配扫描，基于 CWE（通用缺陷枚举），策略与 C 相同：

| 风险等级 | 描述 | CI 策略 |
| --- | --- | --- |
| 0 — 无风险 | 纯信息 | 不报告 |
| 1 — 极低风险 | 潜在问题但极少被利用 | 报告，不失败 |
| 2 — 低风险 | 需关注但有缓解手段 | 报告，不失败 |
| 3 — 中风险 | 较常见的安全缺陷 | 报告，不失败 |
| 4 — 高风险 | 严重安全漏洞（缓冲区溢出、格式字符串漏洞等） | **报告且 CI 失败** |
| 5 — 极高风险 | 已知危险函数（`gets`、`strcpy` 等） | **报告且 CI 失败** |

### cpplint（Google C++ 风格规范）

使用 Google 的 `cpplint` 工具检查 C++ 风格问题，与 clang-format / clang-tidy 互补（侧重语义规范和 build 问题）：

| 检查类别 | 说明 | 状态 |
| --- | --- | --- |
| `build/deprecated` | 检测废弃函数和用法 | ✅ 启用 |
| `build/printf_format` | `printf` 格式字符串与参数类型一致性 | ✅ 启用 |
| `build/namespaces` | 匿名命名空间 / `using namespace` 滥用 | ✅ 启用 |
| `runtime/explicit` | 单参数构造函数必须标记 `explicit` | ✅ 启用 |
| `runtime/int` | 避免使用 `short` / `long`，改用 `int32_t` 等 | ✅ 启用 |
| `runtime/operator` | 运算符重载规范（`operator=` 返回引用等） | ✅ 启用 |
| `runtime/references` | 非 const 引用参数应使用指针 | ✅ 启用 |
| `runtime/string` | 避免全局 `std::string`（静态初始化顺序问题） | ✅ 启用 |
| `whitespace/*` | 所有空白规则 | ❌ 关闭（由 clang-format 负责） |
| `legal/copyright` | 版权声明检查 | ❌ 关闭（无强制 License 头） |
| `build/include_order` | Google 风格 include 排序 | ❌ 关闭（由 clang-format 负责） |
| `build/header_guard` | 传统 `#ifndef` 守卫 | ❌ 关闭（使用 `#pragma once`） |

行宽限制配置为 100 字符，与 `.clang-format` 保持一致。

---

## Python 代码检查说明

所有 `*.py` 文件在 CI 中经过六层检查，目标版本 Python **3.11**。
配置文件均位于仓库根目录，无 Python 文件时自动跳过所有检查。

### black（格式化检查）

配置定义于 [pyproject.toml](../../../.lintrc/backend/python/pyproject.toml) `[tool.black]` 节。
CI 中使用 `--check --diff` 模式，仅验证格式不修改文件。

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| `target-version` | `py311` | 目标 Python 3.11 语法 |
| `line-length` | 100 | 最大行宽 |
| `skip-string-normalization` | `false` | 强制双引号 |

### isort（import 排序）

配置定义于 [pyproject.toml](../../../.lintrc/backend/python/pyproject.toml) `[tool.isort]` 节。
CI 中使用 `--check-only --diff` 模式。

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| `profile` | `black` | 与 black 完全兼容的预设 |
| `sections` | 5 组 | `FUTURE` / `STDLIB` / `THIRDPARTY` / `FIRSTPARTY` / `LOCALFOLDER` |
| `lines_between_sections` | 1 | 各分组间保留一个空行 |
| `force_single_line` | `false` | 允许多名导入在同一行 |
| `include_trailing_comma` | `true` | 多行 import 尾逗号（与 black 兼容） |

### flake8（风格 + Bug 模式）

配置文件：[.flake8](../../../.lintrc/backend/python/.flake8)。核心 flake8 + 以下插件，共同覆盖多个检查维度：

| 插件 | 前缀 | 说明 |
| --- | --- | --- |
| `flake8-bugbear` | `B` / `B9` | 常见 bug 模式（可变默认参数、循环变量捕获等） |
| `flake8-comprehensions` | `C4` | 推导式优化建议 |
| `flake8-simplify` | `SIM` | 代码简化（冒泡 if/else、可合并的条件等） |
| `flake8-pie` | `PIE` | 多余代码模式检测 |
| `flake8-return` | `RET` | `return` 语句规范（多余 `return None` 等） |
| `flake8-raise` | `RSE` | `raise` 语句规范 |
| `flake8-unused-arguments` | `U` | 未使用的函数参数检测 |
| `pep8-naming` | `N` | PEP 8 命名规范（类名 PascalCase、函数名 snake_case 等） |
| `flake8-annotations` | `ANN` | 函数参数和返回值类型注解检查 |
| `flake8-docstrings` | `D` | pydocstyle 文档字符串规范检查 |
| `flake8-bandit` | `S` | 内嵌 bandit 安全扫描（快速路径） |
| `flake8-isort` | `I` | import 排序检查 |
| `flake8-eradicate` | `E8` | 注释掉的死代码检测 |
| `flake8-builtins` | `A` | 避免覆盖 Python 内置名称 |

**主要全局配置**：

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| `max-line-length` | 100 | 最大行长 |
| `max-complexity` | 10 | 最大圈复杂度 |
| `per-file-ignores` | 测试文件放宽 | 测试文件允许 `assert`，放宽注解和文档字符串要求 |

### pylint（深度静态分析）

配置文件：[.pylintrc](../../../.lintrc/backend/python/.pylintrc)。全量检查项按需精准禁用，分数低于 `fail-under=10.0` 时 CI 失败。

| 检查类型 | 说明 | 示例 |
| --- | --- | --- |
| `E`（Error） | 代码错误 | 未定义变量、语法错误 |
| `W`（Warning） | 可能有问题的代码 | 未使用变量、可变默认参数 |
| `C`（Convention） | 编码规范违反 | 命名规范、文档字符串格式 |
| `R`（Refactor） | 重构建议 | 函数过长、重复代码、复杂度过高 |
| `I`（Information） | 信息提示 | 插件载入信息等 |
| `F`（Fatal） | 致命错误 | 无法解析的语法错误 |

**主要设计限制**：

| 项目 | 限制值 | 说明 |
| --- | --- | --- |
| 函数最大参数数 | 5 | 过多应拆分或使用参数对象 |
| 函数最大语句数 | 40 | 超出应拆分 |
| 函数最大局部变量数 | 15 | 过多应拆分 |
| 函数最大分支数 | 10 | 高圈复杂度信号 |
| 类最大公共方法数 | 15 | 过多应拆分类 |
| 重复代码最小行数 | 6 | 少于 6 行的重复不检查 |

**命名规范**：

| 标识符类型 | 规范 | 示例 |
| --- | --- | --- |
| 模块名 | `snake_case` | `data_utils`, `http_client` |
| 常量 | `UPPER_CASE` | `MAX_RETRY`, `DEFAULT_TIMEOUT` |
| 类名 | `PascalCase` | `HttpClient`, `DataParser` |
| 函数 / 方法 / 变量 | `snake_case` | `parse_response`, `error_count` |
| 允许单字符变量 | `i j k n x y z e f _` | 循环计数器、数学变量 |

### mypy（静态类型检查）

配置文件：[mypy.ini](../../../.lintrc/backend/python/mypy.ini)。开启严格模式（`strict = True`），目标版本 Python 3.11。

| 检查项 | 状态 | 说明 |
| --- | --- | --- |
| `disallow_untyped_defs` | ✅ 启用 | 所有函数必须有类型注解 |
| `disallow_untyped_calls` | ✅ 启用 | 禁止调用未注解的函数 |
| `disallow_any_generics` | ✅ 启用 | 禁止泛型 `List` 不带类型参数 |
| `strict_optional` | ✅ 启用 | 严格 `Optional` / `None` 安全检查 |
| `no_implicit_optional` | ✅ 启用 | `def f(x: int = None)` 需改为 `Optional[int]` |
| `warn_return_any` | ✅ 启用 | 返回 `Any` 时发出警告 |
| `warn_unused_ignores` | ✅ 启用 | 冗余的 `# type: ignore` 进行提示 |
| `warn_redundant_casts` | ✅ 启用 | 冗余类型转换提示 |
| `disallow_untyped_decorators` | ✅ 启用 | 用于未注解实体的装饰器必须有类型 |

测试文件自动放宽注解要求；常用第三方库（numpy / pandas / torch 等）配置了 `ignore_missing_imports`。

### bandit（安全扫描）

配置定义于 [pyproject.toml](../../../.lintrc/backend/python/pyproject.toml) `[tool.bandit]` 节。
CI 采用 `--severity-level=medium --confidence-level=medium`，中风险及以上才失败。

| 风险等级 | 描述 | CI 策略 |
| --- | --- | --- |
| LOW | 低危安全问题、调试信息泄露等 | 报告，不失败 |
| MEDIUM | SQL 注入风险、弱加密算法、Shell 注入等 | **报告且 CI 失败** |
| HIGH | 评估为高风险的漏洞（如硬编码密钥） | **报告且 CI 失败** |

测试文件中的 `assert` 语句自动豁免（`S101` 跳过）。

---

## Java 代码检查说明

所有 `*.java` 文件在 CI 中经过四层检查，目标 JDK **21**。
配置文件均位于仓库根目录，无 Java 文件时自动跳过所有检查。

### Checkstyle（编码规范）

配置文件：[checkstyle.xml](../../../.lintrc/backend/java/checkstyle.xml)，基于 Google Java Style Guide 定制。所有违规均为 `error` 级别。

| 检查类别 | 说明 |
| --- | --- |
| 命名规范 | 包名、类名、方法名、变量、常量、注解、泛型形参 |
| Javadoc | public 类、public/protected 方法和变量必须有完整 Javadoc |
| Import | 禁止通配符、冗余、未使用的 import；强制排序分组 |
| 代码尺度 | 方法 ≤ 60 行，参数 ≤ 5 个，行长 ≤ 100 字符 |
| 大括号与空白 | K&R 风格，if/else/for/while 必须加大括号，4 空格缩进 |
| 编码规范 | 修饰符顺序、switch default、fall-through、数组声明风格 |
| 透明度 | 成员变量应为 private，工具类必须有私有构造器 |
| 安全性 | 禁止 `System.out.print` 和 `printStackTrace()`，简化布尔表达式，禁止魔法数字 |

**命名规范详细**：

| 标识符类型 | 规范 | 示例 |
| --- | --- | --- |
| 包名 | 全小写 + 点号分隔 | `com.example.utils` |
| 类名 / 接口名 | `PascalCase` | `HttpClient`, `UserService` |
| 方法名 / 变量名 / 参数名 | `lowerCamelCase` | `parseResponse`, `maxRetry` |
| 常量（`static final`） | `UPPER_CASE` | `MAX_TIMEOUT`, `DEFAULT_PORT` |
| 泛型形参 | 单大写字母（可号数字） | `T`, `E`, `K`, `V`, `T2` |

### PMD（静态分析）

配置文件：[pmd-ruleset.xml](../../../.lintrc/backend/java/pmd-ruleset.xml)。启用 7 个规则集，对部分过于严格的规则进行精准排除。

| 规则集 | 说明 | 主要检测内容 |
| --- | --- | --- |
| Best Practices | 最佳实践 | 防止直接展开数组、运用 try-with-resources 等 |
| Code Style | 代码风格 | 冗余导入、冗余返回、不必要封装等 |
| Design | 设计质量 | 圈复杂度、NPath 复杂度、类/方法尺度过大 |
| Error Prone | 易错模式 | null 赋值、空 catch 块、导入 static 成员等 |
| Performance | 性能 | 循环内创建对象、String 拼接、不必要的包装等 |
| Security | 安全 | SQL 注入、硬编码密钥、不安全的随机数等 |
| Multithreading | 多线程 | double-checked locking、非线程安全单例等 |

**自定义限制**：

| 项目 | 限制值 |
| --- | --- |
| 圈复杂度（方法） | 10 |
| NPath 复杂度 | 100 |
| 单类最大方法数 | 15 |
| 单类最大字段数 | 10 |
| 类最大行数 | 400 |
| 方法最大行数 | 60 |
| 最大参数数 | 5 |

### SpotBugs（字节码分析）

配置文件：[spotbugs-exclude.xml](../../../.lintrc/backend/java/spotbugs-exclude.xml)。
SpotBugs 分析编译后的字节码，可检测约 500 种错误模式。
CI 配置：`-effort:max`（最大分析深度）、`-threshold:Low`（报告所有级别）。

| Bug 类别 | 代码 | 说明 |
| --- | --- | --- |
| Correctness | `C` | 代码错误（无限循环、死锁、错误的 equals 等） |
| Bad Practice | `B` | 编程陷阱（未关闭流、未检查返回值等） |
| Dodgy | `D` | 可疑代码、类型转换、空指针解引用等 |
| Performance | `P` | 性能问题（装箱拆箱等） |
| Malicious Code | `M` | 可被恶意利用的代码（返回可变内部数组等） |
| Multithreaded | `MT` | 线程安全（竞争条件、不当同步等） |
| Security | `S` | 安全漏洞（SQL 注入、硬编码密钥等） |
| Internationalization | `I` | 字符编码（默认编码依赖、大小写转换等） |

测试类和框架生成代码已在 [spotbugs-exclude.xml](../../../.lintrc/backend/java/spotbugs-exclude.xml) 中配置相应宽限。

### google-java-format（格式化检查）

CI 使用 `--dry-run --set-exit-if-changed` 模式，仅验证格式不修改文件。
主要强制规范：

| 项目 | 规范 |
| --- | --- |
| 缩进 | 2 空格（Google Java 风格） |
| 行长 | 100 字符 |
| 导入排序 | 自动按字母顺序排序 |
| 语句结尾 | 自动格式化（不影响语义） |

---

## JavaScript 代码检查说明

所有 `*.js / *.jsx / *.mjs / *.cjs` 文件经过两层检查。
配置文件均位于仓库根目录，无 JavaScript 文件时自动跳过。

### Prettier（JS 格式化）

配置文件：[.prettierrc](../../../.lintrc/frontend/prettier/.prettierrc)。与 TypeScript/Vue/CSS 共享同一格式化规则。

| 项目 | 规范 |
| --- | --- |
| 行宽 | 100 字符 |
| 缩进 | 2 空格 |
| 引号 | 单引号（JSX 内双引号） |
| 尾随逗号 | 所有位置（`all`） |
| 换行符 | LF |
| 分号 | 保留 |

### ESLint（JS 静态分析）

配置文件：[.eslintrc-js.json](../../../.lintrc/frontend/javascript/.eslintrc-js.json)。启用 7 个插件，全面覆盖可能错误、最佳实践与代码风格。

| 插件 | 说明 | 主要检测内容 |
| --- | --- | --- |
| `eslint:recommended` | ESLint 内置推荐规则 | 语法错误、未使用变量、不可达代码 |
| `eslint-plugin-import` | 模块导入规范 | 循环依赖、重复导入、导入顺序 |
| `eslint-plugin-unicorn` | 现代 JS 最佳实践 | 优先使用 Array 方法、避免过时 API |
| `eslint-plugin-sonarjs` | SonarQube 规则移植 | 认知复杂度、代码重复、圈复杂度 |
| `eslint-plugin-security` | 安全扫描 | 正则注入、不安全的 eval、路径遍历 |
| `eslint-plugin-promise` | Promise 最佳实践 | 始终 return、catch 处理、避免嵌套 |
| `eslint-plugin-n` | Node.js 规范 | 已废弃 API、不支持的 ES 特性 |
| `eslint-plugin-jsdoc` | JSDoc 规范 | 参数/返回值文档完整性 |

**主要自定义规则**：

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| 安全 | `no-eval` `no-implied-eval` `no-new-func` | 禁止动态代码执行 |
| 现代语法 | `no-var` `prefer-const` `prefer-template` | 强制 ES6+ 写法 |
| 代码质量 | `no-param-reassign` `no-shadow` `eqeqeq` | 防止意外赋值和类型歧义 |
| 函数限制 | `max-params: 5` `max-lines-per-function: 60` | 控制函数复杂度 |
| 复杂度 | `complexity: 10` `max-depth: 3` | 限制圈/嵌套复杂度 |
| 导入顺序 | `import/order` `import/no-cycle` | 内置→外部→内部，禁止循环依赖 |

---

## TypeScript 代码检查说明

所有 `*.ts / *.tsx` 文件经过三层检查，目标版本 **TypeScript 5 + ES2022**。
配置文件均位于仓库根目录，无 TypeScript 文件时自动跳过。

### Prettier（TS 格式化）

与 JavaScript 共享 [.prettierrc](../../../.lintrc/frontend/prettier/.prettierrc)，规则同上。

### ESLint + @typescript-eslint（静态分析）

配置文件：[.eslintrc-ts.json](../../../.lintrc/frontend/typescript/.eslintrc-ts.json)。
启用 **类型感知规则**（`strict-type-checked` + `stylistic-type-checked`），需配合 [tsconfig-lint.json](../../../.lintrc/frontend/typescript/tsconfig-lint.json) 提供类型信息。

| 规则集 | 说明 |
| --- | --- |
| `@typescript-eslint/strict-type-checked` | 类型安全严格规则（需类型信息） |
| `@typescript-eslint/stylistic-type-checked` | 类型风格规则（简化写法建议） |

**关键 TypeScript 专属规则**：

| 规则 | 说明 |
| --- | --- |
| `no-explicit-any` | 禁止 `any` 类型 |
| `explicit-function-return-type` | 函数必须声明返回类型 |
| `strict-boolean-expressions` | 禁止隐式布尔转换 |
| `no-floating-promises` | Promise 必须被 `await` 或 `.catch()` 处理 |
| `no-misused-promises` | 禁止在非异步上下文中错误使用 Promise |
| `switch-exhaustiveness-check` | 联合类型 switch 必须覆盖所有分支 |
| `consistent-type-imports` | 统一使用 `import type` 导入类型 |
| `no-unsafe-*` | 禁止 `any` 类型的不安全操作 |
| `prefer-nullish-coalescing` | 优先使用 `??` 代替 `\|\|` |
| `prefer-optional-chain` | 优先使用 `?.` 代替嵌套 `&&` |

### TypeScript 编译器类型检查

配置文件：[tsconfig-lint.json](../../../.lintrc/frontend/typescript/tsconfig-lint.json)。运行 `tsc --noEmit` 进行完整类型检查（不输出编译产物）。

| 编译选项 | 说明 |
| --- | --- |
| `strict: true` | 开启所有严格模式选项 |
| `noUnusedLocals` / `noUnusedParameters` | 禁止未使用的变量和参数 |
| `noImplicitReturns` | 所有代码路径必须有返回值 |
| `noUncheckedIndexedAccess` | 索引访问结果类型包含 `undefined` |
| `exactOptionalPropertyTypes` | 可选属性不允许显式赋 `undefined` |
| `useUnknownInCatchVariables` | catch 变量类型为 `unknown` 而非 `any` |

---

## Vue3 代码检查说明

所有 `*.vue` 文件经过两层检查，强制使用 **Composition API + TypeScript**。
配置文件均位于仓库根目录，无 Vue 文件时自动跳过。

### Prettier（Vue 格式化）

与 JS/TS 共享 [.prettierrc](../../../.lintrc/frontend/prettier/.prettierrc)。特别启用 `vueIndentScriptAndStyle: true`（script/style 块内容缩进）。

### ESLint + eslint-plugin-vue（静态分析）

配置文件：[.eslintrc-vue.json](../../../.lintrc/frontend/frameworks/.eslintrc-vue.json)。
继承 `plugin:vue/vue3-recommended`，在其基础上追加严格规则。

| 规则集 | 说明 |
| --- | --- |
| `plugin:vue/vue3-recommended` | Vue3 推荐规则（含模板语法） |
| `@typescript-eslint/recommended` | TypeScript 推荐规则 |

**关键 Vue3 专属规则**：

| 规则 | 说明 |
| --- | --- |
| `component-api-style` | 强制使用 `<script setup>` 或 Composition API |
| `component-name-in-template-casing` | 模板中组件名使用 `PascalCase` |
| `define-emits-declaration` | `defineEmits` 必须使用基于类型的声明 |
| `define-props-declaration` | `defineProps` 必须使用基于类型的声明 |
| `block-order` | SFC 块顺序：`script → template → style` |
| `block-lang` | `<script>` 必须声明 `lang="ts"` |
| `require-typed-ref` | `ref()` 必须声明泛型类型 |
| `no-unused-refs` | 禁止未使用的模板 ref |
| `attributes-order` | attribute 书写顺序（指令→绑定→事件→内容） |
| `html-self-closing` | 空元素和组件必须自闭合 |
| `padding-line-between-blocks` | SFC 块之间必须有空行 |

---

## Rust 代码检查说明

所有 `*.rs` 文件经过三层检查，无 Rust 文件时自动跳过。
有 `Cargo.toml` 时使用项目级工具，否则退化为单文件检查。

### rustfmt（格式化）

配置文件：[rustfmt.toml](../../../.lintrc/backend/rust/rustfmt.toml)。有 `Cargo.toml` 时运行 `cargo fmt --check`，否则对单文件运行 `rustfmt --check`。

| 项目 | 配置 |
| --- | --- |
| Rust Edition | 2021 |
| 行宽 | 100 字符 |
| 缩进 | 4 空格 |
| Import 分组 | `std → 外部 crate → 本 crate` |
| Import 合并粒度 | `Crate`（合并至 crate 级别） |
| 尾随逗号 | 多行结构保留（`Vertical`） |
| 字段简写 | 启用（`use_field_init_shorthand`） |
| `try!()` 简写 | 启用（自动转为 `?`） |

### Clippy（静态分析）

配置文件：[.clippy.toml](../../../.lintrc/backend/rust/.clippy.toml)。CI 中启用 `-D clippy::all -D clippy::pedantic -D clippy::nursery`。

| Lint 级别 | 说明 |
| --- | --- |
| `clippy::all` | 所有稳定 lint（默认集合） |
| `clippy::pedantic` | 更严格的最佳实践检查 |
| `clippy::nursery` | 实验性 lint（未来可能升级为 pedantic） |
| `clippy::cargo` | Cargo.toml 规范检查（以 `warn` 级别） |

**主要自定义限制**：

| 项目 | 限制 | 说明 |
| --- | --- | --- |
| 函数参数数 | 5 | `too_many_arguments` |
| 函数行数 | 60 | `too_many_lines` |
| 认知复杂度 | 10 | `cognitive_complexity` |
| 类型复杂度 | 250 | `type_complexity` |
| `unwrap()` / `expect()` | 禁止 | 推荐使用 `?` 或显式处理 |
| `panic!` / `todo!` / `unimplemented!` | 禁止 | 生产代码应返回 `Result/Option` |

### cargo audit（依赖安全）

有 `Cargo.lock` 时运行，检查依赖是否存在已知 CVE 漏洞（使用 RustSec Advisory Database）。

---

## CSS 代码检查说明

所有 `*.css / *.scss / *.sass / *.less` 文件经 Stylelint 检查。
无 CSS/SCSS/Less 文件时自动跳过。

### Stylelint（静态分析）

配置文件：[.stylelintrc.json](../../../.lintrc/frontend/css-styles/.stylelintrc.json)。
继承 `stylelint-config-standard`（标准规则）和 `stylelint-config-recess-order`（属性排序），加载 `stylelint-scss` 插件。

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| 颜色 | `color-named: never` | 禁止使用颜色名称（如 `red`），强制十六进制或函数 |
| 颜色 | `color-hex-length: short` | 十六进制颜色优先短写（`#fff` 代替 `#ffffff`） |
| 可维护性 | `declaration-no-important: true` | 禁止 `!important` |
| 选择器 | `selector-max-id: 0` | 禁止 ID 选择器 |
| 选择器 | `selector-max-universal: 1` | 通配符选择器最多 1 个 |
| 选择器 | `selector-max-compound-selectors: 4` | 复合选择器层级不超过 4 层 |
| 选择器 | `selector-class-pattern` | 类名使用 `kebab-case` 或 BEM 风格 |
| 嵌套 | `max-nesting-depth: 3` | 最大嵌套深度 3（SCSS） |
| 单位 | `unit-allowed-list` | 限制允许使用的 CSS 单位列表 |
| 前缀 | `*-no-vendor-prefix: true` | 禁止手写浏览器前缀（使用 PostCSS Autoprefixer） |
| 长度 | `length-zero-no-unit: true` | `0` 值禁止写单位 |
| 简写 | `shorthand-property-no-redundant-values` | 禁止冗余简写（如 `margin: 1px 1px`） |
| 属性排序 | `stylelint-config-recess-order` | 按 Bootstrap Recess 规范排序属性 |

**SCSS 专属规则（stylelint-scss 插件）**：

| 规则 | 说明 |
| --- | --- |
| `scss/no-duplicate-mixins` | 禁止重复定义 `@mixin` |
| `scss/no-global-function-names` | 禁止使用已废弃的全局函数（如 `lighten()`） |
| `scss/no-unused-private-members` | 禁止未使用的私有变量和 mixin |
| `scss/at-use-no-unnamespaced` | `@use` 引入必须有命名空间 |
| `scss/dollar-variable-pattern` | 变量名 `$kebab-case` |
| `scss/at-mixin-pattern` | mixin 名 `kebab-case` |

---

## PowerShell 代码检查说明

所有 `*.ps1 / *.psm1` 文件经 PSScriptAnalyzer 检查。
无 PowerShell 文件时自动跳过，CI 运行环境为 Ubuntu（使用 PowerShell Core 7.x）。

### PSScriptAnalyzer（静态分析）

配置文件：[PSScriptAnalyzerSettings.psd1](../../../.lintrc/infrastructure/shell/PSScriptAnalyzerSettings.psd1)。
PSScriptAnalyzer 是微软官方 PowerShell 静态分析工具，CI 中检查 `Error` 和 `Warning` 级别问题。

| 规则类别 | 说明 | 示例规则 |
| --- | --- | --- |
| 安全 | 检测不安全的操作 | `PSAvoidUsingConvertToSecureStringWithPlainText`、`PSAvoidUsingPlainTextForPassword` |
| 安全 | 禁止危险指令 | `PSAvoidUsingInvokeExpression`（禁止 `Invoke-Expression`） |
| 凭据 | 禁止硬编码账户 | `PSAvoidUsingUsernameAndPasswordParams`、`PSAvoidUsingComputerNameHardcoded` |
| 最佳实践 | 规范化命令使用 | `PSAvoidUsingCmdletAliases`（禁止使用别名）、`PSAvoidUsingPositionalParameters` |
| 最佳实践 | 参数声明 | `PSReservedParams`、`PSShouldProcess`（支持 `-WhatIf`） |
| 代码质量 | 异常处理 | `PSAvoidUsingEmptyCatchBlock`（禁止空 catch）、`PSPossibleIncorrectComparisonWithNull` |
| 格式化 | 代码风格 | 行宽 120、4 空格缩进、左大括号同行、运算符前后空格 |
| 命名 | 函数命名 | `PSUseApprovedVerbs`（动词须为 PowerShell 批准动词）、`PSUseSingularNouns` |
| 文档 | 注释帮助 | `PSProvideCommentHelp`（函数必须有注释帮助块） |
| 兼容性 | 跨平台 | `PSUseCompatibleSyntax` / `PSUseCompatibleCommands`（5.1 + 7.x） |

---

## HTML 代码检查说明

所有 `*.html` 文件经 HTMLHint 检查。无 HTML 文件时自动跳过。

### HTMLHint（静态分析）

配置文件：[.htmlhintrc](../../../.lintrc/frontend/html/.htmlhintrc)。
HTMLHint 检查 HTML 结构规范，覆盖语法、语义和可访问性基础规则。

| 规则 | 说明 |
| --- | --- |
| `tagname-lowercase` | 标签名必须小写 |
| `attr-lowercase` | 属性名必须小写 |
| `attr-value-double-quotes` | 属性值必须使用双引号 |
| `attr-no-duplication` | 禁止重复属性 |
| `attr-unsafe-chars` | 禁止属性值中出现不安全字符 |
| `doctype-first` | 文档第一行必须是 `<!DOCTYPE>` |
| `doctype-html5` | 必须使用 HTML5 DOCTYPE |
| `tag-pair` | 标签必须正确配对 |
| `spec-char-escape` | 特殊字符必须使用实体（`&amp;` 等） |
| `id-unique` | 页面内 `id` 必须唯一 |
| `src-not-empty` | `src` 属性不能为空 |
| `alt-require` | `<img>` 必须有 `alt` 属性 |
| `title-require` | `<head>` 必须包含 `<title>` |
| `id-class-value` | id/class 名称使用 `kebab-case`（dash 风格） |
| `space-tab-mixed-disabled` | 禁止 Tab 与空格混用缩进（强制空格） |

---

## Bash 代码检查说明

所有 `*.sh / *.bash` 文件经两层检查。无 Shell 文件时自动跳过。

### ShellCheck（静态分析）

配置文件：[.shellcheckrc](../../../.lintrc/infrastructure/shell/.shellcheckrc)。ShellCheck 是业界标准 Shell 脚本静态分析工具，CI 中检查 `style` 及以上级别问题。

| 检查类别 | 说明 | 示例规则 |
| --- | --- | --- |
| 变量引用 | 变量展开安全 | SC2086：变量应加双引号；SC2155：避免声明与赋值合并 |
| 数组操作 | 安全的数组处理 | SC2206：数组赋值应使用 `mapfile`；SC2207：命令结果转数组 |
| 路径操作 | 防止目录切换失败 | SC2164：`cd` 后必须检查返回值（失败时 exit） |
| 错误处理 | 检查返回值 | SC2181：直接在 `if/while` 中调用命令而非检查 `$?` |
| 可移植性 | POSIX 兼容性 | SC3xxx：使用了非 POSIX 特性（bash 脚本通常可忽略） |
| 安全性 | 注入防范 | SC2091：避免意外的命令替换展开 |
| 性能 | 避免无用命令 | 避免 `cat file` 加管道调用 `grep`，可直接使用 `grep file` |

**全局启用可选检查**（`.shellcheckrc` 中 `enable=all`）：

| 可选检查 | 说明 |
| --- | --- |
| `avoid-nullary-conditions` | 避免空测试条件 |
| `check-set-e-suppressed` | 检查被 `set -e` 抑制的错误 |
| `deprecate-which` | 建议用 `command -v` 替代 `which` |
| `quote-safe-variables` | 标记不需要引号的变量 |
| `require-double-brackets` | 建议使用 `[[ ]]` 代替 `[ ]` |

### shfmt（格式化检查）

CI 中使用 `shfmt -d` 检查格式（不修改文件）。主要规范：

| 项目 | 规范 |
| --- | --- |
| 缩进 | 2 空格（`-i 2`） |
| case 缩进 | 启用（`-ci`，case 内语句缩进） |
| 重定向空格 | 启用（`-sr`，`>` 前保留空格） |

---

## Go 代码检查说明

所有 `*.go` 文件经过 golangci-lint 统一检查，内置多个 linter 并行运行。
配置文件 [.golangci.yml](../../../.lintrc/backend/go/.golangci.yml) 位于仓库根目录，无 Go 文件时自动跳过。

### golangci-lint（静态分析聚合）

golangci-lint 是 Go 生态标准工具，聚合 100+ linter，以下为启用的核心规则集：

| 分类 | Linter | 说明 |
| --- | --- | --- |
| 错误处理 | `errcheck` | 检查未处理的 error 返回值 |
| 错误处理 | `errorlint` | 正确使用 `errors.Is` / `errors.As` 比较 error |
| 错误处理 | `wrapcheck` | 跨包传递 error 必须 wrap |
| 静态分析 | `staticcheck` | SA/S/ST/QF 系列规则（行业最强 Go 分析器） |
| 静态分析 | `govet` | go vet 全量检查（可疑构造） |
| 代码质量 | `gocyclo` + `cyclop` | 圈复杂度（阈值 10） |
| 代码质量 | `gocognit` | 认知复杂度 |
| 代码质量 | `funlen` | 函数长度（60 行 / 40 语句） |
| 代码质量 | `gocritic` | 200+ 代码评审检查（diagnostic/style/performance） |
| 代码质量 | `revive` | 可配置 lint（替代 golint） |
| 安全 | `gosec` | OWASP 安全漏洞扫描（SQL 注入、路径遍历等） |
| 性能 | `prealloc` | slice 预分配建议 |
| 性能 | `noctx` | HTTP 请求必须传递 `context.Context` |
| 格式 | `gofmt` + `goimports` | 格式化 + import 分组排序 |
| 命名 | `stylecheck` | 命名规范（ST 系列） |
| 命名 | `misspell` | 英文拼写检查 |
| 重复 | `dupl` | 重复代码检测（阈值 100 行） |

**主要阈值**：

| 指标 | 阈值 |
| --- | --- |
| 圈复杂度 | 10 |
| 函数行数 | 60 |
| 函数语句数 | 40 |
| 行宽 | 100 字符 |
| import 分组 | 标准库 → 外部包 → 本项目包 |

---

## Kotlin 代码检查说明

所有 `*.kt / *.kts` 文件经过两层检查。
配置文件位于仓库根目录，无 Kotlin 文件时自动跳过。

### ktlint（格式化检查）

配置文件：[.editorconfig-kotlin](../../../.lintrc/backend/kotlin/.editorconfig-kotlin)。ktlint 是 Kotlin 官方推荐的代码风格工具，零配置遵循官方规范。

| 项目 | 规范 |
| --- | --- |
| 缩进 | 4 空格 |
| 行宽 | 120 字符 |
| 尾随逗号 | 调用位置和声明位置均启用 |
| import 排序 | 按 `ktlint_standard_import-ordering` 规则 |
| 禁止通配符导入 | `ktlint_standard_no-wildcard-imports` |

### Detekt（静态分析）

配置文件：[detekt.yml](../../../.lintrc/backend/kotlin/detekt.yml)。Detekt 是 Kotlin 最全面的静态分析工具，覆盖 200+ 规则。

| 规则类别 | 说明 |
| --- | --- |
| `complexity` | 圈复杂度（10）、函数长度（60）、参数数（5） |
| `coroutines` | 禁止全局协程作用域、检测 suspend 函数误用 |
| `empty-blocks` | 禁止空 catch/if/while/class 等代码块 |
| `exceptions` | 禁止捕获/抛出过泛异常、禁止 `PrintStackTrace`、禁止 `SwallowedException` |
| `naming` | 类/函数/变量/包命名规范，布尔属性以 `is/has/can` 前缀 |
| `performance` | 避免原始数组包装、SpreadOperator、不必要的临时对象 |
| `potential-bugs` | 检测 `!!` 非空断言、不安全类型转换、可变集合双重可变性 |
| `style` | 数据类不可变性、MagicNumber、MaxLineLength（120）、WildcardImport |

**主要数值限制**：

| 指标 | 限制 |
| --- | --- |
| 函数参数数 | 5（数据类除外） |
| 函数行数 | 60 |
| 圈复杂度 | 10 |
| 类行数 | 400 |
| 行宽 | 100 字符 |
| 魔法数字 | 除 -1/0/1/2/100/1000 外均须命名常量 |
| Return 语句数 | 最多 3 个 |

---

## C# 代码检查说明

所有 `*.cs` 文件经过两层检查（dotnet-format + Roslyn 分析器）。
配置文件 [.editorconfig-csharp](../../../.lintrc/backend/csharp/.editorconfig-csharp) 位于仓库根目录，无 C# 文件时自动跳过。
有 Solution / Project 文件时使用项目模式运行检查。

### dotnet-format（格式化）

由 `.editorconfig-csharp` 驱动，覆盖 C# 所有格式化规范：

| 类别 | 规范 |
| --- | --- |
| 缩进 | 4 空格 |
| 行宽 | 120 字符 |
| 换行符 | LF |
| 大括号 | 每个控制结构前必须换行（`new_line_before_open_brace = all`） |
| `using` 指令 | 命名空间外部，System 优先排序 |
| `var` 使用 | 类型明显时使用，内置类型显式声明 |
| 命名空间 | 文件级命名空间（`file_scoped`） |

### Roslyn 分析器（CA 规则）

内置于 .NET SDK，通过 `.editorconfig-csharp` 配置规则严重级别：

| 类别 | 关键规则 | 说明 |
| --- | --- | --- |
| 安全 | CA2300-CA2302 | 禁止 `BinaryFormatter`（反序列化漏洞） |
| 安全 | CA3001-CA3012 | SQL 注入、XSS、路径注入、ReDoS |
| 安全 | CA5350/CA5351 | 禁止 MD5/SHA1 等弱加密算法 |
| 安全 | CA5359 | 禁止禁用证书验证 |
| 可靠性 | CA2000 | 失去作用域前必须释放 IDisposable |
| 可靠性 | CA2016 | 转发 CancellationToken 参数 |
| 可靠性 | CA2012 | 正确使用 ValueTask |
| 性能 | CA1827-CA1829 | 避免 Count 与 Any 混用，使用 Length/Count |
| 设计 | CA1068 | CancellationToken 必须排在最后 |
| 设计 | CA1063 | 正确实现 IDisposable 模式 |
| 命名 | `dotnet_naming_rule` | 接口 `I` 前缀、私有字段 `_` 前缀、常量 PascalCase |

### Roslynator（扩展分析）

在 dotnet-format 基础上追加 500+ 额外诊断规则，覆盖代码简化、冗余消除和现代 C# 特性推荐。

---

## PHP 代码检查说明

所有 `*.php` 文件经过四层检查。
配置文件位于仓库根目录，无 PHP 文件时自动跳过，同时排除 `vendor/` 目录。

### PHP 语法检查

使用 `php -l` 对每个文件进行基础语法检查，目标版本 **PHP 8.3**。

### PHP_CodeSniffer（编码规范）

使用 **PSR-12** 规范集，覆盖 PHP-FIG 标准的所有格式化和代码风格要求：

| 规范集 | 说明 |
| --- | --- |
| PSR-1 | 基本编码标准（类名 StudlyCaps、常量全大写） |
| PSR-12 | 扩展编码规范（4 空格缩进、行宽 120、文件末尾换行） |

### PHPMD（Mess Detector）

配置文件：[phpmd-ruleset.xml](../../../.lintrc/backend/php/phpmd-ruleset.xml)。检测代码质量问题，在 CI 中以 `warn` 级别运行：

| 规则集 | 关键规则 |
| --- | --- |
| `codesize` | 圈复杂度（10）、函数长度（60）、参数数（5）、类长度（400） |
| `design` | 禁止 `exit`/`eval`/`goto`、禁止空 catch 块 |
| `unusedcode` | 未使用的私有字段、局部变量、方法、参数 |
| `naming` | 变量名 3-40 字符、常量全大写、布尔 getter 前缀 |
| `controversial` | camelCase 命名（类/属性/方法/参数/变量） |
| `cleancode` | 禁止 `@` 错误抑制符、禁止静态访问、未定义变量 |

### PHPStan（静态类型分析）

配置文件：[phpstan.neon](../../../.lintrc/backend/php/phpstan.neon)。PHPStan 是 PHP 最强静态分析工具：

| 项目 | 配置 |
| --- | --- |
| 分析级别 | 9（满级 10，等同于严格类型检查） |
| Bleeding Edge | 启用（预览未来默认规则） |
| 类型检查 | 检查缺失的 iterable 值类型、隐式 mixed 类型 |
| 未匹配忽略 | 报告无效的 `@phpstan-ignore` 注释 |
| 并行处理 | 4 进程并行分析 |

---

## Ruby 代码检查说明

所有 `*.rb / Gemfile / Rakefile / *.rake / *.gemspec` 文件经 RuboCop 检查。
配置文件 [.rubocop.yml](../../../.lintrc/backend/ruby/.rubocop.yml) 位于仓库根目录，无 Ruby 文件时自动跳过。目标 Ruby 版本 **3.2+**。

### RuboCop（lint + 格式化）

RuboCop 是 Ruby 官方推荐的代码检查工具，同时覆盖格式化和静态分析。CI 还加载以下扩展：

| 扩展 | 说明 |
| --- | --- |
| `rubocop-performance` | 性能优化规则（避免低效 Ruby 写法） |
| `rubocop-rake` | Rake 任务文件规范 |
| `rubocop-rspec` | RSpec 测试规范 |
| `rubocop-thread_safety` | 多线程安全规则 |

**主要规则配置**：

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| 格式 | `Layout/LineLength: 100` | 行宽限制 |
| 格式 | `Layout/IndentationWidth: 2` | 2 空格缩进 |
| 格式 | `Layout/EndOfLine: lf` | LF 换行符 |
| 字符串 | `Style/StringLiterals` | 单引号（除需插值外） |
| 字符串 | `Style/FrozenStringLiteralComment` | 文件头必须有冻结注释 |
| 集合 | `Style/HashSyntax: ruby3_keywords` | Ruby 3.1+ 简写 hash 语法 |
| 集合 | `Style/TrailingCommaIn*` | 多行集合/参数末尾必须有逗号 |
| 代码块 | `Style/BlockDelimiters` | 单行 `{}`，多行 `do/end` |
| 复杂度 | `Metrics/CyclomaticComplexity: 8` | 圈复杂度上限 |
| 复杂度 | `Metrics/MethodLength: 15` | 方法长度上限 |
| 复杂度 | `Metrics/ParameterLists: 5` | 参数数量上限 |
| 安全 | `Security/Eval` | 禁止 `eval` |
| 安全 | `Security/YAMLLoad` | 禁止 `YAML.load`（改用 `YAML.safe_load`） |
| 安全 | `Security/MarshalLoad` | 禁止 `Marshal.load` |
| 命名 | `Naming/VariableName: snake_case` | 变量/方法名使用蛇形命名 |
| 命名 | `Naming/PredicateName` | 禁止 `is_`/`have_`/`does_` 前缀（用 `?` 结尾） |

---

## Swift 代码检查说明

所有 `*.swift` 文件经 SwiftLint 检查，CI 运行于 **macOS** 环境。
配置文件 [.swiftlint.yml](../../../.lintrc/backend/swift/.swiftlint.yml) 位于仓库根目录，无 Swift 文件时自动跳过。

### SwiftLint（lint + 格式化）

SwiftLint 是 Swift/Objective-C 官方推荐工具，内置 200+ 规则，分析器规则需 `swiftlint analyze` 运行。

**主要规则分类**：

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| 尺寸限制 | `line_length: 120/120` | 行宽警告/错误 |
| 尺寸限制 | `function_body_length: 40/40` | 函数体行数 |
| 尺寸限制 | `function_parameter_count: 5/5` | 函数参数数 |
| 尺寸限制 | `type_body_length: 300/500` | 类型体行数 |
| 尺寸限制 | `file_length: 400/600` | 文件行数 |
| 复杂度 | `cyclomatic_complexity: 8/8` | 圈复杂度 |
| 命名 | `type_name: 3-40 字符` | 类型名长度 |
| 命名 | `identifier_name: 3-50 字符` | 标识符名长度 |
| 安全 | `force_cast: warning` | 强制类型转换（警告） |
| 安全 | `force_try: warning` | `try!` 强制解包（警告） |
| 现代化 | `prefer_self_type_over_type_of_self` | `Self` 代替 `type(of: self)` |
| 现代化 | `use_super_parameters` | 使用简写 super 参数 |
| 现代化 | `prefer_zero_over_explicit_init` | `.zero` 代替 `.init()` |
| 结构顺序 | `type_contents_order` | case→属性→初始化→方法→下标 |
| 修饰符顺序 | `modifier_order` | `override→acl→dynamic→mutating→...` |
| 文档 | `require_trailing_commas` | 多行结构末尾必须有逗号（实为 opt-in） |

**分析器规则**（`swiftlint analyze` 阶段）：

| 规则 | 说明 |
| --- | --- |
| `explicit_self` | 实例成员访问必须显式使用 `self.` |
| `unused_declaration` | 检测未使用的声明 |
| `unused_import` | 检测未使用的 import |

---

## Dart / Flutter 代码检查说明

所有 `*.dart` 文件经过两层检查（`dart format` + `dart analyze`）。
有 Flutter 项目（含 `pubspec.yaml` 且含 `flutter:` 键）时额外运行 `flutter analyze`。
配置文件 [analysis_options.yaml](../../../.lintrc/backend/dart/analysis_options.yaml) 位于仓库根目录，无 Dart 文件时自动跳过。

### dart format（格式化）

使用官方 `dart format` 工具，行宽设为 **120 字符**。使用 `--set-exit-if-changed` 在有未格式化文件时中断 CI。

### dart analyze / flutter analyze（静态分析）

配置文件：[analysis_options.yaml](../../../.lintrc/backend/dart/analysis_options.yaml)，启用全量 lint 规则集。

| 规则类别 | 示例规则 |
| --- | --- |
| 错误倾向 | `avoid_returning_null_for_future`、`hash_and_equals`、`use_key_in_widget_constructors` |
| 空安全 | `cast_nullable_to_non_nullable`、`unnecessary_null_checks`、`unnecessary_nullable_for_final_variable_declarations` |
| 性能 | `prefer_const_constructors`、`prefer_const_literals_to_create_immutables`、`avoid_slow_async_io` |
| 异步 | `unawaited_futures`、`avoid_void_async`、`avoid_returning_null_for_future` |
| 代码风格 | `prefer_single_quotes`、`require_trailing_commas`、`sort_constructors_first` |
| Flutter 专属 | `use_key_in_widget_constructors`、`sized_box_for_whitespace`、`use_colored_box` |
| 类型注解 | `always_declare_return_types`、`type_annotate_public_apis`、`avoid_annotating_with_dynamic` |
| 命名 | `camel_case_types`（类名驼峰）、`file_name_no_space`（文件名无空格） |
| 文档 | `package_api_docs`（公共 API 必须有文档注释） |

---

## Scala 代码检查说明

所有 `*.scala` 文件经过两层检查（Scalafmt + Scalafix）。
有 `build.sbt` 时通过 sbt 插件运行，否则仅进行格式化检查。
配置文件位于仓库根目录，无 Scala 文件时自动跳过。

### Scalafmt（格式化）

配置文件：[.scalafmt.conf](../../../.lintrc/backend/scala/.scalafmt.conf)。Scalafmt 是 Scala 官方推荐格式化工具。

| 项目 | 配置 |
| --- | --- |
| Scala 版本 | 2.13（可切换为 scala3） |
| 行宽 | 120 字符 |
| 缩进 | 2 空格 |
| 对齐 | `align.preset = more`（箭头、等号、注释对齐） |
| import 排序 | `SortImports` 规则，标准库优先 |
| 尾随逗号 | 多行时自动添加（`trailing-comma-on-call-site = always`） |
| 文档注释 | Asterisk 风格 |
| 重写规则 | `RedundantBraces`、`RedundantParens`、`PreferCurlyFors`、`SortImports` |

### Scalafix（语义重写与 lint）

Scalafix 是 Scala 语义重写工具，通过 sbt 插件 (`sbt-scalafix`) 运行：

| 规则 | 说明 |
| --- | --- |
| `RemoveUnused` | 删除未使用的 import 和局部变量 |
| `DisableSyntax` | 禁止特定语法（如 `null`、`throw`、`while` 等） |
| `LeakingImplicitClassVal` | 检测隐式类中泄漏的 val |
| `NoValInForComprehension` | 禁止 for 推导式中的 val |
| `OrganizeImports` | import 分组整理 |
| `ExplicitResultTypes` | 公共成员必须显式声明返回类型 |

---

## Lua 代码检查说明

所有 `*.lua` 文件经过两层检查（luacheck + StyLua）。
配置文件位于仓库根目录，无 Lua 文件时自动跳过。

### luacheck（静态分析）

配置文件：[.luacheckrc](../../../.lintrc/backend/lua/.luacheckrc)。luacheck 是 Lua 生态标准静态分析工具。

| 检查类别 | 说明 |
| --- | --- |
| 未定义变量 | 使用未声明的全局变量 |
| 未使用变量 | 未使用的局部变量、参数（`_` 前缀约定忽略） |
| 重定义 | 局部变量在同一作用域内重定义 |
| 语法 | Lua 语法和结构问题 |
| 标准库版本 | 目标 Lua 5.4（`std = "lua54"`） |
| 行宽 | 120 字符 |

测试文件（`*_spec.lua` / `*_test.lua`）自动识别 Busted 框架全局变量（`describe`/`it`/`before_each` 等）。

### StyLua（格式化）

配置文件：[stylua.toml](../../../.lintrc/backend/lua/stylua.toml)。StyLua 是基于 Rust 的高性能 Lua 格式化工具。

| 项目 | 配置 |
| --- | --- |
| 行宽 | 120 字符 |
| 缩进 | 2 空格 |
| 引号 | 自动优先双引号（`AutoPreferDouble`） |
| 函数调用括号 | 始终保留（`Always`） |
| 简单语句折叠 | 仅对 `if` 语句（`ConditionalOnly`） |

---

## R 代码检查说明

所有 `*.R / *.Rmd` 文件经两层检查（lintr 语法分析 + styler 格式化），排除 `vendor/`、`renv/`、`.Rproj.user/`。
配置文件 [.lintr](../../../.lintrc/backend/r/.lintr) 位于仓库根目录，无 R 文件时自动跳过。

### lintr（静态分析）

| 规则 | 说明 |
| --- | --- |
| `line_length_linter(120)` | 行宽不超过 120 字符 |
| `cyclocomp_linter(15)` | 圈复杂度不超过 15 |
| `object_name_linter("snake_case")` | 变量/函数名必须蛇形命名 |
| `assignment_linter` | 赋值必须使用 `<-`，不使用 `=` |
| `commented_code_linter` | 禁止大块注释掉的代码 |
| `missing_package_linter` | 检测未声明的包依赖 |
| `unnecessary_concatenation_linter` | 避免不必要的 `paste()` 拼接 |

### styler（格式化）

`styler::style_dir(".", dry = "on")` 以只读模式检测是否有文件需要格式化，发现差异则 CI 失败。

---

## Groovy 代码检查说明

所有 `*.groovy` 文件经 CodeNarc 检查（通过 npm-groovy-lint），配置文件 [codenarc.xml](../../../.lintrc/backend/groovy/codenarc.xml) 位于仓库根目录。
Jenkinsfile 由独立的 `jenkins-lint` job 处理，无 Groovy 文件时自动跳过。

### CodeNarc（via npm-groovy-lint）

| 规则集 | 说明 |
| --- | --- |
| `basic` | 空 catch、重复导入、空语句等基础问题 |
| `braces` | 花括号位置和风格 |
| `formatting` | 行宽 120，4 空格缩进，尾随空格 |
| `naming` | 类名 PascalCase，方法名/变量名 camelCase |
| `security` | 不安全的随机数、SQL 拼接等 |
| `size.CyclomaticComplexity` | 方法圈复杂度不超过 15 |
| `imports.NoWildcardImports` | 禁止通配符导入 `import com.example.*` |
| `unused` | 未使用的导入、变量、方法 |

---

## Elixir 代码检查说明

所有 `*.ex / *.exs` 文件经两层检查（Credo + mix format），排除 `_build/`、`deps/`。
配置文件 [.credo.exs](../../../.lintrc/backend/elixir/.credo.exs) 位于仓库根目录，无 Elixir 文件时自动跳过。

### Credo（静态分析，strict 模式）

| 类别 | 代表规则 | 说明 |
| --- | --- | --- |
| Consistency | `SpaceAroundOperators` | 运算符两侧必须有空格 |
| Readability | `MaxLineLength(120)` | 行宽 120 |
| Readability | `ModuleDoc` | 模块必须有 `@moduledoc` |
| Readability | `Specs` | 公共函数必须有 `@spec` 类型标注 |
| Readability | `SinglePipe` | 禁止单管道操作（用 `fn` 替代） |
| Refactor | `CyclomaticComplexity` | 函数圈复杂度限制 |
| Refactor | `FunctionArity` | 函数参数数量限制 |
| Warning | `IoInspect` | 禁止遗留 `IO.inspect` 调试输出 |
| Warning | `UnsafeToAtom` | 禁止不安全的 `String.to_atom/1` |

### mix format（格式化）

`mix format --check-formatted` 检查所有 .ex/.exs 文件格式是否符合官方 Elixir 格式规范。

---

## Haskell 代码检查说明

所有 `*.hs / *.lhs` 文件经两层检查（HLint + Fourmolu），排除 `.stack-work/`、`dist-newstyle/`。
配置文件 [.hlint.yaml](../../../.lintrc/backend/haskell/.hlint.yaml) 位于仓库根目录，无 Haskell 文件时自动跳过。

### HLint（代码提示）

| 类别 | 说明 |
| --- | --- |
| 冗余模式 | 检测 `do { x }` 可简化为 `x` 等冗余结构 |
| 函数融合 | `map f (map g x)` 提示改为 `map (f . g) x` |
| 命名建议 | 驼峰命名规范 |
| 自定义 hint | 可在 `.hlint.yaml` 中添加项目特定的重构建议 |

### Fourmolu（格式化）

`fourmolu --mode check` 检查所有 .hs 文件是否符合 Fourmolu 格式规范（缩进、换行、空格一致性）。

---

## Erlang 代码检查说明

所有 `*.erl / *.hrl` 文件经 Elvis 检查，排除 `_build/`、`deps/`。
配置文件 [.elvis.config](../../../.lintrc/backend/erlang/.elvis.config) 位于仓库根目录，无 Erlang 文件时自动跳过。

### Elvis（代码规范检查）

| 规则 | 说明 |
| --- | --- |
| `line_length(120)` | 行宽不超过 120 字符 |
| `no_tabs` | 禁止制表符缩进 |
| `nesting_level(4)` | 嵌套层级不超过 4 |
| `god_modules(25)` | 模块函数不超过 25 个 |
| `no_if_expression` | 推荐使用 `case` 而非 `if` |
| `module_naming_convention` | 模块名必须蛇形小写 |
| `function_naming_convention` | 函数名必须蛇形小写 |
| `state_record_and_type` | GenServer state 必须有 record 和 type 定义 |
<!-- cspell:disable-next-line -->
| `dont_repeat_yourself(10)` | 检测重复代码块 |
| `no_debug_call` | 禁止遗留 `io:format` 调试输出 |

---

## Perl 代码检查说明

所有 `*.pl / *.pm / *.t` 文件经两层检查（Perl::Critic + perltidy），排除 `vendor/`。
配置文件 [.perlcriticrc](../../../.lintrc/backend/perl/.perlcriticrc) 位于仓库根目录，无 Perl 文件时自动跳过。

### Perl::Critic（静态分析，severity 3+）

| 类别 | 代表规则 | 说明 |
| --- | --- | --- |
| 严格模式 | `TestingAndDebugging::RequireUseStrict` | 必须 `use strict` |
| 警告模式 | `TestingAndDebugging::RequireUseWarnings` | 必须 `use warnings` |
| 复杂度 | `Subroutines::ProhibitExcessComplexity(10)` | McCabe 复杂度不超过 10 |
| 可读性 | `Variables::ProhibitPunctuationVars` | 避免 `$!`、`$/` 等魔法变量 |
| 安全 | `InputOutput::RequireCheckedSyscalls` | 系统调用结果必须检查 |
| 数字 | `ValuesAndExpressions::ProhibitMagicNumbers` | 禁止魔法数字（允许 -1、0、1、2） |
| 模块 | `Modules::ProhibitMultiplePackages` | 一个文件只能有一个 package |

### perltidy（格式化）

`perltidy -l=120 -i=4` 检查所有 .pl/.pm 文件的代码格式是否符合规范（行宽 120，4 空格缩进）。

---

## Julia 代码检查说明

所有 `*.jl` 文件经 JuliaFormatter 检查，配置文件 [.JuliaFormatter.toml](../../../.lintrc/backend/julia/.JuliaFormatter.toml) 位于仓库根目录。
无 Julia 文件时自动跳过。

### JuliaFormatter（格式化）

| 项目 | 配置 |
| --- | --- |
| 缩进 | 4 空格 |
| 行宽 | 120 字符 |
| 尾随逗号 | 启用（多行参数） |
| 行尾规范 | Unix（LF） |
| `always_use_return` | 禁用（允许隐式 return） |

CI 使用 `format(".", overwrite=false)` 以只读模式检查，发现差异则失败，不自动修改文件。

---

## Zig 代码检查说明

所有 `*.zig` 文件经两层检查（zig fmt + zig ast-check），排除 `zig-cache/`、`zig-out/`。
无 Zig 文件时自动跳过。

### zig fmt（格式化）

`zig fmt --check .` 检查所有 .zig 文件是否符合官方 Zig 格式规范（Zig 有且仅有一种官方格式，没有配置选项）。

### zig ast-check（语法 + 语义检查）

`zig ast-check` 对每个文件进行 AST 级语法和部分语义检查，包括未使用的变量、类型错误等。

---

## Nim 代码检查说明

所有 `*.nim / *.nims` 文件经两层检查（nimpretty 格式化 + nim check 语法检查），排除 `nimcache/`。
无 Nim 文件时自动跳过。

### nimpretty（格式化）

`nimpretty --indent:2 --maxLineLen:120` 检查格式是否符合规范（2 空格缩进，行宽 120）。

### nim check（语法检查）

`nim check` 对每个 .nim 文件进行完整的语法和类型检查，不实际编译。

---

## Crystal 代码检查说明

所有 `*.cr` 文件经两层检查（Ameba 静态分析 + crystal tool format），排除 `vendor/`、`lib/`。
配置文件 [.ameba.yml](../../../.lintrc/backend/crystal/.ameba.yml) 位于仓库根目录，无 Crystal 文件时自动跳过。

### Ameba（静态分析）

| 类别 | 代表规则 | 说明 |
| --- | --- | --- |
| Lint | `ShadowingOuterLocalVar` | 禁止局部变量遮蔽外部变量 |
| Style | `NilCheck` | 推荐使用 `.nil?` 而非 `== nil` |
| Style | `RedundantReturn` | 禁止冗余的 `return` |
| Style | `VerboseBlock` | 单行块推荐使用简洁写法 |
| Metrics | `CyclomaticComplexity(10)` | 圈复杂度不超过 10 |
| Metrics | `MethodLength(50)` | 方法不超过 50 行 |
| Naming | `TypeNames` | 类型名必须 PascalCase |

### crystal tool format（格式化）

`crystal tool format --check` 检查所有 .cr 文件是否符合官方 Crystal 格式规范。

---

## F# 代码检查说明

所有 `*.fs / *.fsx / *.fsi` 文件经两层检查（Fantomas 格式化 + FSharpLint 静态分析），排除 `vendor/`、`bin/`、`obj/`。
配置文件 [fsharplint.json](../../../.lintrc/backend/fsharp/fsharplint.json) 位于仓库根目录，无 F# 文件时自动跳过。

### Fantomas（格式化）

Fantomas 是 F# 官方推荐格式化工具，读取 `.editorconfig` 中的 `[*.fs]` 配置。
`fantomas --check .` 检查所有 F# 文件格式是否统一。

### FSharpLint（静态分析）

| 项目 | 说明 |
| --- | --- |
| 命名规范 | 模块/类型名 PascalCase，函数/变量名 camelCase |
| 行宽 | 120 字符（`maxLineLength`） |
| 代码质量 | 检测未使用的绑定、冗余括号、空的 `if` 体等 |

---

## Clojure 代码检查说明

所有 `*.clj / *.cljs / *.cljc` 文件经两层检查（clj-kondo + cljfmt），排除 `vendor/`、`.cpcache/`。
配置文件 [.clj-kondo/config.edn](../../../.lintrc/backend/clojure/config.edn) 位于仓库根目录，无 Clojure 文件时自动跳过。

### clj-kondo（静态分析）

| 规则 | 级别 | 说明 |
| --- | --- | --- |
| `unused-binding` | warn | 未使用的局部绑定 |
| `missing-docstring` | warn | 公共函数缺少 docstring |
| `unreachable-code` | error | 不可达代码 |
| `unused-namespace` | warn | 未使用的命名空间引入 |
| `unresolved-symbol` | error | 无法解析的符号 |
| `shadowed-var` | warn | 变量遮蔽 |

### cljfmt（格式化）

`clojure -Tcljfmt check` 检查所有 Clojure 文件格式是否符合标准规范（缩进、空格、换行）。

---

## OCaml 代码检查说明

所有 `*.ml / *.mli` 文件经 ocamlformat 检查，配置文件 [.ocamlformat](../../../.lintrc/backend/ocaml/.ocamlformat) 位于仓库根目录。
排除 `_build/`、`vendor/`、`.opam/`，无 OCaml 文件时自动跳过。

### ocamlformat（格式化）

| 项目 | 配置 |
| --- | --- |
| 版本 | 0.26.2 |
| 基础 profile | `default` |
| 行宽 | 120 字符 |
| `break-cases` | `fit`（case 表达式优先单行） |
| `if-then-else` | `keyword-first`（关键字独立成行） |
| `doc-comments` | `before`（文档注释位于定义之前） |
| `sequence-style` | `separator`（`;` 分隔符风格） |

---

## SCSS 代码检查说明

所有 `*.scss / *.sass` 文件经 stylelint 检查，配置文件 [.stylelintrc-scss.json](../../../.lintrc/frontend/css-styles/.stylelintrc-scss.json) 位于仓库根目录。
排除 `node_modules/`、`vendor/`、`dist/`，无 SCSS 文件时自动跳过。

### stylelint + stylelint-scss

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| SCSS 特有 | `scss/at-rule-no-unknown` | 禁止未知的 `@` 规则 |
| SCSS 特有 | `scss/no-duplicate-dollar-variables` | 禁止重复 `$` 变量 |
| SCSS 特有 | `scss/no-global-function-names` | 禁止使用已废弃的全局 SCSS 函数（用 `math.div` 等替代） |
| SCSS 特有 | `scss/dollar-variable-pattern` | 变量名必须 `kebab-case` |
| SCSS 特有 | `scss/at-mixin-pattern` | mixin 名必须 `kebab-case` |
| 通用 | `no-duplicate-selectors` | 禁止重复选择器 |
| 通用 | `max-nesting-depth: 4` | 嵌套层级不超过 4 |
| 通用 | `color-no-invalid-hex` | 禁止无效十六进制颜色值 |

---

## Less 代码检查说明

所有 `*.less` 文件经 stylelint 检查，配置文件 [.stylelintrc-less.json](../../../.lintrc/frontend/css-styles/.stylelintrc-less.json) 位于仓库根目录。
排除 `node_modules/`、`vendor/`、`dist/`，无 Less 文件时自动跳过。

### stylelint + postcss-less

| 规则 | 说明 |
| --- | --- |
| `color-no-invalid-hex` | 禁止无效十六进制颜色 |
| `declaration-no-important` | 禁止 `!important` |
| `no-duplicate-selectors` | 禁止重复选择器 |
| `no-invalid-double-slash-comments` | 禁止 `// 注释`（Less 外的标准 CSS 不支持） |
| `unit-no-unknown` | 禁止未知单位 |
| `max-nesting-depth: 4` | 嵌套层级不超过 4 |
| `selector-max-compound-selectors: 4` | 复合选择器不超过 4 层 |

---

## Svelte 代码检查说明

所有 `*.svelte` 文件经 ESLint + eslint-plugin-svelte 检查，配置文件 [.eslintrc-svelte.json](../../../.lintrc/frontend/frameworks/.eslintrc-svelte.json) 位于仓库根目录。
排除 `node_modules/`、`.svelte-kit/`、`dist/`，无 Svelte 文件时自动跳过。

### eslint-plugin-svelte

| 规则 | 说明 |
| --- | --- |
| `svelte/no-at-html-tags` | 禁止 `{@html ...}` XSS 风险 |
| `svelte/no-dupe-on-directives` | 禁止重复 `on:` 事件指令 |
| `svelte/no-dupe-use-directives` | 禁止重复 `use:` 指令 |
| `svelte/no-target-blank` | 禁止未加 `rel="noopener"` 的 `target="_blank"` |
| `svelte/button-has-type` | `<button>` 必须显式声明 `type` 属性 |
| `svelte/require-each-key` | `{#each}` 块必须有 `key` 表达式 |
| `svelte/valid-compile` | 组件必须通过 Svelte 编译器检查 |
| `svelte/no-reactive-reassign` | 禁止在响应式语句中重新赋值 |

---

## Astro 代码检查说明

所有 `*.astro` 文件经 ESLint + eslint-plugin-astro 检查，配置文件 [.eslintrc-astro.json](../../../.lintrc/frontend/frameworks/.eslintrc-astro.json) 位于仓库根目录。
排除 `node_modules/`、`dist/`、`.astro/`，无 Astro 文件时自动跳过。

### eslint-plugin-astro

| 规则 | 说明 |
| --- | --- |
| `astro/no-conflict-set-directives` | 禁止冲突的 `set:*` 指令 |
| `astro/no-set-html-directive` | 警告 `set:html` XSS 风险（warn 级别） |
| `astro/no-set-text-directive` | 禁止 `set:text`（已废弃，用 `{variable}` 替代） |
| `astro/no-unused-define-vars-in-style` | 禁止 `<style>` 中未使用的 CSS 变量 |
| `astro/valid-compile` | 组件必须通过 Astro 编译器检查 |
| `astro/no-deprecated-*` | 检测所有已废弃的 Astro API |

---

## Dotenv / INI 代码检查说明

所有 `.env*` 文件（排除 `.env.example`、`.env.sample`、`node_modules/`、`vendor/`）经 dotenv-linter 检查。
无 `.env` 文件时自动跳过。

### dotenv-linter

| 检查项 | 说明 |
| --- | --- |
| `DuplicatedKey` | 禁止重复的键名 |
| `IncorrectDelimiter` | 键名中禁止使用空格（只允许下划线） |
| `LeadingCharacter` | 键名不能以数字或特殊字符开头 |
| `LowercaseKey` | 键名必须全大写 |
| `SpacingAroundEqual` | 等号两侧不得有空格 |
| `TrailingWhitespace` | 禁止行尾空格 |
| `QuoteCharacter` | 值的引号风格一致性 |

`--skip UnorderedKey` 跳过键名排序检查（允许按语义分组）。

---

## CSV 代码检查说明

所有 `*.csv` 文件经 csvlint 检查，排除 `node_modules/`、`vendor/`，无 CSV 文件时自动跳过。

### csvlint（格式合规性）

| 检查项 | 说明 |
| --- | --- |
| 编码 | 文件必须是合法的 UTF-8 编码 |
| 行一致性 | 所有行的列数必须相同 |
| 引号 | 引号必须正确闭合 |
| 换行符 | 检测异常换行 |
| 标题行 | 检测标题行是否存在重复列名 |

---

## Nix 代码检查说明

所有 `*.nix` 文件经三层检查（statix + deadnix + nixpkgs-fmt），排除 `vendor/`、`result/`。
配置文件 [.statix.toml](../../../.lintrc/backend/nix/.statix.toml) 位于仓库根目录，无 Nix 文件时自动跳过。

### statix（反模式检测）

| 检查项 | 说明 |
| --- | --- |
| `empty_let_in` | 禁止空的 `let ... in` 块 |
| `bool_simplification` | `if x then true else false` 简化为 `x` |
| `manual_inherit` | 建议使用 `inherit` 而非手动属性复制 |
| `useless_parens` | 检测不必要的括号 |
| `eta_reduction` | Lambda 函数的 eta 简化建议 |

### deadnix（死代码检测）

`deadnix --fail .` 检测 .nix 文件中未使用的函数参数和变量定义。

### nixpkgs-fmt（格式化）

`nixpkgs-fmt --check` 检查所有 .nix 文件是否符合 nixpkgs 官方格式规范。

---

## Docker Compose 代码检查说明

`docker-compose*.yml`、`compose.yml` 等 Docker Compose 文件经 `docker compose config` 验证。
无 Compose 文件时自动跳过。

### docker compose config（Schema 验证）

`docker compose config --quiet` 对每个 Compose 文件进行完整 Schema 验证：

| 检查项 | 说明 |
| --- | --- |
| YAML 语法 | 文件必须是有效 YAML |
| Schema 合规 | 符合 Docker Compose 规范 Schema |
| 服务配置 | 服务名、镜像名、端口映射等字段合法性 |
| 环境变量 | `environment` 列表格式正确 |
| 卷挂载 | `volumes` 路径格式正确 |
| 网络配置 | `networks` 配置合法 |

---

## Helm Charts 代码检查说明

`Chart.yaml` 所在目录识别为 Helm Chart，经两层检查（helm lint + helm template），排除 `vendor/`。
无 Chart.yaml 时自动跳过。

### helm lint（--strict 模式）

| 检查项 | 说明 |
| --- | --- |
| `Chart.yaml` 必填字段 | `name`、`version`、`apiVersion` 必须存在 |
| `values.yaml` | 默认 values 文件必须合法 |
| 模板语法 | Go Template 语法正确性 |
| `--strict` | 将所有 warning 升级为 error |

### helm template（模板渲染）

`helm template test-release` 对每个 Chart 进行完整模板渲染，确保默认 values 下无渲染错误。

---

## AWS CloudFormation 代码检查说明

`cloudformation/`、`cfn/`、`infrastructure/` 目录下的 YAML/JSON 文件经 cfn-lint 检查。
配置文件 [.cfnlintrc.yml](../../../.lintrc/infrastructure/cloudformation/.cfnlintrc.yml) 位于仓库根目录，无 CloudFormation 文件时自动跳过。

### cfn-lint

| 类别 | 说明 |
| --- | --- |
| `E*`（Error） | 模板结构错误、资源类型不存在、必填属性缺失等 |
| `W*`（Warning） | 不推荐的属性、区域兼容性问题等 |
| Schema 验证 | 对照 AWS CloudFormation Resource Schema 验证每个资源的属性合法性 |
| 跨区域兼容 | 验证资源在配置的目标区域（us-east-1、eu-west-1 等）是否可用 |

---

## Azure Bicep 代码检查说明

所有 `*.bicep / *.bicepparam` 文件经两层检查（bicep build + bicep lint），排除 `vendor/`。
无 Bicep 文件时自动跳过。

### az bicep build（编译）

`az bicep build --no-restore` 将 .bicep 文件编译为 ARM JSON 模板，检测语法错误和引用问题。

### az bicep lint（规范检查）

`az bicep lint` 在编译的基础上运行内置 Linter 规则：

| 规则 | 说明 |
| --- | --- |
| `no-unused-params` | 禁止未使用的参数 |
| `no-unused-vars` | 禁止未使用的变量 |
| `prefer-interpolation` | 推荐使用字符串插值而非 `concat()` |
| `secure-parameter-default` | 安全参数不得有默认值 |
| `no-hardcoded-env-urls` | 禁止硬编码的环境 URL |

---

## GitLab CI 代码检查说明

`.gitlab-ci.yml / .gitlab-ci.yaml` 文件经 yamllint 检查，无 GitLab CI 文件时自动跳过。

### yamllint（语法 + 格式检查）

yamllint 对 GitLab CI 配置文件进行基础 YAML 格式检查：

| 检查项 | 说明 |
| --- | --- |
| YAML 语法 | 缩进、冒号、引号等格式正确 |
| 行宽 | 宽松限制（200 字符，适配 CI 命令行） |
| `truthy` | 布尔值只允许 `true`、`false`、`on` |
| 重复 key | 禁止同一级别出现重复键名 |

> 如需完整的 GitLab CI 语义验证（job 定义、stage 顺序、变量引用等），可配置调用 GitLab API `/api/v4/ci/lint`（需要 GitLab Token）。

---

## Jenkinsfile 代码检查说明

`Jenkinsfile*` 文件经 npm-groovy-lint 检查，排除 `vendor/`，无 Jenkinsfile 时自动跳过。

### npm-groovy-lint（Groovy/CodeNarc，针对 Pipeline DSL）

npm-groovy-lint 内置 Groovy 语法检查，适用于声明式和脚本式 Jenkinsfile：

| 检查项 | 说明 |
| --- | --- |
| Groovy 语法 | Pipeline DSL 语法合规性 |
| 代码风格 | 缩进、行宽、命名等基础代码风格 |
| 安全问题 | 检测明文密码、不安全的脚本等 |
| `--failon warning` | warning 级别规则也导致 CI 失败 |

> 完整的 Jenkinsfile 声明式 Pipeline 验证可通过 Jenkins 服务器的 `/pipeline-model-converter/validate` REST API 实现。

---

## CircleCI 代码检查说明

`.circleci/config.yml` 经 CircleCI CLI 验证，无 CircleCI 配置时自动跳过。

### circleci config validate

`circleci config validate` 对 CircleCI 配置文件进行本地验证：

| 检查项 | 说明 |
| --- | --- |
| YAML 语法 | 配置文件基础格式合规 |
| Schema 验证 | CircleCI 配置 Schema（jobs、steps、workflows 结构） |
| orb 引用 | 检测引用了不存在的 orb（有网络时） |
| 参数类型 | 参数类型和必填字段检查 |

> `|| true` 使 orb 相关的网络错误不影响 CI 流程（无 token 时 orb 验证会失败）。

---

## Packer 代码检查说明

所有 `*.pkr.hcl / *.pkr.json` 文件经两层检查（packer fmt + packer validate），排除 `vendor/`。
无 Packer 文件时自动跳过。

### packer fmt（格式化）

`packer fmt -check` 检查 HCL 格式的 Packer 配置是否符合官方格式规范（等号对齐、缩进等）。

### packer validate（语法验证）

`packer validate` 验证 Packer 模板的语法和基本配置合法性（无需真实云账号，仅做本地语法检查）。

---

## Kustomize 代码检查说明

`kustomization.yml / kustomization.yaml` 所在目录识别为 Kustomize overlay，经 `kubectl kustomize` 验证。
无 kustomization.yaml 时自动跳过。

### kubectl kustomize（渲染验证）

`kubectl kustomize <dir> > /dev/null` 对每个 Kustomize overlay 进行完整渲染验证：

| 检查项 | 说明 |
| --- | --- |
| 基础引用 | `bases` 或 `resources` 引用的文件/URL 可达 |
| Patch 合法性 | `patchesStrategicMerge`、`patchesJson6902` 格式正确 |
| 变量替换 | `vars` 引用的字段存在 |
| 最终输出 | 渲染后的 YAML 是合法的 Kubernetes manifest |

---

## Pulumi 代码检查说明

Pulumi 基础设施代码（TypeScript/Python/Go/C# 等）的 lint 通过对应语言的 lint job 检查（TypeScript、Python、Go、C#.NET 等）。

Pulumi 程序的**基础设施预览**（`pulumi preview`）需要云账号凭证，不适合在公开 CI 中自动运行。建议通过以下方式集成：

| 场景 | 方案 |
| --- | --- |
| PR 预览 | 使用 `pulumi/actions` 配合云账号 secret |
| 本地验证 | `pulumi preview --diff` 查看变更计划 |
| Dry-run | 配置 local state backend 进行无云验证 |

---

## Secret 泄露检测说明

每次 PR 和 push 全量扫描提交历史，使用 Gitleaks 检测 secret 泄露。
配置文件 [.gitleaks.toml](../../../.lintrc/security/.gitleaks.toml) 位于仓库根目录。

### Gitleaks（gitleaks-action@v2）

Gitleaks 使用正则规则检测代码中的各类 secret：

| 类别 | 说明 |
| --- | --- |
| 云平台密钥 | AWS Access Key、Azure SAS Token、GCP Service Account 等 |
| Git 平台 Token | GitHub PAT、GitLab Token、Bitbucket Token 等 |
| API 密钥 | Generic API Key、Stripe、Twilio、Slack 等 |
| 数据库凭证 | 连接字符串、密码字段 |
| 私钥 | RSA、EC、PGP 私钥 |
| 自定义规则 | 项目特定的 secret 模式（配置在 `.gitleaks.toml`） |

**Allowlist（已配置忽略）**：

- 示例凭证文件（`.env.example`、`.env.sample`）
- 锁文件（`*.lock`、`go.sum` 等）
- GitHub Actions `${{ secrets.* }}` 引用

---

## 通用 SAST 说明

每次 PR 和 push 运行 Semgrep 对所有源码进行静态应用安全测试。
配置文件 [.semgrep.yml](../../../.lintrc/security/.semgrep.yml) 包含自定义规则，同时引用社区规则集。

### Semgrep（SAST）

| 规则集 | 说明 |
| --- | --- |
| `p/owasp-top-ten` | OWASP Top 10 安全漏洞检测 |
| `p/secrets` | 硬编码 secret 检测（额外补充 Gitleaks） |
| `p/security-audit` | 通用安全审计规则 |
| 自定义规则 | 硬编码密码、SQL 注入、eval 注入等（`.semgrep.yml`） |

覆盖语言：Python、JavaScript/TypeScript、Go、Java、Ruby、C/C++、PHP、Kotlin 等 30+ 语言。

> `|| true` 使 Semgrep 在无规则集网络访问时不阻塞 CI，但本地自定义规则仍会被检查。

---

## 依赖漏洞扫描说明

每次 PR 和 push 使用 Trivy 扫描所有依赖文件（`fs` 模式）中的已知 CVE 漏洞。
忽略规则配置在 [.trivyignore](../../../.lintrc/security/.trivyignore)。

### Trivy 文件系统扫描（aquasecurity/trivy-action）

| 参数 | 说明 |
| --- | --- |
| `scan-type: fs` | 扫描整个仓库文件系统中的依赖文件 |
| `vuln-type: library` | 仅扫描第三方库漏洞（不扫描 OS 包） |
| `severity: CRITICAL,HIGH` | 仅报告 CRITICAL 和 HIGH 级别漏洞 |
| `ignore-unfixed: true` | 忽略尚无修复版本的漏洞 |
| `exit-code: 1` | 发现漏洞时 CI 失败 |

支持扫描：Go modules、npm、pip、Maven、Gradle、Cargo、Composer、NuGet 等。

---

## 容器镜像扫描说明

如果仓库包含 `Dockerfile`，CI 会自动构建镜像并使用 Trivy 扫描 OS 包和库漏洞。
忽略规则配置在 [.trivyignore](../../../.lintrc/security/.trivyignore)，无 Dockerfile 时自动跳过。

### Trivy 镜像扫描

| 参数 | 说明 |
| --- | --- |
| `scan-type: image` | 扫描 Docker 镜像层 |
| `vuln-type: os,library` | 同时扫描 OS 包（apt/yum 等）和第三方库 |
| `severity: CRITICAL,HIGH` | 仅报告 CRITICAL 和 HIGH 级别漏洞 |
| `ignore-unfixed: true` | 忽略尚无修复的漏洞 |
| `exit-code: 1` | 发现漏洞时 CI 失败 |

---

## License 合规检查说明

每次 PR 和 push 检查项目依赖的 License 是否在允许列表内。
配置文件 [.licensed.yml](../../../.lintrc/security/.licensed.yml) 位于仓库根目录。

### 允许的 License 类型

| 允许 | License |
| --- | --- |
| 宽松 | MIT、Apache-2.0、BSD-2-Clause、BSD-3-Clause、ISC |
| 公共领域 | CC0-1.0、Unlicense、0BSD、WTFPL |
| 文档类 | CC-BY-4.0 |
| 语言特定 | Python-2.0（PSF）、Artistic-2.0 |

### 检查工具

- **Node.js**：`license-checker --onlyAllow "..."` 检查 `node_modules` 中所有包的 License
- **Python**：`pip-licenses --allow-only "..."` 检查已安装 Python 包的 License

> GPL、AGPL、LGPL、SSPL 等 Copyleft License 不在允许列表内，一旦引入会导致 CI 失败。

---

## reStructuredText 代码检查说明

所有 `*.rst` 文件经两层检查（rstcheck + doc8），排除 `vendor/`、`_build/`。
无 RST 文件时自动跳过。

### rstcheck（语法检查）

| 检查项 | 说明 |
| --- | --- |
| RST 语法 | 标题线长度、指令格式、角色语法等 |
| 内联代码块 | 代码块语言语法验证（Python、bash 等） |
| 超链接 | 引用目标是否存在 |
| `--report-level warning` | warning 及以上级别导致 CI 失败 |

### doc8（样式检查）

| 检查项 | 配置 |
| --- | --- |
| 行宽 | 最大 120 字符 |
| 尾随空格 | 禁止 |
| 文件编码 | 必须是 UTF-8 |
| 不必要的空行 | 检测节标题前多余的空行 |

---

## AsciiDoc 代码检查说明

所有 `*.adoc / *.asciidoc` 文件经 asciidoctor 检查，排除 `vendor/`、`node_modules/`。
无 AsciiDoc 文件时自动跳过。

### asciidoctor（--failure-level WARN）

`asciidoctor --failure-level WARN -o /dev/null` 对每个 .adoc 文件进行构建验证：

| 检查项 | 说明 |
| --- | --- |
| AsciiDoc 语法 | 标题层级、块定界符、宏语法等 |
| include 引用 | `include::file.adoc[]` 引用的文件是否存在 |
| 图片引用 | `image::path[]` 引用的文件是否存在 |
| 交叉引用 | `<<anchor>>` 引用的锚点是否存在 |
| `--failure-level WARN` | warning 及以上导致 CI 失败 |

---

## LaTeX 代码检查说明

所有 `*.tex` 文件经两层检查（chktex + lacheck），配置文件 [.chktexrc](../../../.lintrc/docs/latex/.chktexrc) 位于仓库根目录。
无 LaTeX 文件时自动跳过。

### chktex（语义检查）

| 检查项 | 说明 |
| --- | --- |
| 引号 | 推荐使用 ` `` ` 和 `''` 而非 `"` |
| 连字符 | `-`、`--`、`---` 使用场景区分 |
| 行内公式 | `$` 与 `\(` 的使用规范 |
| 空白 | 单词后的句点应使用 `\.` 正确处理行距 |
| 命令空格 | `\foo bar` 与 `\foo{} bar` 的区别 |

### lacheck（结构检查）

lacheck 进行互补的 LaTeX 结构检查（括号配对、环境嵌套、未关闭的组等）。

---

## Jupyter Notebook 代码检查说明

所有 `*.ipynb` 文件经三层检查（nbformat 验证 + nbqa flake8 + nbqa black），排除 `.ipynb_checkpoints/`。
无 Notebook 文件时自动跳过。

### nbformat validate（Schema 验证）

`python -m nbformat.validate` 验证 .ipynb 文件的 JSON Schema 合规性，确保 notebook 格式版本正确。

### nbqa flake8（代码质量）

`nbqa flake8 . --max-line-length=120` 对 notebook 中每个代码 cell 运行 flake8 检查：未使用的导入、未定义的变量、代码格式问题等。

### nbqa black（格式化）

`nbqa black . --check` 以只读模式检查 notebook 代码 cell 是否符合 Black 格式规范（行宽 120），发现差异则 CI 失败。

### nbqa isort（导入排序）

`nbqa isort . --check-only` 检查 notebook 中的 Python 导入语句顺序是否符合 isort 规范。

---

## Makefile 代码检查说明

所有 `Makefile / GNUmakefile / *.mk` 文件经 checkmake 检查，排除 `vendor/`、`node_modules/`。
无 Makefile 时自动跳过。

### checkmake

| 规则 | 说明 |
| --- | --- |
| `minphony` | 建议将非文件目标声明为 `.PHONY` |
| `maxbodylength` | recipe 不宜过长，建议拆分为脚本 |
| `ulimit` | 检测可能导致无限递归的规则 |
| `phonydeclared` | `.PHONY` 中声明的目标必须存在 |
| `timestampexpanded` | 避免在 recipe 中展开时间戳 |

---

## CMakeLists.txt 代码检查说明

所有 `CMakeLists.txt / *.cmake` 文件经两层检查（cmakelint + cmake-format），排除 `vendor/`、`build/`、`CMakeFiles/`。
配置文件 [.cmake-format.yml](../../../.lintrc/infrastructure/build-systems/.cmake-format.yml) 位于仓库根目录，无 CMake 文件时自动跳过。

### cmakelint（规范检查）

| 检查项 | 说明 |
| --- | --- |
| 命令风格 | CMake 命令必须使用 `canonical`（小写）形式 |
| 缩进 | 使用 2 空格缩进 |
| 行宽 | 不超过 120 字符 |
| `if/endif` | `if()` 和 `endif()` 必须匹配 |
| 变量引用 | `${VAR}` 引用规范 |

### cmake-format（格式化）

`cmake-format --check` 检查格式是否符合 `.cmake-format.yml` 配置（行宽 120，2 空格缩进，关键字大写）。

---

## Bazel BUILD 代码检查说明

所有 `BUILD / BUILD.bazel / WORKSPACE / *.bzl` 文件经两层检查（buildifier lint + buildifier format），排除 `vendor/`。
配置文件 [.buildifier.json](../../../.lintrc/infrastructure/build-systems/.buildifier.json) 位于仓库根目录，无 Bazel 文件时自动跳过。

### buildifier（lint + 格式化）

| 功能 | 说明 |
| --- | --- |
| `--lint=warn` | 检查 Bazel 文件的最佳实践问题（弃用函数、不安全的属性等） |
| `--mode=check` | 检查格式是否符合 buildifier 规范（不自动修改） |
| `all` 警告 | 启用所有内置 lint 警告 |
| 自动类型检测 | `"type": "auto"` 自动识别 BUILD/WORKSPACE/.bzl 文件类型 |

覆盖检查：

- `native.` 函数已迁移到 Starlark 等价
- `load()` 导入路径规范
- 属性排序（`name` 必须第一）
- 函数参数命名规范

---

## Drone CI 配置检查说明

检测项目根目录及子目录中的 `.drone.yml` / `.drone.yaml` 文件，使用 yamllint 进行结构与语法校验。

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| `line-length.max` | `200` | Drone 配置行通常较长 |
| `truthy.allowed-values` | `"true"`, `"false"` | 明确允许的布尔值字面量 |

---

## Bitbucket Pipelines 配置检查说明

检测 `bitbucket-pipelines.yml`，使用 yamllint 进行校验。采用与 Drone CI 相同的行长宽松策略（最大 200 字符），同时检查缩进、重复键、空文件等基本结构问题。

---

## Tekton Pipelines 配置检查说明

通过在 YAML 文件中搜索 `tekton.dev` API Group 自动识别 Tekton 资源文件，使用 `@ibm/tekton-lint` 进行规范校验。

| 检查项 | 说明 |
| --- | --- |
| API 版本一致性 | Task/Pipeline/Run 的 `apiVersion` 字段 |
| 参数引用完整性 | `$(params.xxx)` 引用必须有对应声明 |
| 结果引用完整性 | `$(tasks.xxx.results.yyy)` 引用链完整 |
| 步骤镜像规范 | 容器镜像不得使用 `latest` tag |
| 工作区挂载一致 | workspace 声明与引用对应 |

---

## Argo Workflows 配置检查说明

通过在 YAML 文件中搜索 `argoproj.io` API Group 自动识别 Argo Workflow 资源文件，使用 Argo CLI 的 `argo lint` 命令进行校验。

| 检查项 | 说明 |
| --- | --- |
| 工作流结构 | `spec.entrypoint` 与 `templates` 定义一致 |
| 模板引用 | `steps/dag` 中引用的 template 名称存在 |
| 参数声明 | `arguments.parameters` 与模板签名匹配 |
| 制品配置 | `artifacts` 的 `from` 引用指向有效步骤 |

---

## OPA / Rego 代码检查说明

所有 `*.rego` 文件经过三层检查，排除 `vendor/` 目录。

### opa fmt（格式检查）

使用 `opa fmt --fail` 检查格式，不自动修改文件。

### opa check（解析 + 类型）

`opa check` 对 Rego 文件执行解析正确性和类型一致性检查。

### conftest verify（测试验证）

使用 `conftest verify` 验证 `policy/` 目录下的 OPA 测试，确保策略测试通过。

---

## Nginx 配置检查说明

检测 `nginx.conf`、`*.nginx`、`nginx/*.conf`、`sites-available/*` 等路径下的 Nginx 配置文件，进行两层检查。

| 工具 | 检查内容 |
| --- | --- |
| `nginx -t` | 配置语法正确性（指令拼写、块结构、引用路径） |
| `gixy` | 安全配置审查（SSRF、HostHeader 注入、add\_header 覆盖、配置错误等） |

---

## Apache 配置检查说明

检测 `httpd.conf`、`apache2.conf`、`*.vhost`、`.htaccess` 等 Apache 配置文件，使用 `apachectl -t` 进行语法校验，并对 `.htaccess` 中的常见指令（`RewriteRule`、`Options`、`Deny`、`Allow`、`AuthType`）进行存在性验证。

---

## Gherkin / Cucumber 代码检查说明

所有 `*.feature` 文件经过 gherkin-lint 检查，排除 `vendor/`、`node_modules/` 目录。

配置文件：[.gherkin-lintrc](../../../.lintrc/testing/.gherkin-lintrc)，主要规则：

| 规则 | 说明 |
| --- | --- |
| `indentation` | Feature: 0、Background/Scenario: 2、Step: 4、Examples: 4 |
| `no-dupe-scenario-names` | 禁止同一 Feature 内出现重复场景名称 |
| `no-duplicate-tags` | 禁止重复 Tag |
| `no-files-without-scenarios` | Feature 文件必须包含至少一个 Scenario |
| `no-empty-file` | 禁止空文件 |
| `no-trailing-spaces` | 行尾无空格 |
| `no-unused-variables` | 禁止未使用的 `<placeholder>` 变量 |
| `new-line-at-eof` | 文件末尾必须有换行符 |

---

## Robot Framework 代码检查说明

所有 `*.robot`、`*.resource` 文件经过两层检查，排除 `vendor/`、`node_modules/` 目录。

### Robocop（静态分析）

配置文件：[.robocop.toml](../../../.lintrc/testing/.robocop.toml)，主要参数：

| 参数 | 值 | 说明 |
| --- | --- | --- |
| `line-too-long:line_limit` | `120` | 行宽上限 |
| `too-many-arguments:max_args` | `10` | 关键字最大参数数 |
| `too-long-keyword:max_len` | `40` | 关键字名称最大长度 |
| `too-long-test-case:max_len` | `20` | 测试用例名称最大长度 |

### robotidy（格式检查）

使用 `robotidy --check --diff` 检查格式一致性，不自动修改文件。

---

## EditorConfig 代码检查说明

检测 `.editorconfig` 文件是否存在，若存在则使用 `editorconfig-checker`（`ec`）对仓库中所有文件进行检查，确保文件遵守 `.editorconfig` 中声明的规则：

| 规则类型 | 说明 |
| --- | --- |
| `indent_style` | 缩进风格（space / tab）一致 |
| `indent_size` | 缩进宽度一致 |
| `end_of_line` | 行尾符（lf / crlf / cr）一致 |
| `charset` | 文件编码一致 |
| `trim_trailing_whitespace` | 行尾无空白字符 |
| `insert_final_newline` | 文件末尾有换行符 |

---

## CUE 代码检查说明

所有 `*.cue` 文件经过两层检查，排除 `vendor/`、`node_modules/` 目录。

| 工具 | 说明 |
| --- | --- |
| `cue vet` | 静态类型检查，验证 CUE 值约束的一致性 |
| `cue fmt` + git diff | 检查格式化结果无变化，否则提示本地运行 `cue fmt` |

---

## Dhall 代码检查说明

所有 `*.dhall` 文件经过两层检查，排除 `vendor/`、`node_modules/` 目录。

| 工具 | 说明 |
| --- | --- |
| `dhall lint --check` | 检查冗余导入、未使用变量、表达式规范化等 |
| `dhall format` + git diff | 检查格式化结果无变化，否则提示本地运行 `dhall format` |

---

## KCL 代码检查说明

所有 `*.k`、`*.kcl` 文件经过两层检查，排除 `vendor/`、`node_modules/` 目录。

| 工具 | 说明 |
| --- | --- |
| `kcl fmt` + git diff | 检查格式化结果无变化 |
| `kcl lint` | 静态分析，检查类型错误、未使用变量、命名规范等 |

---

## AsyncAPI 代码检查说明

检测 `asyncapi.yml`、`asyncapi.yaml`、`asyncapi.json`、`*.asyncapi.yml` 等文件，使用 `@asyncapi/cli` 的 `asyncapi lint` 命令进行校验。

| 检查项 | 说明 |
| --- | --- |
| AsyncAPI 版本兼容性 | `asyncapi` 字段版本规范 |
| Channel / Operation 完整性 | 频道绑定与操作定义匹配 |
| Schema 引用 | `$ref` 引用的 schema 存在且有效 |
| 安全方案 | `securitySchemes` 声明与引用对应 |

---

## Renovate 配置检查说明

检测 `renovate.json`、`renovate.json5`、`.renovaterc`、`.renovaterc.json` 等文件，使用 Renovate 自带的 `renovate-config-validator` 工具进行配置有效性验证。

| 检查项 | 说明 |
| --- | --- |
| JSON 语法 | 配置文件语法正确 |
| 字段有效性 | 所有顶层字段均为 Renovate 已知配置键 |
| `extends` 引用 | 预设配置引用（如 `config:base`）格式正确 |
| `packageRules` 结构 | 规则数组中每项结构合法 |

---

## PlantUML 代码检查说明

所有 `*.puml`、`*.plantuml`、`*.pu` 文件使用 PlantUML 官方 JAR 进行语法检查（`-syntax` 标志），不生成图片输出。依赖 Graphviz（`dot`）进行图形布局计算。

| 支持图类型 | 示例 |
| --- | --- |
| 时序图 | `@startuml … @enduml` |
| 类图 | `class Foo { }` |
| 用例图 | `actor User` |
| 活动图 | `start; :step; stop` |
| 组件图 | `component [Module]` |
| 状态图 | `[*] --> State1` |
| ER 图 | `entity Foo { }` |
| Gantt 图 | `@startgantt … @endgantt` |

---

## Solidity 代码检查说明

所有 `*.sol` 文件经过两层检查，排除 `vendor/`、`node_modules/` 目录。

### solhint（规范检查）

配置文件：[.solhint.json](../../../.lintrc/backend/solidity/.solhint.json)，继承 `solhint:recommended` 并追加安全规则：

| 规则 | 级别 | 说明 |
| --- | --- | --- |
| `avoid-tx-origin` | error | 禁止使用 `tx.origin` 进行授权 |
| `avoid-call-value` | error | 禁止直接使用 `.call.value()` |
| `avoid-suicide` | error | 禁止使用已废弃的 `suicide()` |
| `avoid-throw` | error | 禁止使用已废弃的 `throw` |
| `check-send-result` | error | 必须检查 `.send()` 返回值 |
| `reentrancy` | error | 检测重入攻击模式 |
| `func-visibility` | error | 所有函数必须显式声明可见性 |
| `avoid-low-level-calls` | warn | 警告低层级调用（`.call()`、`.delegatecall()`） |
| `not-rely-on-time` | warn | 警告依赖 `block.timestamp` |
| `not-rely-on-block-hash` | warn | 警告依赖 `blockhash` |
| `max-line-length` | 120 | 最大行宽 120 字符 |
| `quotes` | error | 字符串必须使用双引号 |

### slither（深度安全分析）

使用 Slither（Python）对整个项目进行深度安全审计，排除 `naming-convention`、`solc-version` 规则（适用于演示项目），检测以下漏洞类型：

| 检测器 | 说明 |
| --- | --- |
| `reentrancy-eth` | 可被利用的以太币重入 |
| `suicidal` | 任意地址可销毁合约 |
| `uninitialized-local` | 未初始化的本地变量 |
| `locked-ether` | 合约锁死以太币（只入不出） |
| `arbitrary-send-eth` | 任意地址可转出以太币 |
| `controlled-delegatecall` | 受控 `delegatecall` |

---

## JSON 代码检查说明

所有 `*.json` 文件经过两层检查（语法校验 + 格式检查），排除 `node_modules/` 和 `vendor/` 目录。

### jsonlint（语法校验）

使用 `@prantlf/jsonlint`（Node.js）对每个 JSON 文件进行严格语法校验，包括：

| 检查项 | 说明 |
| --- | --- |
| 语法合规性 | 符合 JSON RFC 8259 规范 |
| 控制字符 | 字符串中不得含有未转义的控制字符 |
| 重复 key | 同一对象中禁止重复键名 |
| 尾随逗号 | 禁止 JavaScript 风格的尾随逗号 |
| 注释 | 标准 JSON 不允许注释（JSONC 除外） |

### prettier（格式检查）

格式检查由 prettier 统一处理（与 JS/TS 共享 [.prettierrc](../../../.lintrc/frontend/prettier/.prettierrc) 配置），确保缩进、换行符、引号等格式一致。

---

## XML 代码检查说明

所有 `*.xml / *.xsd / *.xsl / *.xslt / *.pom / *.wsdl` 文件经 `xmllint` 检查，无 XML 文件时自动跳过。

### xmllint（格式合规性检查）

`xmllint` 来自 `libxml2-utils`，是 XML 生态标准工具：

| 检查项 | 说明 |
| --- | --- |
| Well-formed 检查 | 所有 XML 文件必须符合 XML 1.0 规范 |
| 标签闭合 | 开始/结束标签必须正确嵌套 |
| 字符编码 | 必须是有效的 UTF-8 编码 |
| 命名空间 | xmlns 声明必须合法 |
| XSD 交叉验证 | 如存在 `.xsd` 文件，尝试进行 Schema 验证（需要配置文件对应关系） |

---

## TOML 代码检查说明

所有 `*.toml` 文件经 `taplo` 检查，配置文件 [taplo.toml](../../../.lintrc/data-formats/toml/taplo.toml) 位于仓库根目录。

### taplo（格式化 + Schema 验证）

taplo 是目前最全面的 TOML 工具链，同时支持格式化和 JSON Schema 验证：

| 功能 | 说明 |
| --- | --- |
| 语法检查（`taplo check`） | 严格验证 TOML 规范合规性 |
| 格式化检查（`taplo fmt --check`） | 缩进 2 空格、对齐注释、列宽 120 |
| Schema 验证（`taplo lint`） | 已关联 Cargo.toml、pyproject.toml 的 JSON Schema |

**格式规范**：

| 项目 | 配置 |
| --- | --- |
| 列宽 | 120 字符 |
| 缩进 | 2 空格 |
| 数组尾随逗号 | 启用 |
| 注释对齐 | 启用 |
| key 重排序 | 关闭（保持语义顺序） |

---

## SQL 代码检查说明

所有 `*.sql` 文件经 SQLFluff 检查，配置文件 [.sqlfluff](../../../.lintrc/data-formats/sql/.sqlfluff) 位于仓库根目录。

### SQLFluff（lint + 格式化）

SQLFluff 是 SQL 生态最全面的 lint 工具，同时支持 20+ SQL 方言：

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| 关键字 | `capitalisation.keywords` | 关键字必须大写（SELECT、FROM、WHERE 等） |
| 数据类型 | `capitalisation.types` | 数据类型大写（VARCHAR、INT 等） |
| 函数 | `capitalisation.functions` | 内置函数大写（COUNT、MAX 等） |
| 字面量 | `capitalisation.literals` | NULL/TRUE/FALSE 大写 |
| 别名 | `aliasing.table` / `aliasing.column` | 必须使用显式 `AS` 关键字 |
| 空值比较 | `convention.is_null` | 必须使用 `IS NULL`，禁止 `= NULL` |
| 不等于符号 | `convention.not_equal` | 统一使用 C 风格 `!=` |
| 列引用 | `references.from` | 多表查询中列引用必须限定表名 |
| 格式 | `layout` | 行宽 120，4 空格缩进，逗号尾随 |
| 子查询 | `structure.subquery` | JOIN 中禁止直接使用子查询 |

默认方言为 `ansi`，可在 `.sqlfluff` 中按项目修改为 `mysql`、`postgres`、`tsql`、`bigquery` 等。

---

## Protocol Buffers 代码检查说明

所有 `*.proto` 文件经 `buf` 工具检查，配置文件 [buf.yaml](../../../.lintrc/data-formats/protobuf/buf.yaml) 位于仓库根目录。

### buf lint（规范检查）

buf 是 Protocol Buffers 生态标准工具，启用 `DEFAULT` 规则集：

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| 包规范 | `PACKAGE_DEFINED` | 每个 .proto 文件必须定义 package |
| 包规范 | `PACKAGE_DIRECTORY_MATCH` | package 名称与目录结构一致 |
| 命名 | `MESSAGE_PASCAL_CASE` | 消息名必须 PascalCase |
| 命名 | `FIELD_LOWER_SNAKE_CASE` | 字段名必须蛇形小写 |
| 命名 | `ENUM_VALUE_UPPER_SNAKE_CASE` | 枚举值全大写蛇形 |
| 命名 | `SERVICE_PASCAL_CASE` | Service 名 PascalCase |
| 命名 | `RPC_PASCAL_CASE` | RPC 方法名 PascalCase |
| 枚举 | `ENUM_FIRST_VALUE_ZERO` | 枚举第一个值必须为 0 |
| 枚举 | `enum_zero_value_suffix: _UNSPECIFIED` | 零值枚举必须以 `_UNSPECIFIED` 结尾 |
| 文档 | `COMMENT_MESSAGE` / `COMMENT_ENUM` / `COMMENT_SERVICE` | 主要类型必须有注释 |
| 导入 | `IMPORT_NO_PUBLIC` | 禁止 `import public` |

### buf format（格式化检查）

`buf format --diff --exit-code` 检查是否有未格式化的 .proto 文件。

### buf breaking（破坏性变更检测）

在 PR 中对比当前分支与 base branch 检测 API 破坏性变更，使用 `FILE` 级别规则集（字段类型变更、消息删除、枚举值删除等）。

---

## GraphQL 代码检查说明

所有 `*.graphql / *.gql` 文件经两层检查。
配置文件 [.graphqlrc.yml](../../../.lintrc/data-formats/graphql/.graphqlrc.yml) 位于仓库根目录，无 GraphQL 文件时自动跳过。

### graphql-schema-linter（Schema 规范检查）

| 规则 | 说明 |
| --- | --- |
| `enum-values-all-caps` | 枚举值必须全大写 |
| `fields-have-descriptions` | 所有字段必须有 description |
| `fields-are-camel-cased` | 字段名必须驼峰命名 |
| `types-have-descriptions` | 所有类型必须有 description |
| `arguments-have-descriptions` | 所有参数必须有 description |
| `arguments-are-camel-cased` | 参数名必须驼峰命名 |
| `relay-connection-types-spec` | 遵循 Relay Connection 规范 |
| `relay-connection-arguments-spec` | Connection 参数规范（first/last/before/after） |

### prettier（格式化检查）

GraphQL 文件通过 `prettier` + `@prettier/plugin-graphql` 进行格式统一检查（缩进、换行、空格）。

### graphql-inspector（破坏性变更检测）

配置在 `.graphqlrc.yml` 中，`failOnBreaking: true` — 任何破坏性 Schema 变更将导致 CI 失败。

---

## OpenAPI / Swagger 代码检查说明

所有 `openapi*.yaml/json`、`swagger*.yaml/json`、`*-api-spec.yaml` 等文件经 Spectral 检查。
配置文件 [.spectral.yaml](../../../.lintrc/data-formats/openapi/.spectral.yaml) 位于仓库根目录，无匹配文件时自动跳过。

### Spectral（OpenAPI lint）

Spectral 是 OpenAPI/Swagger 最强规范检查工具，内置 `spectral:oas` 规则集并支持自定义规则：

| 类别 | 规则 | 说明 |
| --- | --- | --- |
| 操作规范 | `operation-operationId` | 所有操作必须有 operationId |
| 操作规范 | `operation-tags` | 所有操作必须有 tags |
| 文档 | `info-contact` | 必须包含联系信息 |
| 文档 | `info-description` | 必须包含 API 描述 |
| 路径 | `path-params` | 路径参数必须在 parameters 中定义 |
| 路径 | `path-keys-no-trailing-slash` | 路径末尾不得有斜线 |
| 路径 | `path-not-include-query` | 路径中不得包含 query 参数 |
| 响应 | `operation-success-response` | 操作必须定义 2xx 响应 |
| 安全 | `operation-security-defined` | 操作应定义 security scheme |
| 自定义 | `request-body-must-have-description` | 请求体必须有 description（warn） |
| 自定义 | `no-additional-properties` | 响应 Schema 避免 additionalProperties:true（warn） |

---

## Dockerfile 代码检查说明

所有 `Dockerfile`、`Dockerfile.*`、`*.dockerfile` 文件经 hadolint 检查。
配置文件 [.hadolint.yaml](../../../.lintrc/infrastructure/docker/.hadolint.yaml) 位于仓库根目录，无 Dockerfile 时自动跳过。

### hadolint（Dockerfile 最佳实践）

hadolint 是 Dockerfile lint 标准工具，内置 ShellCheck 对 `RUN` 步骤中的 shell 脚本进行检查：

| 规则 | 级别 | 说明 |
| --- | --- | --- |
| DL3007 | error | FROM 禁止使用 `:latest` 标签，必须固定版本 |
| DL3020 | error | 使用 `COPY` 替代 `ADD`（除解压/URL 场景外） |
| DL3025 | error | CMD/ENTRYPOINT 必须使用 JSON 数组格式 |
| DL3002 | error | 禁止切换到 root 用户（`USER root`） |
| DL3001 | error | 禁止不验证证书的 curl/wget（`--insecure`） |
| DL4000 | error | `MAINTAINER` 已废弃，使用 `LABEL` 替代 |
| DL3008 | warn | apt-get 安装建议固定版本号 |
| DL3009 | warn | 安装后删除 apt-get 缓存 |
| DL4001 | error | 不在同一镜像中混用 wget 和 curl |

**可信注册中心**：`docker.io`、`ghcr.io`、`mcr.microsoft.com`、`gcr.io`、`quay.io`、`public.ecr.aws`。
CI 配置 `failure-threshold: error`，仅 error 级别规则导致构建失败。

---

## Terraform / HCL 代码检查说明

所有 `*.tf / *.tfvars` 文件经三层检查（terraform fmt + terraform validate + TFLint）。
配置文件 [.tflint.hcl](../../../.lintrc/infrastructure/terraform/.tflint.hcl) 位于仓库根目录，无 Terraform 文件时自动跳过。

### terraform fmt（格式化）

`terraform fmt -check -recursive -diff .` 检查所有 .tf 文件是否符合 Terraform 官方格式规范（2 空格缩进、对齐等号等）。

### terraform validate（语法验证）

遍历所有含 .tf 文件的目录，逐个运行 `terraform init -backend=false` + `terraform validate`，检查 HCL 语法和模块引用合法性。

### TFLint（扩展 lint）

TFLint 是 Terraform lint 工具，启用以下内置规则：

| 规则 | 说明 |
| --- | --- |
| `terraform_required_version` | 必须声明 `required_version` |
| `terraform_required_providers` | 必须声明 `required_providers` |
| `terraform_documented_variables` | 所有变量必须有 `description` |
| `terraform_documented_outputs` | 所有输出必须有 `description` |
| `terraform_naming_convention` | 资源/变量/输出/模块统一使用 `snake_case` |
| `terraform_unused_declarations` | 检测未使用的变量/数据源 |
| `terraform_comment_syntax` | 注释必须使用 `#` 而非 `//` |
| AWS 插件 | 检测废弃的 AWS 资源参数和无效的资源配置（按需启用） |

---

## Ansible 代码检查说明

包含 `playbooks/`、`roles/`、`tasks/` 目录或 `site.yml`、`playbook.yml` 的 YAML 文件经 ansible-lint 检查。
配置文件 [.ansible-lint.yml](../../../.lintrc/infrastructure/ansible/.ansible-lint.yml) 位于仓库根目录，无 Ansible 文件时自动跳过。

### ansible-lint（production profile）

ansible-lint 使用 `production` profile（最严格），覆盖：

| 规则类别 | 说明 |
| --- | --- |
| `fqcn[action]` | 所有 task 必须使用完全限定集合名（`ansible.builtin.copy` 而非 `copy`） |
| `name[casing]` | task name 首字母必须大写 |
| `name[missing]` | 所有 task 必须有 `name` 字段 |
| `key-order[task]` | task 关键字顺序（`name` 必须在最前） |
| `no-free-form` | 禁止自由格式 task，必须使用键值对格式 |
| `no-jinja-when` | `when` 条件禁止使用 `{{ }}` Jinja2 语法 |
| `command-instead-of-module` | 优先使用 Ansible 模块，避免裸 shell 命令 |
| `risky-file-permissions` | `file`/`template` 必须指定 `mode` |
| `risky-shell-pipe` | shell 管道必须添加 `set -o pipefail` |
| `partial-become` | 使用 `become` 时必须同时设置 `become_user` |
| `deprecated-*` | 检测所有废弃的模块、参数和语法 |
| `syntax-check` | 基础 Ansible 语法检查 |

---

## Kubernetes Manifests 代码检查说明

`k8s/`、`kubernetes/`、`manifests/`、`deploy/`、`charts/`、`helm/` 等目录中的 YAML 文件经两层检查。
配置文件 [.kube-linter.yaml](../../../.lintrc/infrastructure/kubernetes/.kube-linter.yaml) 位于仓库根目录，无 Kubernetes 文件时自动跳过。

### kubeconform（Schema 验证）

kubeconform 是 kubeval 的高性能替代，对 Kubernetes 资源进行 JSON Schema 验证：

| 参数 | 说明 |
| --- | --- |
| `-strict` | 禁止 Schema 中未定义的额外字段 |
| `-ignore-missing-schemas` | CRD 等未知资源跳过而不报错 |
| `-kubernetes-version 1.31.0` | 对照 Kubernetes 1.31 Schema 验证 |
| `-output github` | GitHub Actions 格式的错误输出 |

### kube-linter（最佳实践检查）

kube-linter 检查 Kubernetes manifest 的安全性和可靠性，启用全部内置规则：

| 类别 | 关键规则 | 说明 |
| --- | --- | --- |
| 安全 | `no-privileged-container` | 禁止 `privileged: true` |
| 安全 | `no-privilege-escalation` | 禁止 `allowPrivilegeEscalation: true` |
| 安全 | `run-as-non-root` | 容器必须以非 root 用户运行 |
| 安全 | `read-only-root-filesystem` | 根文件系统设为只读 |
| 安全 | `drop-net-raw-capability` | 丢弃 `NET_RAW` 能力 |
| 安全 | `no-host-ipc` / `no-host-pid` / `no-host-network` | 禁止共享主机命名空间 |
| 资源 | `cpu-requests` / `memory-requests` | 必须设置资源请求 |
| 资源 | `cpu-limits` / `memory-limits` | 必须设置资源限制 |
| 可靠性 | `no-readiness-probe` | 必须设置 readiness probe |
| 镜像 | `no-latest-image-tag`（自定义） | 禁止使用 `:latest` 镜像标签 |
| 高可用 | `minimum-replicas`（自定义） | Deployment 至少 2 个副本 |

---

## GitHub Actions 代码检查说明

`.github/workflows/` 下所有 `*.yml / *.yaml` 文件经 `actionlint` 检查，无工作流文件时自动跳过。

### actionlint（工作流语法 + 安全检查）

actionlint 是 GitHub Actions 专用静态分析工具，内置 ShellCheck 对 `run:` 步骤进行 shell 检查：

| 类别 | 检查项 | 说明 |
| --- | --- | --- |
| 语法 | 工作流结构 | on/jobs/steps 格式合规性 |
| 语法 | Action 输入验证 | 使用了 action 未定义的 input 参数 |
| 语法 | 表达式语法 | `${{ }}` 表达式类型检查 |
| 安全 | `${{ github.event.issue.body }}` 注入 | 外部数据注入到 `run:` 的风险 |
| 安全 | 权限最小化 | 检测可能过于宽松的 `permissions` |
| Shell | ShellCheck 集成 | `run:` 中的 shell 脚本静态分析 |
| Action 版本 | `actions/*@*` | 检测不存在的 action 或版本 |
| 条件表达式 | `if: ...` | 条件表达式语法和类型合规性 |
| 输出变量 | `steps.*.outputs.*` | 引用了未定义的 step 输出 |
| 环境变量 | `env:` | 同名环境变量覆盖警告 |

---

## Ruff 代码检查说明

所有 `*.py` 文件可通过 Ruff 进行快速 lint + 格式检查。Ruff 是 Rust 编写的现代 Python 统一工具，替代 flake8 + isort + pyupgrade + bandit 等十余个工具，速度比传统工具快 10-100 倍。
配置文件：[ruff.toml](../../../.lintrc/backend/python/ruff.toml)。无 Python 文件时自动跳过。

### Ruff Check（lint 检查）

| 类别 | 规则集 | 说明 |
| --- | --- | --- |
| 风格 | `E` / `W`（pycodestyle） | PEP 8 风格检查 |
| 错误 | `F`（pyflakes） | 未使用变量、未定义名称等 |
| 导入 | `I`（isort） | 导入排序与分组 |
| 命名 | `N`（pep8-naming） | 命名规范 |
| 现代化 | `UP`（pyupgrade） | 自动升级到新语法 |
| Bug 模式 | `B`（flake8-bugbear） | 常见 bug 模式 |
| 简化 | `SIM` / `C4` | 代码简化 / 推导式优化 |
| 类型注解 | `ANN`（annotations） | 类型注解完整性 |
| 安全 | `S`（bandit） | OWASP 安全检查 |
| 性能 | `PERF`（perflint） | 性能反模式 |
| 文档 | `D`（pydocstyle） | Google 风格 docstring |
| 杂项 | `RUF` / `PL` / `TRY` / `ERA` | Ruff 专属 / pylint / 异常 / 僵尸代码 |

**主要阈值**：

| 指标 | 限制 |
| --- | --- |
| 圈复杂度（mccabe） | 10 |
| 函数最大参数数 | 5 |
| 函数最大分支数 | 10 |
| 函数最大语句数 | 40 |
| 函数最大 return 数 | 3 |
| 行宽 | 100 字符 |

### Ruff Format（格式检查）

自动检查代码格式（等价于 Black），双引号、space 缩进、LF 换行。CI 仅 `--check`，不自动修改。

---

## Biome 代码检查说明

所有 `*.js / *.ts / *.jsx / *.tsx` 文件可通过 Biome 进行统一 lint + 格式检查。Biome 是 Rust 编写的 JS/TS 工具链，单工具替代 ESLint + Prettier。
配置文件：[biome.json](../../../.lintrc/frontend/biome.json)。无 JS/TS 文件时自动跳过。

| 类别 | 说明 |
| --- | --- |
| 格式化 | 2 空格缩进、100 字符行宽、LF 换行、多行属性 |
| 导入排序 | 自动排序 import 语句 |
| 可访问性（a11y） | HTML/JSX 可访问性检查（推荐规则） |
| 复杂度 | 认知复杂度上限 10 |
| 正确性 | 禁止未使用变量、危险操作、过时 API |
| 安全 | 禁止 `dangerouslySetInnerHTML`、不安全声明合并 |
| 风格 | 强制 `const`、简化布尔表达式、推荐模板字面量 |

---

## Vale 文档质量检查说明

所有 `*.md / *.rst / *.adoc / *.txt` 文件可通过 Vale 进行技术文档写作质量检查。
配置文件：[vale.ini](../../../.lintrc/docs/vale.ini)。无文档文件时自动跳过。

Vale 加载以下风格包：

| 风格包 | 说明 |
| --- | --- |
| Microsoft | 微软写作风格指南（禁止词、被动语态、性别中立等） |
| Google | Google 开发者文档风格（感叹号、缩写、拼写等） |
| write-good | 清晰写作建议（弱化词、模糊表述） |
| proselint | 散文质量检查（冗余、陈词滥调） |

**主要规则级别**：

| 级别 | 示例规则 |
| --- | --- |
| error | 禁止词汇、性别偏见、多余空格、禁止感叹号 |
| warning | 被动语态、第一人称、首字母缩写、Oxford 逗号 |
| suggestion | 缩写使用、可读性改进 |

---

## Commitlint 提交信息检查说明

PR 中所有 commit message 经 Commitlint 检查，确保遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。仅在 `pull_request` 事件时运行。
配置文件：[.commitlintrc.json](../../../.lintrc/git/.commitlintrc.json)。

### 允许的 type 列表

`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert` `security` `deps`

### 主要规则

| 规则 | 限制 | 说明 |
| --- | --- | --- |
| `type-enum` | 13 种类型 | 只允许上述 type |
| `type-case` | lower-case | type 必须小写 |
| `scope-empty` | never | scope 不能为空 |
| `subject-min-length` | 10 字符 | 主题最短 10 字符 |
| `subject-max-length` | 72 字符 | 主题最长 72 字符 |
| `header-max-length` | 100 字符 | 标题行最长 100 字符 |
| `body-max-line-length` | 100 字符 | 正文每行最长 100 字符 |
| `body-leading-blank` | always | body 前必须空一行 |
| `references-empty` | never | 必须关联 Issue |

---

## Checkov IaC 安全扫描说明

所有基础设施即代码（IaC）文件经 Checkov 安全扫描，检测 Terraform、CloudFormation、Kubernetes、Dockerfile、GitHub Actions、Helm、Bicep、ARM 模板中的安全配置问题。
配置文件：[checkov.yaml](../../../.lintrc/infrastructure/checkov.yaml)。

| 框架 | 说明 |
| --- | --- |
| `terraform` | Terraform HCL 安全检查 |
| `cloudformation` | AWS CloudFormation 模板检查 |
| `kubernetes` | K8s manifest 安全检查 |
| `dockerfile` | Dockerfile 最佳实践 |
| `github_actions` | Actions 工作流安全 |
| `helm` | Helm Chart 检查 |
| `bicep` / `arm` | Azure 模板检查 |
| `secrets` | 硬编码密钥检测 |
| `ansible` | Ansible Playbook 安全检查 |
| `openapi` | OpenAPI spec 安全检查 |
| `sca_package` | 依赖漏洞（SCA） |

**配置要点**：

- 严重级别：LOW / MEDIUM / HIGH / CRITICAL 全部报告
- `soft-fail: false`：有 failed checks 时 CI 失败
- 启用全文件 Secrets 扫描
- 下载外部 Terraform 模块进行深度扫描

---

## Knip 死代码检测说明

前端 JS/TS 项目经 Knip 检测未使用的文件、依赖、导出和类型。需要 `package.json` 存在。
配置文件：[knip.json](../../../.lintrc/frontend/knip.json)。无 `package.json` 时自动跳过。

### 检测范围

| 类别 | 级别 | 说明 |
| --- | --- | --- |
| 未使用文件 | error | 不被任何入口引用的源文件 |
| 未使用依赖 | error | `dependencies` / `devDependencies` 中未使用的包 |
| 未使用导出 | error | 被导出但从未被其他文件导入的符号 |
| 未列出依赖 | error | 代码中 import 了但未在 `package.json` 声明的包 |
| 未使用类型 | error | 导出但未使用的 TypeScript 类型 |
| 重复导出 | error | 同一符号被多次导出 |

**入口点**：`src/index.*`、`src/main.*`、`src/app.*`、`src/server.*`、`src/pages/**`、`bin/**`、`scripts/**`

---

## CSpell 拼写检查说明

所有文件经 CSpell 拼写检查，检测英文拼写错误。自动遵守 `.gitignore` 排除规则。
配置文件：[cspell.json](../../../.lintrc/general/cspell.json)。

| 配置项 | 说明 |
| --- | --- |
| 语言 | `en`（英文） |
| 自定义词汇 | 工具名（biome, eslint, ruff 等）、技术术语 |
<!-- cspell:disable-next-line -->
| 禁止词汇 | 常见拼写错误（hte, teh, recieve, occured 等） |
| 内置词典 | en_US, softwareTerms, typescript, node, npm, aws, docker, k8s, java, python 等 20+ 专业词典 |
| 排除目录 | node_modules, dist, build, coverage, .git, vendor, *.min.js 等 |

---

## YAML Lint Strict 检查说明

所有非 `.github/` 目录下的 `*.yml / *.yaml` 文件经 yamllint 严格模式检查。
配置文件：[.yamllint.yml](../../../.lintrc/data-formats/.yamllint.yml)。无 YAML 文件时自动跳过。

> 注：`.github/workflows/` 下的 YAML 已由独立的 `yaml-lint` job（宽松模式）和 `github-actions-lint` job（actionlint）覆盖。此 job 对项目配置类 YAML 执行更严格的检查。

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| `line-length` | max: 120 (error) | 行宽限制 |
| `document-start` | present: true (error) | 必须有 `---` 文档起始标记 |
| `indentation` | spaces: 2 (error) | 2 空格缩进 |
| `trailing-spaces` | error | 禁止行尾空格 |
| `empty-values` | forbid (error) | 禁止空值 |
| `truthy` | allowed: true/false/yes/no (error) | 布尔值限制 |
| `comments` | require-starting-space, min-spaces-before: 2 (warning) | 注释格式 |
| `key-duplicates` | error | 禁止重复键 |

---

## ls-lint 文件命名检查说明

全项目文件名经 ls-lint 检查，确保遵循各语言约定的命名规范。
配置文件：[.ls-lint.yml](../../../.lintrc/general/.ls-lint.yml)。

### 命名规范映射

| 文件类型 | 允许的命名规范 |
| --- | --- |
| `.js` / `.ts` | kebab-case / camelCase / PascalCase |
| `.jsx` / `.tsx` | kebab-case / PascalCase |
| `.css` / `.scss` / `.less` | kebab-case |
| `.py` | snake_case |
| `.rb` | snake_case |
| `.java` / `.kt` | PascalCase |
| `.go` | snake_case |
| `.php` | PascalCase / snake_case |
| `.md` | SCREAMING_SNAKE_CASE / kebab-case |
| `.sh` / `.bash` | kebab-case |
| `.tf` / `.tfvars` | snake_case |

### 目录级特殊规则

| 目录 | 规则 |
| --- | --- |
| `src/components` | `.tsx/.jsx` → PascalCase |
| `src/hooks` | `.ts` → camelCase |
| `src/pages` | `.tsx/.ts` → kebab-case / PascalCase（支持动态路由 `[slug]`） |
| `src/utils` / `src/lib` | `.ts` → camelCase / kebab-case |
| `tests/` / `__tests__/` | 与源代码同级规则 |

---
