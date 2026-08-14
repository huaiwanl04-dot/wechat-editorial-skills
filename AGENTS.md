# Repository Instructions

## 底层开发思维

坚决杜绝闭门造车、重复造轮子。

1. 启动较大功能或制定方案前，优先在 GitHub 查找同类项目、文档、实现思路和源码。
2. 复用成熟项目之前，评估许可证、维护状态、安全风险和适配成本。
3. 简单 bug、明确小改动或离线任务不强制调研。
4. 多检索、多拆解；可以复用的内容直接复用，有参考价值的方案吸收其原则。
5. 交叉对比多套方案，保留优势并剔除不适合本仓库的部分。

## Skill changes

- Keep every skill self-contained under `skills/<skill-name>/`.
- Read the complete `SKILL.md` before modifying a skill.
- Keep trigger conditions in the frontmatter `description`.
- Put deterministic operations in `scripts/`, long guidance in `references/`, and output templates in `assets/`.
- Update tests and `agents/openai.yaml` when behavior or metadata changes.
- Never add client assets, production PSD/PSB files, secrets, credentials, or personal data.
- Run the root validation commands documented in `README.md` before submitting changes.

