import { profile } from './profile.js';

// Adapt a native-render-fitted wide-capsule path without stretching its ends horizontally.
// Radius scales with height; right-hand points remain anchored to the right.
// Approximate native paint, not exported native commands. Narrow/circular regimes are out of scope.
export function appleCapsuleCommands(width, height) {
  if (!(Number.isFinite(width) && Number.isFinite(height) && height > 0 && width / height >= 1.6)) {
    throw new RangeError('The measured capsule profile requires width / height >= 1.6');
  }
  const reference = profile;
  const scale = height / reference.height;
  return reference.continuous.map(({ type, points }) => ({
    type,
    points: points.map((value, index) =>
      index % 2
        ? value * scale
        : value <= reference.width / 2
          ? value * scale
          : width - (reference.width - value) * scale,
    ),
  }));
}

export function appleCapsulePath(width, height) {
  return appleCapsuleCommands(width, height)
    .map(
      ({ type, points }) => `${type} ${points.map((value) => Number(value.toFixed(9))).join(' ')}`,
    )
    .join(' ');
}
