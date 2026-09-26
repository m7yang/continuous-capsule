import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { rectanglePathGeometry } from '../src/native-rectangle.js';
import { createContinuousRectangleGeometry as generate, profileId } from '../src/index.js';

test('zero-radius focus rings preserve clearance at every corner and side', () => {
  for (const [width, height, borderWidth, focusGap, focusWidth] of [
    [120, 48, 1, 4, 2],
    [48, 120, 2, 3, 4],
    [24, 12, 0, 0, 1],
    [1.25, 2.5, 0.25, 0.375, 0.5],
  ]) {
    const options = { width, height, radius: 0, borderWidth, focusGap, focusWidth };
    const { surfacePath, focusPath, inset } = generate(options);
    assert.deepEqual(generate({ ...options, includeFocus: false }), { surfacePath, inset });
    assert.ok(focusPath.endsWith(' Z'));
    const coordinates = focusPath.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);
    const ring = Array.from({ length: coordinates.length / 2 }, (_, i) =>
      coordinates.slice(i * 2, i * 2 + 2).map(value => value + inset),
    );
    // Measure from the painted rectangle, independently of the offset formula.
    for (const point of [[0, 0], [width, 0], [width, height], [0, height],
      [width / 2, 0], [width, height / 2], [width / 2, height], [0, height / 2]]) {
      const distance = Math.min(...ring.map((a, i) => {
        const b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1,
          ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy),
        ));
        return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
      }));
      const clearance = distance - focusWidth / 2;
      assert.ok(Math.abs(clearance - focusGap) < 1e-9,
        `${width}×${height} at ${point}: expected gap ${focusGap}, got ${clearance}`);
    }
  }
});

test('continuous rectangles match independent native holdouts and validate public inputs', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/apple-rectangles.json', import.meta.url)));
  assert.equal(fixture.os, 'Version 27.0 (Build 26A428)');
  assert.equal(profileId, 'swiftui-macos-27.0-26A428');
  assert.equal(fixture.samples.length, 561);
  for (const sample of fixture.samples) {
    const actual = rectanglePathGeometry(sample);
    assert.equal(actual.commands.length, sample.continuous.length);
    actual.commands.forEach(({ type, points }, i) => {
      const expected = sample.continuous[i];
      assert.equal(type, expected.type);
      assert.equal(points.length, expected.points.length);
      for (let j = 0; j < points.length; j += 2)
        assert.ok(Math.hypot(points[j] - expected.points[j], points[j + 1] - expected.points[j + 1]) < 0.0002, sample.id);
    });
    assert.equal(generate({ ...sample, borderWidth: 0, includeFocus: false }).surfacePath, actual.surfacePath);
  }
  const options = { width: 120, height: 48, radius: 13.125 };
  const full = generate(options), surface = generate({ ...options, includeFocus: false });
  assert.deepEqual(surface, { surfacePath: full.surfacePath, inset: 0.5 });
  assert.ok(full.focusPath.startsWith('M'));
  assert.equal(surface.surfacePath, rectanglePathGeometry({ width: 119, height: 47, radius: 13.125 }).surfacePath);
  for (const key of ['width', 'height', 'radius', 'borderWidth', 'focusGap', 'focusWidth']) {
    for (const value of [NaN, Infinity, -Infinity, -1, '2', null])
      assert.equal(generate({ ...options, [key]: value }), null);
  }
  for (const key of ['width', 'height', 'focusWidth']) assert.equal(generate({ ...options, [key]: 0 }), null);
  assert.equal(generate({ ...options, borderWidth: 48 }), null);
  assert.ok(generate({ ...options, radius: 0 }));
  assert.equal(generate({ ...options, radius: 999 }).surfacePath, generate({ ...options, radius: 23.5 }).surfacePath);
});
