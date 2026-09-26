# Continuous capsule

Dependency-free ESM geometry for a measured SwiftUI continuous capsule, usable
in browsers and Node without React or a DOM. The package retains the name
`@fleet/continuous-capsule` for existing consumers. It is private and unpublished.

```js
import { createCapsuleGeometry } from '@fleet/continuous-capsule';

const full = createCapsuleGeometry({ width: 214, height: 30 });
// { surfacePath, focusPath, inset } or null

const surface = createCapsuleGeometry({ width: 214, height: 30, includeFocus: false });
// { surfacePath, inset } or null; no focus offset calculation
```

The control box includes the border. Defaults are a 1 px border, 4 px clear
focus gap, and 2 px focus stroke. Translate returned paths by `(inset, inset)`
and paint them with the requested stroke widths. Keep the SVG coordinate system
equal to the actual control size; stretching it distorts the ends.

Finite positive dimensions are required; the inset path's width/height ratio
must be at least 1.6. Border width and gap may be zero; focus width must be
positive. Both modes validate all geometric options identically, including
unused focus options, and return null for unsupported sizes. Consumers retain a
CSS capsule and native focus outline when geometry is unavailable.

The [integration guide](docs/continuous-capsules.md) covers rendering and
verification, with a [React example](docs/continuous-capsules-react.md).
Adapters own styles, state, measurement, and memoization. The core has no cache
or UI dependencies. Pass `includeFocus: false` only when an offset ring is unused;
surface geometry is identical and `focusPath` is absent from the result.

## Development

Use the Node version in `.node-version` and pnpm version in `package.json`.
The tests and benchmark have no install dependencies:

```sh
pnpm test
pnpm benchmark
```

The benchmark compares full and surface-only public calls at changing fractional
widths. It reports the median of five runs after warmup; it measures geometry
computation, not browser layout or painting. The tests retain independent native
fixtures and verify offsets and identical surface-only output.

## Profile and provenance

Extracted from Fleet commit `32138d9e2e21568eb930efb2ea79c5dc07904c39`, directory
`agent-tools/packages/continuous-capsule`. The extracted runtime source matches
Tab Out's original 0.1.0 tarball from Fleet commit
`dfa5cab9e1e3487d0880150a8c7ed9e3f3c56edf`. Version 0.1.1 adds surface-only
calculation; the measured profile and full default output remain unchanged.
Future changes for this standalone package belong here. The Fleet source is
retained in its original checkout; this extraction does not migrate other Fleet
consumers. Subvocab's original demo is historical provenance, not a dependency.

The retained profile is `swiftui-macos-27.0-26A428`, measured on 2026-09-24.
The [research record](docs/research.md) describes evidence and limits. The
calculated focus offset and consumer material are not verified native UI matches.

Normal tests use retained fixtures and need neither macOS nor Swift. To
investigate a different OS profile, run on that Mac:

```sh
swift scripts/export-native.swift > /tmp/apple-capsules-candidate.json
swift scripts/export-native.swift --compact > /tmp/apple-compact-capsules-candidate.json
```

Compare candidates with `tests/fixtures/` before adopting them. Intentional
profile updates replace the fixtures, run `pnpm generate:profile`, update
`profileId` in JavaScript/declarations and its test, and rerun tests. Record the
OS/build, research, and package version when the adopted shape changes.

## Consume from another repository

For development, add this checkout by absolute path with pnpm. For a portable
pinned dependency, run `pnpm pack` here and retain the resulting tarball in the
consumer's artifact storage. Install it with `pnpm add ./path/to/package.tgz`.
Record its version, source provenance, and checksum in the consumer.

The tarball includes runtime source, declarations, and documentation. Native
fixtures and the Swift exporter stay in this repository for maintenance.

## Continuous rectangles (0.2.0)

`createContinuousRectangleGeometry({ width, height, radius, ...options })` uses
SwiftUI continuous rounded-rectangle geometry. It shares the capsule border,
focus, surface-only options and return shape, but supports all positive aspect
ratios. Radius is measured on the inset stroke centerline and clamps to half its
shortest dimension. Zero radius produces a rectangle with a square focus ring
that preserves the requested clear gap at its sides and corners. Existing capsule
output is unchanged. Curved focus rings use an approximate parallel offset;
neither focus treatment is an exported native focus effect.

The generator matches 561 independent native holdouts within 0.0002 CSS pixels
per control point on macOS 27.0 build 26A428. This pins one SwiftUI profile;
it does not promise every Apple control or future OS has this contour.
