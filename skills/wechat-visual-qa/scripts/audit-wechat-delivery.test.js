const test = require('node:test');
const assert = require('node:assert/strict');

const { inspectReports } = require('./audit-wechat-delivery.js');

function passingReports() {
  return {
    layout: { isValid: true, collisions: [], overflows: [] },
    layer: { status: 'PASS', fontSubstitutionCount: 0 },
    delivery: {
      status: 'PASS',
      errors: [],
      browserPhotoshopMad: 2,
      parityThreshold: 12,
      seamlessReconstructionMad: 0,
      masterSliceMad: 0,
      masterSliceThreshold: 0,
      largeOcclusionRatio: 0,
      maxLargeOcclusionRatio: 0.08,
      visibleCanvasRatio: 1,
      minVisibleCanvasRatio: 0.98,
      sliceResults: [{ name: '01', qa: 'PASS' }],
    },
    manifest: {
      images: [{ source: 'deliverables/project/hero.jpg', creditStatus: 'cleared' }],
    },
  };
}

test('passes a complete delivery report', () => {
  assert.equal(inspectReports(passingReports()).status, 'PASS');
});

test('fails when full master and reconstructed slices differ', () => {
  const reports = passingReports();
  reports.delivery.masterSliceMad = 2;
  assert.match(inspectReports(reports).failures.join('\n'), /master\/slice reconstruction/i);
});

test('fails on large full-master occlusion or missing canvas visibility', () => {
  const reports = passingReports();
  reports.delivery.largeOcclusionRatio = 0.22;
  reports.delivery.visibleCanvasRatio = 0.76;
  const failures = inspectReports(reports).failures.join('\n');
  assert.match(failures, /large occlusion/i);
  assert.match(failures, /visible canvas ratio/i);
});

test('fails on font substitution and unresolved image rights', () => {
  const reports = passingReports();
  reports.layer.fontSubstitutionCount = 1;
  reports.manifest.images[0].creditStatus = 'verify-before-publish';
  const failures = inspectReports(reports).failures.join('\n');
  assert.match(failures, /font substitutions/i);
  assert.match(failures, /image rights unresolved/i);
});
