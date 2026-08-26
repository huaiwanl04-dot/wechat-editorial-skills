# 公众号 Skill 前向路由测试

日期：2026-08-10

## 单任务测试

| 用户请求 | 预期 Skill | 结果 | 理由 |
|---|---|---|---|
| “给这篇文章优化 10 个公众号标题” | `wechat-official-account-content` | PASS | 标题是内容入口，不加载视觉与 PSD |
| “核实这 20 个艺术案例并整理配图和版权” | `wechat-case-research` | PASS | 来源、事实和图片台账边界明确 |
| “从主编角度挑出这篇文章不能发布的硬伤” | `wechat-adversarial-review` | PASS | 事实、逻辑与发布风险，不负责重写 |
| “模拟甲方和普通读者会在哪里退出” | `wechat-reader-simulation` | PASS | 阅读体验与流失点，不替代事实审查 |
| “合并两份审稿报告，输出发布终稿” | `wechat-final-editor` | PASS | 合并反馈并锁定文案，输出视觉交接表 |
| “把已确认文章做成 1080px 连续杂志长图校样” | `wechat-editorial-longform` | PASS | 视觉系统和缩略校样，不提前做 PSD |
| “把确认校样做成每层可移动的 PSD/PSB” | `wechat-photoshop-delivery` | PASS | 字体、智能对象、蒙版和语义切片 |
| “检查文字重叠、图片裁切和切片白缝” | `wechat-visual-qa` | PASS | 视觉和交付完整性，不重新设计 |

## 复杂任务测试

| 用户请求 | 预期路径 | 结果 |
|---|---|---|
| “找 18 个案例，写成公众号，再做长图和 PSD” | 研究 → 内容/三审 → 长图校样 → 代表性 PSD → 批量 → QA | PASS：门禁阻止一步到位批量生产 |
| “只改正文里一处不准确的标题” | 内容 Skill 直接修改 | PASS：简单改动不触发大规模调研 |
| “检查 PSD 是否可编辑，但不要改版” | `wechat-visual-qa` | PASS：检查与制作职责分离 |
| “参考近期案例写爆款标题” | 内容 Skill 联网核实；若涉及项目事实再加载案例研究 | PASS：最小加载，避免全链路膨胀 |

## 反向边界测试

- `wechat-case-research` 不输出最终长图。
- `wechat-adversarial-review` 不生成完整终稿。
- `wechat-reader-simulation` 不检查 Photoshop 图层。
- `wechat-final-editor` 不决定网格和卡片高度。
- `wechat-editorial-longform` 不声称 PSD 可编辑。
- `wechat-photoshop-delivery` 不在校样未确认前批量生成。
- `wechat-visual-qa` 不把脚本成功当作视觉通过。

结论：8 个 Skill 的触发词、输入、输出和完成定义已形成非重复边界。

