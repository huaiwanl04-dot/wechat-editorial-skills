# WeChat Editorial Skills GitHub Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish all eight reusable WeChat Official Account skills to a public GitHub repository that accepts community contributions without uploading client projects or production assets.

**Architecture:** Build a clean standalone repository under `github-publication/wechat-editorial-skills`, copy only the eight `skills/wechat-*` packages, add community and licensing files, run local validation and secret scans, then create and push `huaiwanl04-dot/wechat-editorial-skills`. The source workspace remains unchanged and is never initialized as a Git repository.

**Tech Stack:** Git, GitHub CLI 2.97.0, Markdown, PowerShell, Node.js, Python, Photoshop JSX.

## Global Constraints

- Repository visibility is public.
- Publish all eight `wechat-*` skills and their generic scripts, references, agents, and assets.
- Do not upload client images, PSD/PSB files, exported article artwork, or project deliverables.
- Use Apache-2.0 licensing and accept Issues and Pull Requests.
- Do not expose credentials, tokens, private keys, personal email addresses, or local project artifacts.
- Preserve the source-of-truth files under the workspace `skills/` directory.

---

### Task 1: Create a clean publication tree

**Files:**
- Create: `github-publication/wechat-editorial-skills/skills/wechat-*`
- Create: `github-publication/wechat-editorial-skills/.gitignore`

**Interfaces:**
- Consumes: the eight source skill directories under `skills/`.
- Produces: an isolated publication tree containing no client deliverables.

- [ ] **Step 1: Create the staging directory**

Run:

```powershell
New-Item -ItemType Directory -Path '.\github-publication\wechat-editorial-skills\skills' -Force
```

Expected: the directory exists inside the workspace.

- [ ] **Step 2: Copy the eight skill packages**

Run:

```powershell
Get-ChildItem '.\skills' -Directory -Filter 'wechat-*' | Copy-Item -Destination '.\github-publication\wechat-editorial-skills\skills' -Recurse
```

Expected: exactly eight top-level skill directories and 48 files.

- [ ] **Step 3: Add exclusion rules**

Create `.gitignore` with exclusions for PSD/PSB, exports, client assets, local manifests, credentials, editor metadata, caches, and generated test outputs.

- [ ] **Step 4: Verify staging scope**

Run:

```powershell
Get-ChildItem '.\github-publication\wechat-editorial-skills\skills' -Directory
Get-ChildItem '.\github-publication\wechat-editorial-skills' -Recurse -File | Measure-Object
```

Expected: eight skill directories before repository documentation is added.

### Task 2: Add public repository governance

**Files:**
- Create: `github-publication/wechat-editorial-skills/README.md`
- Create: `github-publication/wechat-editorial-skills/LICENSE`
- Create: `github-publication/wechat-editorial-skills/CONTRIBUTING.md`
- Create: `github-publication/wechat-editorial-skills/CODE_OF_CONDUCT.md`
- Create: `github-publication/wechat-editorial-skills/SECURITY.md`
- Create: `github-publication/wechat-editorial-skills/.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `github-publication/wechat-editorial-skills/.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `github-publication/wechat-editorial-skills/.github/pull_request_template.md`

**Interfaces:**
- Consumes: the skill names and existing validation commands.
- Produces: installation, contribution, security, and review guidance for public collaborators.

- [ ] **Step 1: Write README**

Document the eight-skill workflow, directory structure, installation methods, validation commands, contribution route, and the explicit exclusion of client/project materials.

- [ ] **Step 2: Add Apache-2.0 license**

Use the unmodified Apache License 2.0 text and copyright notice `2026 huaiwanl04-dot`.

- [ ] **Step 3: Add contribution and conduct rules**

Require focused Pull Requests, validation evidence, no copyrighted client assets, no secrets, and agreement that contributions are licensed under Apache-2.0.

- [ ] **Step 4: Add issue and pull request templates**

Collect affected skill, reproduction steps, expected behavior, validation output, and licensing/source notes.

### Task 3: Validate the publication tree

**Files:**
- Test: `github-publication/wechat-editorial-skills/skills/wechat-official-account-content/scripts/validate-wechat-skills.js`
- Test: all `*.test.js` and `*.test.ps1` scripts inside the publication tree.

**Interfaces:**
- Consumes: the isolated publication tree.
- Produces: evidence that the public copy is complete, internally consistent, and free of obvious credentials.

- [ ] **Step 1: Run the skill validator**

Run:

```powershell
node '.\skills\wechat-official-account-content\scripts\validate-wechat-skills.js' --skills-root '.\skills'
```

Expected: all eight skills validate successfully.

- [ ] **Step 2: Run JavaScript tests**

Run each `*.test.js` file with Node.js.

Expected: every test exits with status 0.

- [ ] **Step 3: Run PowerShell tests**

Run each `*.test.ps1` file with PowerShell.

Expected: every test exits with status 0 and does not modify the source workspace.

- [ ] **Step 4: Scan for publication risks**

Search for GitHub tokens, OpenAI keys, Google keys, private keys, passwords, local user paths, PSD/PSB files, client images, and delivery exports.

Expected: no credential or client-asset findings; generic source-code variable names such as `token` are allowed.

### Task 4: Create and publish the GitHub repository

**Files:**
- Create: `.git/` inside `github-publication/wechat-editorial-skills`
- Remote: `https://github.com/huaiwanl04-dot/wechat-editorial-skills`

**Interfaces:**
- Consumes: the validated publication tree and authenticated GitHub CLI.
- Produces: a public GitHub repository with one reviewed initial commit.

- [ ] **Step 1: Initialize Git and commit**

Run:

```powershell
git init -b main
git add .
git commit -m 'feat: publish WeChat editorial skills'
```

Expected: a clean `main` branch with one initial commit.

- [ ] **Step 2: Create and push the public repository**

Run:

```powershell
gh repo create huaiwanl04-dot/wechat-editorial-skills --public --source . --remote origin --push --description 'Reusable Codex skills for WeChat editorial research, writing, longform design, Photoshop delivery, and visual QA.'
```

Expected: the repository is created and `main` is pushed.

- [ ] **Step 3: Enable community collaboration features**

Run:

```powershell
gh repo edit huaiwanl04-dot/wechat-editorial-skills --enable-issues=true --enable-wiki=false --enable-projects=false
```

Expected: Issues are enabled; the repository remains public.

- [ ] **Step 4: Verify remote publication**

Run:

```powershell
gh repo view huaiwanl04-dot/wechat-editorial-skills --json nameWithOwner,visibility,url,defaultBranchRef
git status --short
git remote -v
```

Expected: visibility is `PUBLIC`, default branch is `main`, the remote URL is correct, and the working tree is clean.

## Self-Review

- Spec coverage: all eight skills, public visibility, contributions, license, safety scan, and upload verification are covered.
- Placeholder scan: no deferred implementation placeholders are present.
- Type consistency: paths, repository name, account name, and validation entrypoint are consistent across all tasks.
