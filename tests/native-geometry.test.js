import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appleCapsuleCommands, appleCapsulePath } from '../src/native-capsule.js';
import { offsetFocusPath } from '../src/focus-offset.js';
import { createCapsuleGeometry } from '../src/index.js';
const samples = ['apple-capsules.json', 'apple-compact-capsules.json'].flatMap((name) => {
  const fixture = JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
  assert.equal(fixture.os, 'Version 27.0 (Build 26A428)');
  return fixture.samples;
});
let maximumError = 0;
for (const sample of samples) {
  const actual = appleCapsuleCommands(sample.width, sample.height);
  assert.equal(actual.length, sample.continuous.length);
  assert.equal(actual.filter((command) => command.type === 'C').length, 12);
  actual.forEach((command, index) => {
    const expected = sample.continuous[index];
    assert.equal(command.type, expected.type);
    assert.equal(command.points.length, expected.points.length);
    command.points.forEach((value, point) => {
      const error = Math.abs(value - expected.points[point]);
      maximumError = Math.max(maximumError, error);
      assert.ok(
        Number.isFinite(value) && error < 1e-9,
        `${sample.width}×${sample.height}: error ${error}`,
      );
    });
  });
  assert.equal(JSON.stringify(sample.continuous), JSON.stringify(sample.roundedRectangle));
  // Exercise the public, serialized borderless surface used by compact badges,
  // not only the internal control-point scaler.
  const { surfacePath, inset } = createCapsuleGeometry({ ...sample, borderWidth: 0 });
  assert.equal(inset, 0);
  const serialized = surfacePath.match(/-?\d+\.?\d*/g).map(Number);
  const native = sample.continuous.flatMap(({ points }) => points);
  assert.equal(serialized.length, native.length);
  serialized.forEach((value, i) => assert.ok(Math.abs(value - native[i]) < 1e-9));
}
assert.throws(() => appleCapsuleCommands(30, 30), /width \/ height/);
console.log(
  `${samples.length} native sizes verified; maximum control-point error: ${maximumError} px.`,
);

// Independently sample the native fixture with de Casteljau subdivision, then
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
