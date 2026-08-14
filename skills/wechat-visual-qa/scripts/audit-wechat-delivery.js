#!/usr/bin/env node

const fs = require('fs');

const CLEARED_RIGHTS = new Set([
  'cleared',
  'licensed',
  'owned',
  'permission-confirmed',
  'public-domain',
  'cc-by',
  'cc-by-sa',
]);

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

function readJson(path, label, failures) {
  if (!path) {
    failures.push(`${label}: missing argument`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    return null;
  }
}

function isPass(value) {
  return typeof value === 'string' && ['PASS', 'OK'].includes(value.toUpperCase());
}

function inspectReports({ layout, layer, delivery, manifest }) {
  const failures = [];
  const warnings = [];

  if (layout) {
    if (layout.isValid === false || (layout.status && !isPass(layout.status))) {
      failures.push('layout QA is not PASS');
    }
    if (Array.isArray(layout.collisions) && layout.collisions.length) {
      failures.push(`layout has ${layout.collisions.length} collision(s)`);
    }
    if (Array.isArray(layout.overflows) && layout.overflows.length) {
      failures.push(`layout has ${layout.overflows.length} overflow(s)`);
    }
  }

  if (layer && !isPass(layer.status)) {
    failures.push('layer QA is not PASS');
  }
  if (layer && Number.isFinite(layer.fontSubstitutionCount) && layer.fontSubstitutionCount > 0) {
    failures.push(`font substitutions detected: ${layer.fontSubstitutionCount}`);
  }

  if (delivery) {
    if (!isPass(delivery.status)) {
      failures.push('aggregate delivery QA is not PASS');
    }
    if (Array.isArray(delivery.errors) && delivery.errors.length) {
      failures.push(...delivery.errors.map((error) => `delivery: ${error}`));
    }
    if (
      Number.isFinite(delivery.browserPhotoshopMad) &&
      Number.isFinite(delivery.parityThreshold) &&
      delivery.browserPhotoshopMad > delivery.parityThreshold
    ) {
      failures.push(
        `visual parity MAD ${delivery.browserPhotoshopMad} exceeds ${delivery.parityThreshold}`,
      );
    }
    if (
      Number.isFinite(delivery.seamlessReconstructionMad) &&
      delivery.seamlessReconstructionMad !== 0
    ) {
      failures.push(`seamless reconstruction MAD is ${delivery.seamlessReconstructionMad}`);
    }
    if (
      Number.isFinite(delivery.masterSliceMad) &&
      delivery.masterSliceMad > (Number.isFinite(delivery.masterSliceThreshold)
        ? delivery.masterSliceThreshold
        : 0)
    ) {
      failures.push(
        `master/slice reconstruction MAD ${delivery.masterSliceMad} exceeds ${delivery.masterSliceThreshold || 0}`,
      );
    }
    if (
      Number.isFinite(delivery.largeOcclusionRatio) &&
      delivery.largeOcclusionRatio > (Number.isFinite(delivery.maxLargeOcclusionRatio)
        ? delivery.maxLargeOcclusionRatio
        : 0.08)
    ) {
      failures.push(
        `full-master large occlusion ratio ${delivery.largeOcclusionRatio} exceeds ${delivery.maxLargeOcclusionRatio || 0.08}`,
      );
    }
    if (
      Number.isFinite(delivery.visibleCanvasRatio) &&
      delivery.visibleCanvasRatio < (Number.isFinite(delivery.minVisibleCanvasRatio)
        ? delivery.minVisibleCanvasRatio
        : 0.98)
    ) {
      failures.push(
        `full-master visible canvas ratio ${delivery.visibleCanvasRatio} is below ${delivery.minVisibleCanvasRatio || 0.98}`,
      );
    }
    const badSlices = (delivery.sliceResults || []).filter((slice) => !isPass(slice.qa));
    if (badSlices.length) {
      failures.push(`non-PASS slices: ${badSlices.map((slice) => slice.name).join(', ')}`);
    }
  }

  const images = Array.isArray(manifest) ? manifest : manifest?.images || [];
  const unresolved = images.filter(
    (item) => !CLEARED_RIGHTS.has(String(item.creditStatus || '').toLowerCase()),
  );
  if (unresolved.length) {
    failures.push(`image rights unresolved: ${unresolved.length}/${images.length}`);
  }
  const externalSources = images.filter((item) => {
    const source = String(item.source || '');
    return source && !source.includes('deliverables\\') && !source.includes('deliverables/');
  });
  if (externalSources.length) {
    warnings.push(`image sources outside project package: ${externalSources.length}/${images.length}`);
  }

  return {
    status: failures.length ? 'FAIL' : 'PASS',
    failures,
    warnings,
    counts: {
      images: images.length,
      unresolvedRights: unresolved.length,
      externalImageSources: externalSources.length,
    },
  };
}

function selfTest() {
  const pass = inspectReports({
    layout: { isValid: true, collisions: [], overflows: [] },
    layer: { status: 'PASS' },
    delivery: {
      status: 'PASS',
      errors: [],
      browserPhotoshopMad: 2,
      parityThreshold: 12,
      seamlessReconstructionMad: 0,
      sliceResults: [{ name: '01', qa: 'PASS' }],
    },
    manifest: { images: [{ source: 'deliverables/a.jpg', creditStatus: 'cleared' }] },
  });
  const fail = inspectReports({
    layout: { isValid: true },
    layer: { status: 'PASS' },
    delivery: {
      status: 'FAIL',
      errors: ['parity mismatch'],
      browserPhotoshopMad: 75,
      parityThreshold: 12,
      seamlessReconstructionMad: 0,
      sliceResults: [{ name: '01', qa: 'PASS' }],
    },
    manifest: { images: [{ source: 'C:\\Desktop\\a.jpg', creditStatus: 'verify-before-publish' }] },
  });
  if (pass.status !== 'PASS' || fail.status !== 'FAIL' || fail.failures.length < 3) {
    throw new Error('self-test failed');
  }
  process.stdout.write(JSON.stringify({ status: 'PASS', tests: 2 }, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    selfTest();
    return;
  }

  const readFailures = [];
  const reports = {
    layout: readJson(args.layout, 'layout', readFailures),
    layer: readJson(args.layer, 'layer', readFailures),
    delivery: readJson(args.delivery, 'delivery', readFailures),
    manifest: readJson(args.manifest, 'manifest', readFailures),
  };
  const result = inspectReports(reports);
  result.failures.unshift(...readFailures);
  if (readFailures.length) result.status = 'FAIL';
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}

if (require.main === module) main();

module.exports = { inspectReports };
