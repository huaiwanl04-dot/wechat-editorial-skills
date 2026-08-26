# WeChat Skills Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有 8 个公众号工作流 Skill 产品化为可自动发现、可验证、可同步、可跨项目复用的 Codex Skills，同时保留当前项目中的单一源文件。

**Architecture:** 继续以仓库的 `skills/` 作为唯一源码目录，每个 Skill 补齐 `agents/openai.yaml`；用确定性安装脚本把已验证版本同步到用户级 `~/.codex/skills`。内容总控 Skill 只负责路由，研究、审稿、长图、Photoshop 和 QA 保持职责隔离。

**Tech Stack:** Agent Skills `SKILL.md`、Codex `agents/openai.yaml`、Node.js、PowerShell、Adobe Photoshop JSX/ExtendScript、Python `quick_validate.py`。

## Global Constraints

- 保留现有 8 个 Skill，不新增功能重叠的 Skill。
- 不复制外部仓库代码；仅采用官方公开目录与渐进加载模式。
- OpenAI Plugins 仓库不提供统一仓库级许可证，不能直接复制其中实现。
- Agent Skills 规范仓库为 Apache-2.0；本项目只借鉴文件组织规则。
- Anthropic Skills 各目录许可证不同；未经逐项确认不得复制源码或资产。
- `skills/` 是唯一源码；用户级安装目录是生成副本，不在两个位置人工分别修改。
- 任何全局安装必须先完成本地验证，并通过受控同步脚本执行。
- 当前工作区不是 Git 仓库，因此以测试报告和文件哈希作为变更检查点，不执行虚假的 Git 提交步骤。

---

### Task 1: Add Codex UI metadata to all eight Skills

**Files:**
- Create: `skills/<skill-name>/agents/openai.yaml`（8 个文件）
- Test: `~/.codex/skills/.system/skill-creator/scripts/quick_validate.py`

**Interfaces:**
- Consumes: 每个 `SKILL.md` 的 `name`、`description` 与默认使用场景。
- Produces: `interface.display_name`、`interface.short_description`、`interface.default_prompt`。

- [x] **Step 1: Generate deterministic metadata**

  对 8 个 Skill 分别调用 `generate_openai_yaml.py`，所有 `default_prompt` 必须显式包含 `$skill-name`，不添加未经用户提供的图标或品牌色。

- [x] **Step 2: Validate metadata content**

  运行 UTF-8/YAML 检查，确认字符串加引号、Skill 名称准确、默认提示与职责一致。

- [x] **Step 3: Validate every Skill folder**

  Run:

  ```powershell
  $python='<path-to-python>'
  Get-ChildItem 'skills' -Directory | ForEach-Object {
    & $python "$HOME/.codex/skills/.system/skill-creator/scripts/quick_validate.py" $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Skill validation failed: $($_.Name)" }
  }
  ```

  Expected: 8 个 Skill 全部返回成功，零 frontmatter 与命名错误。

### Task 2: Harden the shared workflow and open-source evaluation gate

**Files:**
- Modify: `skills/wechat-official-account-content/references/content-operation-workflow.md`
- Modify: `skills/wechat-case-research/SKILL.md`
- Create: `skills/wechat-case-research/references/open-source-evaluation.md`

**Interfaces:**
- Consumes: 根目录 `AGENTS.md` 的 GitHub 调研、许可证、维护状态、安全风险和适配成本要求。
- Produces: 所有大型自动化或长期维护方案共用的开源评估门禁。

- [x] **Step 1: Add the research decision gate**

  在 G0 后加入“仅当任务包含新工具、长期脚本或重大技术方案时才执行”的开源评估；简单改稿、明确小修和纯离线排版不触发。

- [x] **Step 2: Define the comparison record**

  `open-source-evaluation.md` 固定记录：仓库、官方链接、许可证、最近推送时间、维护状态、安全风险、适配成本、采用/借鉴/拒绝结论。

- [x] **Step 3: Prevent license laundering**

  明确“参考方法”与“复制实现”分离；没有兼容许可证时只允许借鉴结构与思想，禁止复制代码、模板和资产。

- [x] **Step 4: Re-run all Skill validators**

  Expected: 8 个 Skill 仍全部通过。

### Task 3: Package deterministic Photoshop and QA helpers

**Files:**
- Create: `skills/wechat-photoshop-delivery/scripts/wechat-photoshop-lib.jsx`
- Create: `skills/wechat-photoshop-delivery/scripts/validate-photoshop-manifest.js`
- Modify: `skills/wechat-photoshop-delivery/SKILL.md`
- Modify: `skills/wechat-visual-qa/scripts/audit-wechat-delivery.js`
- Create: `skills/wechat-visual-qa/scripts/audit-wechat-delivery.test.js`

**Interfaces:**
- Consumes: 画布、区块、文字、智能对象、蒙版和语义切片 manifest。
- Produces: 非破坏性 Photoshop 图层构建工具、manifest 预检结果、聚合 QA 结论。

- [x] **Step 1: Write failing manifest tests**

  覆盖零尺寸线条、缺图、重复图片 ID、切片间隙/重叠、无效字体和越界区块。Expected: 在实现校验器前测试失败。

- [x] **Step 2: Implement manifest validation**

  校验器输出 JSON：`status`、`failures`、`warnings`、`counts`；任何零尺寸装饰、切片缺口、重复 ID 或缺失源图均为 `FAIL`。

- [x] **Step 3: Generalize the verified JSX helpers**

  从已验证的历史项目脚本中只迁移通用的文档、分组、文字、智能对象、蒙版、纯色层、线条和保存逻辑；命名空间改为 `WechatPS`，并保留宽高小于等于零时拒绝建层的保护。

- [x] **Step 4: Extend aggregate QA tests**

  增加主母版与切片重组差异、完整母版大面积遮挡、字体替换、图片授权未清零四类失败测试。

- [x] **Step 5: Run deterministic tests**

  Run:

  ```powershell
  node --test skills\wechat-visual-qa\scripts\audit-wechat-delivery.test.js
  node skills\wechat-photoshop-delivery\scripts\validate-photoshop-manifest.js --self-test
  node skills\wechat-visual-qa\scripts\audit-wechat-delivery.js --self-test
  ```

  Expected: 全部测试通过，失败样例被正确阻断。

### Task 4: Add a single-source user-level installer

**Files:**
- Create: `skills/wechat-official-account-content/scripts/sync-wechat-skills.ps1`
- Create: `skills/wechat-official-account-content/scripts/sync-wechat-skills.test.ps1`

**Interfaces:**
- Consumes: 仓库的 `skills/`。
- Produces: `~/.codex/skills/wechat-*` 的校验后副本和安装清单。

- [x] **Step 1: Write the dry-run test**

  在 `C:\tmp\wechat-skill-sync-test` 中验证新增、更新、未声明文件拒绝和源目录缺失行为；不访问真实用户级目录。

- [x] **Step 2: Implement validated synchronization**

  脚本默认 `-DryRun`，要求每个目录具有合法 `SKILL.md` 和 `agents/openai.yaml`；正式执行前生成 SHA-256 清单并把旧版本备份到带时间戳目录。

- [x] **Step 3: Run the isolated test**

  Run:

  ```powershell
  powershell -ExecutionPolicy Bypass -File skills\wechat-official-account-content\scripts\sync-wechat-skills.test.ps1
  ```

  Expected: 测试只修改 `C:\tmp\wechat-skill-sync-test`，状态为 `PASS`。

- [x] **Step 4: Run a real dry run**

  Run:

  ```powershell
  powershell -ExecutionPolicy Bypass -File skills\wechat-official-account-content\scripts\sync-wechat-skills.ps1 -SourceRoot '.\skills' -TargetRoot "$HOME\.codex\skills" -DryRun
  ```

  Expected: 报告计划安装 8 个 Skill，不写入目标目录。

- [x] **Step 5: Install after approval**

  在获得用户级目录写入许可后显式运行 `-Apply` 版本。Expected: 安装清单包含 8 个 Skill 及源码哈希；不覆盖同名未知目录。

### Task 5: Validate discovery and trigger coverage

**Files:**
- Create: `skills/wechat-official-account-content/scripts/validate-wechat-skills.js`
- Test: all installed `SKILL.md` and `agents/openai.yaml`

**Interfaces:**
- Consumes: 8 个安装后 Skill 的 metadata 与路由表。
- Produces: 触发覆盖、重复职责、死链、脚本自检和源码/安装副本一致性报告。

- [x] **Step 1: Define trigger fixtures**

  固定 16 个请求样例，覆盖案例核验、标题、正文、挑刺、读者模拟、终稿、长图、PSD 和视觉 QA；每个样例必须只命中一个主 Skill，可附带明确的后续路由。

- [x] **Step 2: Implement static validation**

  检查 frontmatter、Skill 名称、路由目标、引用文件、脚本文件、`openai.yaml` 默认提示与源码哈希。

- [x] **Step 3: Run all checks**

  Run:

  ```powershell
  node skills\wechat-official-account-content\scripts\validate-wechat-skills.js
  node --test skills\wechat-visual-qa\scripts\audit-wechat-delivery.test.js
  ```

  Expected: `8 skills / 0 broken references / 0 duplicate primary routes / all tests PASS`。

- [ ] **Step 4: Restart discovery check**

  重启 Codex 后确认 8 个 `$wechat-*` 出现在 Skill 列表；若未出现，只修复安装路径或 metadata，不复制第三份源码。

## Self-Review

- Spec coverage: 包含官方方案对比、8 个 Skill 保留、元数据、开源门禁、通用脚本、用户级注册、自动测试和发现验证。
- Placeholder scan: 无 `TBD`、`TODO` 或未定义实现步骤。
- Interface consistency: `skills/` 始终是源目录；同步脚本唯一负责写入用户目录；验证脚本同时检查源码与安装副本。
