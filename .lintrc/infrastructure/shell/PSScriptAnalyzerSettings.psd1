@{
    # PSScriptAnalyzer 配置
    # 参考：https://github.com/PowerShell/PSScriptAnalyzer

    IncludeDefaultRules = $true

    Rules = @{

        # ── 格式化规则 ──────────────────────────────────────────────

        PSAvoidLongLines = @{
            Enable            = $true
            MaximumLineLength = 120
        }

        PSPlaceOpenBrace = @{
            Enable             = $true
            OnSameLine         = $true
            NewLineAfter       = $true
            IgnoreOneLineBlock = $true
        }

        PSPlaceCloseBrace = @{
            Enable             = $true
            NewLineAfter       = $true
            IgnoreOneLineBlock = $true
            NoEmptyLineBefore  = $false
        }

        PSUseConsistentIndentation = @{
            Enable                          = $true
            Kind                            = 'space'
            PipelineIndentation             = 'IncreaseIndentationAfterEveryPipeline'
            IndentationSize                 = 4
        }

        PSUseConsistentWhitespace = @{
            Enable                                  = $true
            CheckInnerBrace                         = $true
            CheckOpenBrace                          = $true
            CheckOpenParen                          = $true
            CheckOperator                           = $true
            CheckPipe                               = $true
            CheckPipeForRedundantWhitespace         = $true
            CheckSeparator                          = $true
            CheckParameter                          = $false
            IgnoreAssignmentOperatorInsideHashTable = $true
        }

        PSUseCorrectCasing = @{
            Enable = $true
        }

        # ── 兼容性规则 ──────────────────────────────────────────────

        PSUseCompatibleSyntax = @{
            Enable         = $true
            TargetVersions = @('7.4', '7.2', '5.1')
        }

        PSUseCompatibleCmdlets = @{
            Compatibility = @('core-6.1.0-windows', 'desktop-5.1.14393.206-windows')
        }

        PSUseCompatibleCommands = @{
            Enable          = $true
            TargetProfiles  = @(
                'win-8_x64_10.0.14393.0_5.1.14393.2791_x64_4.0.30319.42000_framework',
                'win-8_x64_10.0.17763.0_5.1.17763.316_x64_4.0.30319.42000_framework',
                'ubuntu_x64_22.04_7.4.0_x64_dotnet_7.0.0'
            )
        }

        PSUseCompatibleTypes = @{
            Enable          = $true
            TargetProfiles  = @(
                'win-8_x64_10.0.14393.0_5.1.14393.2791_x64_4.0.30319.42000_framework',
                'ubuntu_x64_22.04_7.4.0_x64_dotnet_7.0.0'
            )
        }
    }

    ExcludeRules = @(
        # 允许使用 Write-Host（用于控制台脚本）— 如需禁止可删除此行
        # 'PSAvoidUsingWriteHost'

        # 允许位置参数（如确有需要可取消注释）
        # 'PSAvoidUsingPositionalParameters'
    )
}
