# Continuous capsule

Dependency-free ESM geometry for continuous capsules and rounded rectangles,
usable in browsers and Node without React or a DOM. Capsule geometry is fitted
to a SwiftUI native render. The package is not yet published to npm.

```js
import { createCapsuleGeometry } from 'continuous-capsule';

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
computation, not browser layout or painting. The tests retain the frozen fit and independent native rectangle fixtures, and
verify offsets and identical surface-only output. Original capsule exports remain
as historical evidence; fitted capsules intentionally differ from those commands.

## Profile and provenance

This repository maintains the geometry, native fixtures, and profile generators.
The [extraction history](docs/research.md#extraction-history) records the package's origins.

Version 0.3.0 adopts `swiftui-macos-27.0-26A428-render-fit-v1`, calibrated on
2026-09-26 against one 332×150 native filled capsule at 16×. The original
2026-09-24 exported-command fixtures are retained unchanged. Rectangles still
use their original exported-command generator.
The [research record](docs/research.md) describes evidence and limits. The
calculated focus offset and consumer material are not verified native UI matches.

Normal tests use retained fixtures and need neither macOS nor Swift. To
investigate a different OS profile, run on that Mac:

```sh
swift scripts/export-native.swift > /tmp/apple-capsules-candidate.json
swift scripts/export-native.swift --compact > /tmp/apple-compact-capsules-candidate.json
```

Compare candidates with `tests/fixtures/` before adopting them. Native command
equality does not establish equality with native rendered silhouettes. For the
current capsule fit, `pnpm generate:profile` expands the frozen quarter curves in
`tests/fixtures/capsule-fit-profile.json`; it does not refit or overwrite native
exports. The [research record](docs/research.md#native-render-fit--2026-09-26)
contains fitting and native-render reproduction commands. Intentional future
profile changes must update provenance, `profileId` in JavaScript/declarations
and its test, and the package version, then rerun geometry and consumer checks.

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
that preserves the requested clear gap at its sides and corners. The 0.2.0 release left capsule
output unchanged; 0.3.0 adopts the render fit described above. Curved focus rings use an approximate parallel offset;
neither focus treatment is an exported native focus effect.

The generator matches 561 independent native holdouts within 0.0002 CSS pixels
per control point on macOS 27.0 build 26A428. This pins one SwiftUI profile;
it does not promise every Apple control or future OS has this contour.

## Native-render fit (0.3.0)

All eight held-out sizes improve in 16× native captures; seven improve at 2×.
The 300×26.25 reference improves from 0.0521px to 0.0125px at 16×. The 180×24
case worsens from 0.0906px to 0.1082px at 2×. These are sampled raster-boundary
support errors in SwiftUI, not browser-pixel guarantees or universal bounds.
The fit has aligned segment tangents (G1), not proven continuous curvature (G2).
The API, aspect-ratio limit, border inset, and focus-offset algorithm are unchanged.

The generated profile subdivides each fitted cubic exactly in half (24 runtime
cubics) for consistent CSS/SVG paint at fractional positions. This changes the
representation, not the fitted curve; no subdivision runs in the browser.
