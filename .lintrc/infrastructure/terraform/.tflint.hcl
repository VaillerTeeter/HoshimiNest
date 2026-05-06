# TFLint — Terraform / HCL lint 配置
# 文档：https://github.com/terraform-linters/tflint
# 用法：tflint --config .lintrc/infrastructure/terraform/.tflint.hcl

# ============================================================
# 插件（Provider 规则集）
# ============================================================
plugin "aws" {
  enabled = true
  version = "0.37.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# plugin "azurerm" {
#   enabled = true
#   version = "0.28.0"
#   source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
# }

# plugin "google" {
#   enabled = true
#   version = "0.30.0"
#   source  = "github.com/terraform-linters/tflint-ruleset-google"
# }

# ============================================================
# 通用配置
# ============================================================
config {
  # 是否递归扫描模块（true = 也检查被调用模块内部）
  module = true

  # 强制所有变量必须有 type
  force = false
}

# ============================================================
# 内置规则
# ============================================================

# 禁止 terraform_deprecated_interpolation（${"..."} 风格）
rule "terraform_deprecated_interpolation" {
  enabled = true
}

# 变量声明必须有 description
rule "terraform_documented_variables" {
  enabled = true
}

# 输出声明必须有 description
rule "terraform_documented_outputs" {
  enabled = true
}

# 命名规范：资源/变量/输出 使用 snake_case
rule "terraform_naming_convention" {
  enabled = true

  # 变量名
  variable {
    format = "snake_case"
  }

  # 输出名
  output {
    format = "snake_case"
  }

  # 本地值
  locals {
    format = "snake_case"
  }

  # 资源名
  resource {
    format = "snake_case"
  }

  # 数据源名
  data {
    format = "snake_case"
  }

  # 模块名
  module {
    format = "snake_case"
  }
}

# 所有使用的 provider 必须在 required_providers 块中声明
rule "terraform_required_providers" {
  enabled = true
}

# provider 必须声明 required_version
rule "terraform_required_version" {
  enabled = true
}

# 禁止未使用的变量、local、data source 和模块声明
rule "terraform_unused_declarations" {
  enabled = true
}

# 禁止未使用的模块
rule "terraform_unused_required_providers" {
  enabled = true
}

# 注释风格：# 而非 //
rule "terraform_comment_syntax" {
  enabled = true
}
