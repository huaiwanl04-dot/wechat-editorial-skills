# 公众号 Skill 开源方案调研与取舍

日期：2026-08-10

## 调研目标

在不重复造轮子的前提下，优化现有公众号 Skills，使案例研究、内容审校、编辑长图、Photoshop 源文件和视觉 QA 形成可解释、可验证、可复用的门禁流程。

## 方案比较

| 方向 | 项目 | License / 状态 | 可借鉴 | 不直接采用的原因 | 决策 |
|---|---|---|---|---|---|
| Skill 规范 | Agent Skills 规范 | Apache-2.0；开放规范 | `SKILL.md`、references/scripts/assets、渐进披露、结构验证 | 只提供规范，不提供公众号业务流程 | 采用结构和验证规则 |
| Skill 示例 | OpenAI Plugins / writing-skills | 官方当前仓库 | 小 Skill、前向测试、流程文档需要测试 | 不复制与公众号无关的具体内容 | 采用测试思路 |
| 旧 Skill 集合 | openai/skills | 已标记 deprecated | 可回看历史样例 | 已迁移，不应作为新架构依赖 | 不采用为依赖 |
| 微信排版 | doocs/md | WTFPL；活跃 | Markdown 到公众号原生富文本、主题和图片托管 | 不适合自定义图片型编辑长图；图床令牌带来安全风险 | 仅作为原生文字发布的可选工具 |
| 微信排版 | markdown-nice | 本轮未从第一方页面确认完整维护/许可信息 | 可能适合 Markdown 美化 | 证据不足，且与长图视觉系统职责不同 | 暂不采用 |
| Photoshop 当前方案 | Adobe CEP / ExtendScript 资源 | 官方历史技术栈 | 与现有 JSX 自动化兼容 | 长期维护能力弱于 UXP | 保留已验证脚本，不扩大旧技术债 |
| Photoshop 长期方案 | Adobe UXP Photoshop samples | MIT；官方维护 | 图层操作、插件 UI、现代 Photoshop 扩展 | 迁移与适配成本高，不应在当前交付中途替换 | 作为后续迁移方向 |
| 浏览器校样 | Playwright | Apache-2.0；活跃 | 固定视口、全页截图、可复现视觉测试 | 不能检查 PSD 可编辑性 | QA 辅助采用 |
| 像素对比 | pixelmatch | ISC；轻量 | PNG 差异、抗锯齿容差 | 无法判断语义裁切和阅读层级 | 只做一致性辅助 |
| 图片处理 | Sharp | Apache-2.0；活跃 | 尺寸、拼接、联系表、图像元数据 | 自动 attention/entropy 裁切可能伤害主体 | 处理可用，裁切必须视觉复核 |
| 第三方 Skill 校验 | agent-ecosystem/skill-validator | 社区项目 | 链接、孤儿文件、密度检查 | 非官方依赖，供应链和适配需额外审计 | 暂不安装；先用官方 validator 与本地检查 |

## 架构取舍

### 保留

- `wechat-official-account-content`：内容入口与路由。
- `wechat-adversarial-review`：事实、逻辑和发布风险。
- `wechat-reader-simulation`：阅读体验与流失点。
- `wechat-final-editor`：合并反馈并锁定终稿。

### 新增最小必要能力

- `wechat-case-research`：来源、事实、图片与案例层级。
- `wechat-editorial-longform`：连续编辑长图与缩略校样。
- `wechat-photoshop-delivery`：字体、分层 PSD/PSB、智能对象和语义切片。
- `wechat-visual-qa`：手机阅读、裁切、源文件、拼接与版本一致性。

### 明确不做

- 不把四个新职责继续塞回一个总 Skill。
- 不因有现成 Markdown 编辑器，就把自定义编辑长图退化成原生富文本模板。
- 不在当前项目中途把已验证 JSX 全面改写为 UXP。
- 不安装来源不明的社区 Skill 或浏览器插件处理账号、图床和密钥。
- 暂不新增“跨平台适配”独立 Skill；现有参考文件够用，待出现重复稳定需求后再抽取。

## 来源

- https://github.com/agentskills/agentskills
- https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx
- https://github.com/openai/plugins/blob/main/plugins/superpowers/skills/writing-skills/SKILL.md
- https://github.com/openai/skills
- https://github.com/NVIDIA/skills
- https://github.com/agent-ecosystem/skill-validator
- https://github.com/doocs/md
- https://github.com/AdobeDocs/uxp-photoshop-plugin-samples
- https://github.com/Adobe-CEP/CEP-Resources
- https://github.com/microsoft/playwright
- https://github.com/mapbox/pixelmatch
- https://github.com/lovell/sharp

