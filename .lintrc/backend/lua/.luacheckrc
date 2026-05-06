-- Lua 代码检查配置 — luacheck
-- 用法：luacheck --config .lintrc/backend/lua/.luacheckrc <files>

-- ============================================================
-- 全局配置
-- ============================================================

-- 目标 Lua 版本
std = "lua54"  -- 可选：lua51, lua52, lua53, lua54, luajit, ngx

-- 允许的 Lua 版本全局变量
globals = {}

-- 只读全局变量（允许访问但不允许修改）
read_globals = {
  -- 常见框架全局变量（按需开启）
  -- "vim",          -- Neovim
  -- "hs",           -- Hammerspoon
  -- "love",         -- LÖVE 2D
  -- "redis",        -- Redis 脚本
  -- "ngx",          -- OpenResty
  -- "pandoc",       -- Pandoc Lua filters
}

-- ============================================================
-- 代码质量限制
-- ============================================================

-- 最大行宽
max_line_length = 120

-- 最大循环嵌套深度（luacheck 不直接支持，但文档注释）
-- 建议：嵌套超过 4 层时重构

-- ============================================================
-- 错误/警告控制
-- ============================================================

-- 将所有问题作为错误处理
-- error_on_warning = false  -- 默认 false，CI 中设为 true

-- 忽略特定警告编号
ignore = {
  -- "211",  -- 未使用的局部变量（有时是占位符）
  -- "212",  -- 未使用的参数
  -- "213",  -- 未使用的循环变量（_xxx 约定）
}

-- 报告为 error 的警告（比 ignore 优先）
-- error_codes = { "011", "021", "022" }

-- ============================================================
-- 未使用变量规则
-- ============================================================

-- 允许以 _ 或 __ 开头的变量未使用（约定占位符）
unused_args = true
self = true        -- 允许方法中未使用的 self

-- ============================================================
-- 文件排除
-- ============================================================

exclude_files = {
  ".luarocks/**",
  "lua_modules/**",
  "vendor/**",
  "**/third_party/**",
  "**/generated/**",
}

-- ============================================================
-- 文件级覆盖（per-file overrides）
-- ============================================================

files["**/*_spec.lua"] = {
  std = "+busted",      -- 测试框架全局（describe/it/before_each 等）
  globals = {
    "describe",
    "context",
    "it",
    "pending",
    "before_each",
    "after_each",
    "before_all",
    "after_all",
    "setup",
    "teardown",
    "spy",
    "stub",
    "mock",
    "assert",
  },
}

files["**/*_test.lua"] = {
  std = "+busted",
}

-- Neovim 插件
-- files["plugin/**/*.lua"] = {
--   read_globals = { "vim" },
-- }

-- ============================================================
-- StyLua 格式化配置参考（实际配置在 stylua.toml）
-- ============================================================
-- column_width = 120
-- indent_type = "Spaces"
-- indent_width = 2
-- quote_style = "AutoPreferDouble"
-- call_parentheses = "Always"
