# WeChat Editorial Skills

一套面向微信公众号案例内容生产的可复用 Agent Skills。它将案例研究、事实核验、文章写作、反向审稿、读者模拟、终稿编辑、电子杂志式长图设计、Photoshop 交付和视觉质检拆成八个可以独立使用、也可以串联执行的能力模块。

> 本仓库公开的是通用工作流、规则、脚本和模板，不包含客户素材、PSD/PSB、公众号项目成品或未公开商业资料。

## 工作流

```text
研究与核验
  ↓
内容入口与写作
  ↓
挑刺审稿 + 读者模拟
  ↓
终稿编辑
  ↓
电子杂志式长图设计
  ↓
Photoshop 可编辑源文件交付
  ↓
视觉与发布质检
```

## 八个 Skills

| Skill | 用途 |
| --- | --- |
| `wechat-official-account-content` | 公众号内容创作与竞品分析入口，负责需求路由、标题、结构和写作流程。 |
| `wechat-case-research` | 公开来源检索、事实分级、案例筛选、图片清单与授权风险记录。 |
| `wechat-adversarial-review` | 发布前挑刺，检查事实风险、逻辑漏洞、夸大表达和品牌错位。 |
| `wechat-reader-simulation` | 模拟普通读者、潜在客户和专业同行的真实阅读体验。 |
| `wechat-final-editor` | 合并研究、审稿、读者反馈和人工意见，形成可发布终稿。 |
| `wechat-editorial-longform` | 将已定稿内容重构为连续向下阅读的电子杂志式公众号长图。 |
| `wechat-photoshop-delivery` | 生成分层 PSD/PSB、可编辑文字、智能对象、独立蒙版和无缝切片。 |
| `wechat-visual-qa` | 检查手机端字号、文字重叠、图片裁切、图层结构和无缝拼接。 |

## 目录结构

```text
skills/
├── wechat-official-account-content/
├── wechat-case-research/
├── wechat-adversarial-review/
├── wechat-reader-simulation/
├── wechat-final-editor/
├── wechat-editorial-longform/
├── wechat-photoshop-delivery/
└── wechat-visual-qa/
```

每个 Skill 至少包含一个 `SKILL.md`，并可按需包含：

- `agents/openai.yaml`：Codex 界面元数据；
- `scripts/`：可重复执行的验证或生产脚本；
- `references/`：按需读取的规则与方法文档；
- `assets/`：输出时使用的通用模板。

## 安装

### 使用 Codex Skill Installer

把具体 Skill 的 GitHub 目录地址交给 `$skill-installer`：

```text
$skill-installer install https://github.com/huaiwanl04-dot/wechat-editorial-skills/tree/main/skills/wechat-case-research
```

安装其他 Skill 时替换末尾目录名。安装完成后重启 Codex，使其重新发现 Skills。

### 手动安装

克隆仓库：

```bash
git clone https://github.com/huaiwanl04-dot/wechat-editorial-skills.git
```

把需要的 `skills/wechat-*` 目录复制到个人 Codex Skills 目录：

```text
Windows: %USERPROFILE%\.codex\skills\
macOS/Linux: ~/.codex/skills/
```

## 验证

在仓库根目录运行：

```powershell
node .\skills\wechat-official-account-content\scripts\validate-wechat-skills.js --skills-root .\skills
```

单独运行脚本测试：

```powershell
Get-ChildItem .\skills -Recurse -Filter '*.test.js' | ForEach-Object { node $_.FullName }
Get-ChildItem .\skills -Recurse -Filter '*.test.ps1' | ForEach-Object { & $_.FullName }
```

## 贡献

欢迎通过 Issue 提交问题或建议，也欢迎通过 Pull Request 改进触发描述、工作流、规则、脚本和测试。提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

以下内容不会被接受：

- 未获授权的客户图片、品牌资产或文章成品；
- PSD/PSB、导出切片和其他生产项目文件；
- API Key、访问令牌、私人邮箱或本机凭据；
- 无来源的大段复制内容；
- 未提供验证结果的破坏性工作流修改。

## 许可证

本仓库以 [Apache License 2.0](LICENSE) 发布。提交贡献即表示你同意将贡献内容按同一许可证授权。

## English summary

Reusable Agent Skills for WeChat Official Account research, fact-checking, editorial writing, adversarial review, reader simulation, longform editorial design, Photoshop delivery, and visual QA. Client assets and production project files are intentionally excluded.

