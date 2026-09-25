import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createCapsuleGeometry, profileId } from '@fleet/continuous-capsule';
import { profile } from '../src/profile.js';

test('runtime profile retains the native fixture and provenance', () => {
  const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/apple-capsules.json', import.meta.url), 'utf8'),
  );
  const { width, height, continuous } = fixture.samples[0];
  assert.deepEqual(profile, { width, height, continuous });
  assert.equal(fixture.os, 'Version 27.0 (Build 26A428)');
  assert.equal(profileId, 'swiftui-macos-27.0-26A428');
});

test('public API imports without DOM or React and produces independent results', () => {
  const options = Object.freeze({ width: 214, height: 30 });
  const first = createCapsuleGeometry(options);
  const second = createCapsuleGeometry(options);
  assert.deepEqual(first, second);
  first.surfacePath = 'changed';
  assert.notEqual(first.surfacePath, second.surfacePath);
  assert.equal(second.inset, 0.5);
  assert.equal((second.surfacePath.match(/C/g) ?? []).length, 12);
});

test('invalid and unsupported geometry uses the fallback', () => {
  const defaults = { width: 214, height: 30 };
  for (const key of ['width', 'height', 'borderWidth', 'focusGap', 'focusWidth']) {
    for (const value of [NaN, Infinity, -Infinity, -1]) {
      assert.equal(createCapsuleGeometry({ ...defaults, [key]: value }), null);
    }
  }
  for (const options of [
    { width: 0 },
    { height: 0 },
    { focusWidth: 0 },
    { width: 30 },
    { width: 30, height: 214 },
    { borderWidth: 30 },
    { width: 47, height: 30 }, // inset path ratio is below 1.6
  ])
    assert.equal(createCapsuleGeometry({ ...defaults, ...options }), null);
  assert.ok(createCapsuleGeometry({ ...defaults, borderWidth: 0, focusGap: 0 }));
  assert.ok(createCapsuleGeometry({ width: 49, height: 31 })); // path ratio exactly 1.6
});

test('focus stroke preserves the requested clear gap from the painted border', () => {
  for (const [borderWidth, focusGap, focusWidth] of [
    [1, 4, 2],
    [2, 3, 4],
    [0, 0, 1],
  ]) {
    const { focusPath, inset } = createCapsuleGeometry({
      width: 214,
      height: 30,
      borderWidth,
      focusGap,
      focusWidth,
    });
    const numbers = focusPath.match(/-?\d*\.?\d+/g).map(Number);
    const xs = numbers.filter((_, i) => i % 2 === 0).map((x) => x + inset);
    const ys = numbers.filter((_, i) => i % 2 === 1).map((y) => y + inset);
    const reach = focusGap + focusWidth / 2;
    for (const [actual, expected] of [
      [Math.min(...xs), -reach],
      [Math.max(...xs), 214 + reach],
      [Math.min(...ys), -reach],
      [Math.max(...ys), 30 + reach],
    ])
      assert.ok(Math.abs(actual - expected) < 0.001);
  }
});

test('surface-only output is identical across native sizes and border widths', () => {
  for (const name of ['apple-capsules.json', 'apple-compact-capsules.json']) {
    const { samples } = JSON.parse(
      readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'),
    );
    for (const { width, height } of samples) {
      for (const borderWidth of [0, 0.5, 1, 2]) {
        const options = { width, height, borderWidth };
        const full = createCapsuleGeometry(options);
        const surface = createCapsuleGeometry({ ...options, includeFocus: false });
        assert.deepEqual(surface, full && { surfacePath: full.surfacePath, inset: full.inset });
        assert.deepEqual(createCapsuleGeometry({ ...options, includeFocus: true }), full);
      }
    }
  }
});

test('surface-only mode preserves validation and fallback behavior', () => {
  const defaults = { width: 214, height: 30 };
  for (const key of ['width', 'height', 'borderWidth', 'focusGap', 'focusWidth']) {
    for (const value of [NaN, Infinity, -Infinity, -1, 0]) {
      const options = { ...defaults, [key]: value };
      assert.equal(
        createCapsuleGeometry({ ...options, includeFocus: false }) === null,
        createCapsuleGeometry(options) === null,
      );
    }
  }
  for (const options of [{ width: 30 }, { width: 47 }, { borderWidth: 30 }]) {
    assert.equal(createCapsuleGeometry({ ...defaults, ...options, includeFocus: false }), null);
  }
});
