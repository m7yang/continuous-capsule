import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appleCapsuleCommands, appleCapsulePath } from '../src/native-capsule.js';
import { offsetFocusPath } from '../src/focus-offset.js';
import { createCapsuleGeometry } from '../src/index.js';
// Frozen prototype paths are independent of the runtime profile generator.
const samples = JSON.parse(readFileSync(
  new URL('./fixtures/capsule-fit-cases.json', import.meta.url), 'utf8',
)).map(sample => ({ ...sample, continuous: sample.fitted }));
function curves(commands) {
  const result = [];
  let current;
  for (const { type, points } of commands) {
    if (type === 'C') result.push([current, points.slice(0, 2), points.slice(2, 4), points.slice(4)]);
    if (points.length) current = points.slice(-2);
  }
  return result;
}
function evaluate([a, b, c, d], t) {
  const u = 1 - t;
  return [0, 1].map(i => u ** 3 * a[i] + 3 * u ** 2 * t * b[i] + 3 * u * t ** 2 * c[i] + t ** 3 * d[i]);
}
let maximumError = 0;
for (const sample of samples) {
  const actual = appleCapsuleCommands(sample.width, sample.height);
  assert.equal(actual.filter((command) => command.type === 'C').length, 24);
  const edges = [];
  let current, first;
  for (const { type, points } of actual) {
    if (type === 'M') { current = first = points; continue; }
    const end = type === 'Z' ? first : points.slice(-2);
    const startTangent = (type === 'C' ? points.slice(0, 2) : end).map((n, i) => n - current[i]);
    const endTangent = end.map((n, i) => n - (type === 'C' ? points.slice(2, 4) : current)[i]);
    if (Math.hypot(...startTangent) > 1e-9) edges.push([startTangent, endTangent]);
    assert.ok(points.every((n, i) => n >= 0 && n <= (i % 2 ? sample.height : sample.width)));
    current = end;
  }
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i][1], b = edges[(i + 1) % edges.length][0];
    const magnitude = Math.hypot(...a) * Math.hypot(...b);
    assert.ok(Math.abs(a[0] * b[1] - a[1] * b[0]) / magnitude < 1e-10);
    assert.ok(a[0] * b[0] + a[1] * b[1] > 0);
  }
  // Compare sampled curve positions against the unsplit frozen prototype.
  // Runtime cubics are exact halves, not newly fitted control points.
  const expectedCurves = curves(sample.continuous);
  const { surfacePath, inset } = createCapsuleGeometry({ ...sample, borderWidth: 0 });
  assert.equal(inset, 0);
  const serialized = [...surfacePath.matchAll(/([MLCZ])([^MLCZ]*)/g)].map(([, type, values]) => ({
    type, points: (values.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number),
  }));
  for (const commands of [actual, serialized]) {
    const actualCurves = curves(commands);
    assert.equal(actualCurves.length, expectedCurves.length * 2);
    actualCurves.forEach((curve, i) => {
      for (let step = 0; step <= 40; step++) {
        const p = evaluate(curve, step / 40);
        const expected = evaluate(expectedCurves[Math.floor(i / 2)], ((i % 2) + step / 40) / 2);
        const error = Math.hypot(p[0] - expected[0], p[1] - expected[1]);
        maximumError = Math.max(maximumError, error);
        assert.ok(error < 1e-9, `${sample.width}×${sample.height}: curve error ${error}`);
      }
    });
  }
}
assert.throws(() => appleCapsuleCommands(30, 30), /width \/ height/);
console.log(
  `${samples.length} fitted sizes verified; maximum sampled frozen-fit curve error: ${maximumError} px.`,
);

// Independently sample the frozen fitted fixture with de Casteljau subdivision, then
// measure the ring's shortest distance to that boundary (not its own normals).
function boundaryPoints(commands) {
  const points = [];
  let current;
  for (const { type, points: p } of commands) {
    if (type === 'M' || type === 'L') {
      current = p;
      points.push(current);
    } else if (type === 'C') {
      for (let i = 1; i <= 400; i++) {
        let level = [current, p.slice(0, 2), p.slice(2, 4), p.slice(4)];
        const t = i / 400;
        while (level.length > 1) {
          level = level
            .slice(1)
            .map((end, j) => end.map((value, axis) => level[j][axis] * (1 - t) + value * t));
        }
        points.push(level[0]);
      }
      current = p.slice(4);
    }
  }
  return points;
}
function segmentDistance(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const squaredLength = dx * dx + dy * dy;
  const t = squaredLength
    ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / squaredLength))
    : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
let maximumOffsetError = 0;
for (const sample of samples) {
  const ring = offsetFocusPath(appleCapsulePath(sample.width, sample.height), 5.5);
  assert.ok(ring.endsWith(' Z'));
  const coordinates = ring.match(/-?\d+\.?\d*/g).map(Number);
  assert.ok(coordinates.every(Number.isFinite));
  const points = Array.from({ length: coordinates.length / 2 }, (_, i) =>
    coordinates.slice(i * 2, i * 2 + 2),
  );
  for (const [axis, size] of [
    [0, sample.width],
    [1, sample.height],
  ]) {
    assert.ok(Math.abs(Math.min(...points.map((p) => p[axis])) + 5.5) < 0.001);
    assert.ok(Math.abs(Math.max(...points.map((p) => p[axis])) - size - 5.5) < 0.001);
  }
  const boundary = boundaryPoints(sample.continuous);
  for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 64))) {
    const distance = Math.min(
      ...boundary.map((a, j) => segmentDistance(points[i], a, boundary[(j + 1) % boundary.length])),
    );
    const error = Math.abs(distance - 5.5);
    maximumOffsetError = Math.max(maximumOffsetError, error);
    assert.ok(error < 0.003, `${sample.width}×${sample.height}: focus offset error ${error}`);
  }
}
console.log(
  `${samples.length} focus rings verified; maximum offset error: ${maximumOffsetError.toFixed(6)} px.`,
);
