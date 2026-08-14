# Contributing

感谢你改进 WeChat Editorial Skills。我们欢迎问题报告、规则补充、脚本修复、测试改进和新工作流建议。

## 开始之前

1. 先搜索现有 Issues 和 Pull Requests，避免重复工作。
2. 较大的功能调整请先创建 Issue，说明使用场景、影响范围和验证方式。
3. 核查外部资料的许可证、维护状态、安全风险和适配成本。
4. 不提交客户素材、未授权作品、商业项目文件、访问令牌或个人隐私信息。

## 开发约定

- 每个 Skill 保持自包含，核心入口必须是 `SKILL.md`。
- 触发条件应写在 YAML frontmatter 的 `description` 中。
- 长规则放入 `references/`，确定性操作放入 `scripts/`，输出模板放入 `assets/`。
- 修改 `SKILL.md` 后检查 `agents/openai.yaml` 是否仍与其一致。
- 新增脚本必须同时提供可重复运行的测试或自检路径。
- 优先小而专注的 Pull Request，不把无关改动混在一起。

## 验证要求

在仓库根目录至少运行：

```powershell
node .\skills\wechat-official-account-content\scripts\validate-wechat-skills.js --skills-root .\skills
Get-ChildItem .\skills -Recurse -Filter '*.test.js' | ForEach-Object { node $_.FullName }
Get-ChildItem .\skills -Recurse -Filter '*.test.ps1' | ForEach-Object { & $_.FullName }
```

在 Pull Request 中粘贴命令摘要和通过结果。若某项无法运行，请明确说明原因和替代证据。

## 内容与来源

- 引用开源项目时记录项目链接、许可证、复用范围和修改内容。
- 引用公开案例时区分公开事实、视觉观察与专业推断。
- 不提交来源不明的图片、字体、模板或大段受版权保护内容。
- 不允许将客户或雇主的私有方法、数据或素材作为贡献上传。

## Pull Request 标准

Pull Request 应包含：

- 改动解决的问题；
- 涉及的 Skill；
- 行为变化与兼容性影响；
- 测试或验证结果；
- 外部来源与许可证说明；
- 若涉及视觉输出，提供不含客户资产的最小可复现样例。

提交贡献即表示你有权提交这些内容，并同意贡献按 Apache License 2.0 授权。

