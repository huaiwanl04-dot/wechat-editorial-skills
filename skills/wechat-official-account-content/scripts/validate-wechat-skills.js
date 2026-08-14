#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXPECTED_SKILLS = [
  'wechat-adversarial-review',
  'wechat-case-research',
  'wechat-editorial-longform',
  'wechat-final-editor',
  'wechat-official-account-content',
  'wechat-photoshop-delivery',
  'wechat-reader-simulation',
  'wechat-visual-qa',
];

const ROUTES = [
  ['wechat-case-research', /核实|查证|事实台账|找更多案例|下载配图|图片版权/],
  ['wechat-adversarial-review', /挑刺|找硬伤|反向审核|风险审稿/],
  ['wechat-reader-simulation', /读者模拟|完读率|流失点|读者会不会看完/],
  ['wechat-final-editor', /合并审稿|终稿编辑|根据反馈改稿|发布终稿/],
  ['wechat-editorial-longform', /编辑长图|电子杂志|视觉系统|缩略校样/],
  ['wechat-photoshop-delivery', /PSD|PSB|分层源文件|智能对象|每层可移动/],
  ['wechat-visual-qa', /视觉质检|导出前自检|文字重叠|裁切错误|拼接缝/],
  ['wechat-official-account-content', /公众号标题|文章摘要|写公众号正文|公众号选题/],
];

const FIXTURES = [
  ['核实这18个艺术案例是否真实', 'wechat-case-research'],
  ['找更多案例并下载配图，检查图片版权', 'wechat-case-research'],
  ['给这篇草稿挑刺，找硬伤', 'wechat-adversarial-review'],
  ['做一次发布前风险审稿', 'wechat-adversarial-review'],
  ['模拟普通读者会不会看完', 'wechat-reader-simulation'],
  ['检查完读率和流失点', 'wechat-reader-simulation'],
  ['合并审稿意见，形成发布终稿', 'wechat-final-editor'],
  ['根据反馈改稿并做终稿编辑', 'wechat-final-editor'],
  ['把终稿设计成编辑长图缩略校样', 'wechat-editorial-longform'],
  ['建立电子杂志视觉系统', 'wechat-editorial-longform'],
  ['输出分层源文件 PSD，每层可移动', 'wechat-photoshop-delivery'],
  ['生成 PSB，图片保持智能对象', 'wechat-photoshop-delivery'],
  ['做导出前自检，检查文字重叠', 'wechat-visual-qa'],
  ['检查主体裁切错误和拼接缝', 'wechat-visual-qa'],
  ['优化公众号标题和文章摘要', 'wechat-official-account-content'],
  ['围绕这个选题写公众号正文', 'wechat-official-account-content'],
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function walkFiles(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.wechat-skill-install.json') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(full));
    else output.push(full);
  }
  return output;
}

function skillHash(root) {
  const lines = walkFiles(root)
    .sort((a, b) => a.localeCompare(b))
    .map((file) => `${path.relative(root, file)}\t${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`);
  return crypto.createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

function validateSkill(skillRoot, name, failures, counts) {
  const skillMd = path.join(skillRoot, 'SKILL.md');
  const metadata = path.join(skillRoot, 'agents', 'openai.yaml');
  if (!fs.existsSync(skillMd)) {
    failures.push(`${name}: missing SKILL.md`);
    return;
  }
  if (!fs.existsSync(metadata)) failures.push(`${name}: missing agents/openai.yaml`);
  const text = fs.readFileSync(skillMd, 'utf8');
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) failures.push(`${name}: invalid frontmatter`);
  const declaredName = match && match[1].match(/^name:\s*([^\r\n]+)$/m)?.[1].trim();
  if (declaredName !== name) failures.push(`${name}: frontmatter name mismatch (${declaredName || 'missing'})`);

  if (fs.existsSync(metadata)) {
    const yaml = fs.readFileSync(metadata, 'utf8');
    if (!yaml.includes(`$${name}`)) failures.push(`${name}: default_prompt does not reference $${name}`);
    if (!/display_name:\s*".+"/.test(yaml)) failures.push(`${name}: display_name missing`);
    if (!/short_description:\s*".{25,64}"/u.test(yaml)) failures.push(`${name}: short_description must be 25-64 characters`);
  }

  const markdownFiles = walkFiles(skillRoot).filter((file) => file.endsWith('.md'));
  for (const markdownFile of markdownFiles) {
    const markdown = fs.readFileSync(markdownFile, 'utf8');
    const refs = markdown.matchAll(/`((?:references|scripts|assets)[\\/][^`]+?\.(?:md|js|jsx|ps1|py|csv))`/g);
    for (const ref of refs) {
      const target = path.join(skillRoot, ref[1].replace(/[\\/]/g, path.sep));
      counts.references += 1;
      if (!fs.existsSync(target)) failures.push(`${name}: broken reference ${ref[1]}`);
    }
  }
}

function validateFixtures(failures) {
  const results = [];
  for (const [request, expected] of FIXTURES) {
    const matches = ROUTES.filter(([, matcher]) => matcher.test(request)).map(([name]) => name);
    if (matches.length !== 1 || matches[0] !== expected) {
      failures.push(`trigger fixture mismatch: "${request}" -> ${matches.join(', ') || 'none'}; expected ${expected}`);
    }
    results.push({ request, expected, matches });
  }
  return results;
}

function runSelfTests(root, failures) {
  const scripts = [
    path.join(root, 'wechat-photoshop-delivery', 'scripts', 'validate-photoshop-manifest.js'),
    path.join(root, 'wechat-visual-qa', 'scripts', 'audit-wechat-delivery.js'),
  ];
  for (const script of scripts) {
    if (!fs.existsSync(script)) {
      failures.push(`missing self-test script: ${script}`);
      continue;
    }
    const result = spawnSync(process.execPath, [script, '--self-test'], { encoding: 'utf8' });
    if (result.status !== 0) failures.push(`self-test failed: ${path.basename(script)}: ${result.stderr || result.stdout}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root || path.join(__dirname, '..', '..'));
  const installedRoot = args['installed-root'] ? path.resolve(args['installed-root']) : null;
  const failures = [];
  const warnings = [];
  const counts = { skills: 0, references: 0, fixtures: FIXTURES.length, installedMatches: 0 };

  const actual = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('wechat-'))
    .map((entry) => entry.name)
    .sort();
  const expected = [...EXPECTED_SKILLS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`skill set mismatch: expected ${expected.join(', ')}, got ${actual.join(', ')}`);
  }

  for (const name of EXPECTED_SKILLS) {
    const skillRoot = path.join(root, name);
    if (!fs.existsSync(skillRoot)) {
      failures.push(`${name}: source directory missing`);
      continue;
    }
    counts.skills += 1;
    validateSkill(skillRoot, name, failures, counts);
    if (installedRoot) {
      const installed = path.join(installedRoot, name);
      if (!fs.existsSync(installed)) failures.push(`${name}: installed copy missing`);
      else if (skillHash(skillRoot) !== skillHash(installed)) failures.push(`${name}: installed copy hash mismatch`);
      else counts.installedMatches += 1;
    }
  }

  const router = fs.readFileSync(path.join(root, 'wechat-official-account-content', 'SKILL.md'), 'utf8');
  for (const target of EXPECTED_SKILLS.filter((name) => name !== 'wechat-official-account-content')) {
    if (!router.includes(`\`${target}\``)) failures.push(`router missing target: ${target}`);
  }

  const fixtureResults = validateFixtures(failures);
  runSelfTests(root, failures);
  if (!installedRoot) warnings.push('installed copy comparison skipped; pass --installed-root after installation');

  const output = {
    status: failures.length ? 'FAIL' : 'PASS',
    failures,
    warnings,
    counts,
    fixtures: fixtureResults,
  };
  process.stdout.write(JSON.stringify(output, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}

main();
