const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { validateManifest } = require('./validate-photoshop-manifest.js');

function baseManifest(source) {
  return {
    canvas: { width: 1080, height: 2880 },
    fonts: [{ role: 'body', postScriptName: 'MiSans-Regular' }],
    blocks: [{ id: 'intro', type: 'text', x: 80, y: 120, width: 920, height: 260 }],
    decorations: [{ id: 'rule-1', type: 'line', x: 80, y: 420, width: 920, height: 2 }],
    images: [
      {
        id: 'hero',
        source,
        x: 0,
        y: 520,
        width: 1080,
        height: 1200,
        creditStatus: 'cleared',
      },
    ],
    slices: [
      { id: '01', y: 0, height: 1440 },
      { id: '02', y: 1440, height: 1440 },
    ],
  };
}

test('accepts a complete non-destructive delivery manifest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wechat-manifest-'));
  const image = path.join(dir, 'hero.jpg');
  fs.writeFileSync(image, 'fixture');
  const result = validateManifest(baseManifest(image));
  assert.equal(result.status, 'PASS');
  assert.equal(result.failures.length, 0);
});

test('rejects zero-size lines, missing images, duplicates, bad fonts and out-of-bounds blocks', () => {
  const manifest = baseManifest(path.join(os.tmpdir(), 'missing-hero.jpg'));
  manifest.images.push({ ...manifest.images[0] });
  manifest.fonts[0].postScriptName = '';
  manifest.decorations[0].height = 0;
  manifest.blocks[0].x = 1000;
  manifest.blocks[0].width = 200;
  const result = validateManifest(manifest);
  const text = result.failures.join('\n');
  assert.equal(result.status, 'FAIL');
  assert.match(text, /duplicate image id/i);
  assert.match(text, /missing source image/i);
  assert.match(text, /invalid font/i);
  assert.match(text, /zero-size/i);
  assert.match(text, /out of canvas/i);
});

test('rejects slice gaps and overlaps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wechat-manifest-'));
  const image = path.join(dir, 'hero.jpg');
  fs.writeFileSync(image, 'fixture');

  const gap = baseManifest(image);
  gap.slices[1].y = 1450;
  assert.match(validateManifest(gap).failures.join('\n'), /slice gap/i);

  const overlap = baseManifest(image);
  overlap.slices[1].y = 1400;
  assert.match(validateManifest(overlap).failures.join('\n'), /slice overlap/i);
});
