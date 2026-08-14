#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--self-test') {
      args.selfTest = true;
    } else if (token.startsWith('--')) {
      args[token.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function boundsFailure(item, canvas, label) {
  if (![item.x, item.y, item.width, item.height].every(Number.isFinite)) {
    return `${label} has invalid bounds`;
  }
  if (!finitePositive(item.width) || !finitePositive(item.height)) {
    return `${label} has zero-size or negative dimensions`;
  }
  if (
    item.x < 0 ||
    item.y < 0 ||
    item.x + item.width > canvas.width ||
    item.y + item.height > canvas.height
  ) {
    return `${label} is out of canvas`;
  }
  return null;
}

function validateSlices(slices, canvas, failures) {
  if (!Array.isArray(slices) || slices.length === 0) {
    failures.push('slices: no semantic slices defined');
    return;
  }
  const ordered = [...slices].sort((a, b) => a.y - b.y);
  let cursor = 0;
  const ids = new Set();
  for (const slice of ordered) {
    const label = `slice ${slice.id || '(unnamed)'}`;
    if (!slice.id) failures.push('slice has no id');
    if (ids.has(slice.id)) failures.push(`duplicate slice id: ${slice.id}`);
    ids.add(slice.id);
    if (!Number.isFinite(slice.y) || !finitePositive(slice.height)) {
      failures.push(`${label} has invalid bounds`);
      continue;
    }
    if (slice.y > cursor) failures.push(`slice gap: ${cursor}-${slice.y}`);
    if (slice.y < cursor) failures.push(`slice overlap: ${slice.y}-${cursor}`);
    cursor = Math.max(cursor, slice.y + slice.height);
  }
  if (ordered[0] && ordered[0].y !== 0) failures.push(`slice gap: 0-${ordered[0].y}`);
  if (cursor < canvas.height) failures.push(`slice gap: ${cursor}-${canvas.height}`);
  if (cursor > canvas.height) failures.push(`slices exceed canvas by ${cursor - canvas.height}px`);
}

function validateManifest(manifest, options = {}) {
  const failures = [];
  const warnings = [];
  const baseDir = options.baseDir || process.cwd();
  const canvas = manifest && manifest.canvas;

  if (!canvas || !finitePositive(canvas.width) || !finitePositive(canvas.height)) {
    failures.push('canvas must have positive width and height');
  }
  const safeCanvas = canvas || { width: 0, height: 0 };

  const fonts = Array.isArray(manifest?.fonts) ? manifest.fonts : [];
  if (fonts.length === 0) warnings.push('fonts: no audited PostScript fonts declared');
  fonts.forEach((font, index) => {
    if (!font || typeof font.postScriptName !== 'string' || !font.postScriptName.trim()) {
      failures.push(`invalid font at index ${index}: audited PostScript name required`);
    }
  });

  const collections = [
    ['block', Array.isArray(manifest?.blocks) ? manifest.blocks : []],
    ['decoration', Array.isArray(manifest?.decorations) ? manifest.decorations : []],
    ['image', Array.isArray(manifest?.images) ? manifest.images : []],
  ];
  for (const [kind, items] of collections) {
    items.forEach((item, index) => {
      const failure = boundsFailure(item, safeCanvas, `${kind} ${item.id || index}`);
      if (failure) failures.push(failure);
    });
  }

  const images = collections[2][1];
  const imageIds = new Set();
  images.forEach((image, index) => {
    const id = image.id || `index-${index}`;
    if (!image.id) failures.push(`image at index ${index} has no id`);
    if (imageIds.has(id)) failures.push(`duplicate image id: ${id}`);
    imageIds.add(id);
    if (!image.source || typeof image.source !== 'string') {
      failures.push(`image ${id} has no source`);
    } else {
      const source = path.isAbsolute(image.source) ? image.source : path.resolve(baseDir, image.source);
      if (!fs.existsSync(source)) failures.push(`missing source image: ${id} -> ${image.source}`);
    }
    if (image.smartObject === false) failures.push(`image ${id} is not an embedded smart object`);
    if (image.mask === false) failures.push(`image ${id} has no independent mask`);
    if (image.smartObject == null || image.mask == null) {
      warnings.push(`image ${id}: smartObject/mask intent not explicitly declared`);
    }
  });

  validateSlices(manifest?.slices, safeCanvas, failures);

  return {
    status: failures.length ? 'FAIL' : 'PASS',
    failures,
    warnings,
    counts: {
      fonts: fonts.length,
      blocks: collections[0][1].length,
      decorations: collections[1][1].length,
      images: images.length,
      slices: Array.isArray(manifest?.slices) ? manifest.slices.length : 0,
    },
  };
}

function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wechat-manifest-selftest-'));
  const source = path.join(dir, 'hero.jpg');
  fs.writeFileSync(source, 'fixture');
  const manifest = {
    canvas: { width: 1080, height: 2880 },
    fonts: [{ role: 'body', postScriptName: 'MiSans-Regular' }],
    blocks: [{ id: 'intro', x: 80, y: 80, width: 920, height: 260 }],
    decorations: [{ id: 'rule', x: 80, y: 400, width: 920, height: 2 }],
    images: [
      {
        id: 'hero',
        source,
        x: 0,
        y: 500,
        width: 1080,
        height: 1200,
        smartObject: true,
        mask: true,
      },
    ],
    slices: [
      { id: '01', y: 0, height: 1440 },
      { id: '02', y: 1440, height: 1440 },
    ],
  };
  const pass = validateManifest(manifest, { baseDir: dir });
  const fail = validateManifest({
    ...manifest,
    decorations: [{ id: 'bad-line', x: 0, y: 0, width: 10, height: 0 }],
    images: [manifest.images[0], { ...manifest.images[0] }],
    slices: [{ id: '01', y: 20, height: 1000 }],
  });
  if (pass.status !== 'PASS' || fail.status !== 'FAIL' || fail.failures.length < 3) {
    throw new Error('manifest validator self-test failed');
  }
  process.stdout.write(JSON.stringify({ status: 'PASS', tests: 2 }, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    selfTest();
    return;
  }
  if (!args.manifest) {
    process.stderr.write('Usage: validate-photoshop-manifest.js --manifest <file>\n');
    process.exitCode = 2;
    return;
  }
  try {
    const manifestPath = path.resolve(args.manifest);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const result = validateManifest(manifest, { baseDir: path.dirname(manifestPath) });
    process.stdout.write(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'PASS' ? 0 : 1;
  } catch (error) {
    process.stdout.write(
      JSON.stringify({ status: 'FAIL', failures: [error.message], warnings: [], counts: {} }, null, 2),
    );
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { validateManifest };
