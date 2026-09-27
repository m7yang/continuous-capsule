# Apple continuous capsule: geometry research

Retained from the Subvocab experiment through Fleet and now maintained in this repository. File paths
below are relative to this package. References to the demo describe that original
experiment; reproducing the geometry checks requires only this package.

Checked 2026-09-24. This note separates Apple's documented APIs, observable output, and independent approximations. The supplied screenshots do not establish which Apple framework or shape generated their outlines.

## Extraction history

Extracted from Fleet commit `32138d9e2e21568eb930efb2ea79c5dc07904c39`, directory
`agent-tools/packages/continuous-capsule`. The extracted runtime source matches
Tab Out's original 0.1.0 tarball from Fleet commit
`dfa5cab9e1e3487d0880150a8c7ed9e3f3c56edf`. Version 0.1.1 added surface-only
calculation while preserving the measured profile and full default output.
Future changes for this standalone package belong here. The extraction left
the original Fleet checkout and its consumers in place. Subvocab's original
demo is historical provenance, not a dependency. These commits identify the
original source snapshots; neither checkout is needed to use or test this package.

## What Apple documents

- `Capsule` is equivalent to a rounded rectangle whose radius is half its shortest dimension. Its initializer defaults to `.continuous`. Apple describes that style in terms of continuous curvature, but the documentation does not publish control-point coefficients. [Capsule](https://developer.apple.com/documentation/swiftui/capsule), [initializer](<https://developer.apple.com/documentation/swiftui/capsule/init(style:)>), [continuous style](https://developer.apple.com/documentation/swiftui/roundedcornerstyle/continuous)
- `Shape.path(in:)` returns a shape's path in a supplied rectangle, and `Path.forEach` enumerates its elements. Therefore, a native SwiftUI program can export the actual path commands for a particular OS version and rectangle, without inferring them from a screenshot. This measures the public shape's output; it does not reveal the underlying source code or guarantee that every system control uses that shape. [Shape.path(in:)](<https://developer.apple.com/documentation/swiftui/shape/path(in:)>), [Path.forEach](<https://developer.apple.com/documentation/swiftui/path/foreach(_:)>)
- Core Animation also exposes `CALayerCornerCurve.continuous`. Its public API documentation alone does not establish equality with SwiftUI or the exact outline of a particular toolbar. [Core Animation API](https://developer.apple.com/documentation/quartzcore/calayercornercurve/continuous)

For a native reference, compare `Capsule(style: .continuous)` and `RoundedRectangle(cornerRadius: min(width, height) / 2, style: .continuous)` at the exact same bounds, plus the circular capsule. Retain the OS version and exported segments with the reference. Apple's semantic description motivates this comparison; verify numerical equality instead of assuming it across implementations or releases.

### Native observation in the original experiment

On macOS 27.0, build 26A428, the public SwiftUI API successfully exported a 214 × 30 continuous capsule. It contained twelve cubic Bézier segments (three per quarter), together with straight segments. Its exported path matched `RoundedRectangle(cornerRadius: 15, style: .continuous)` at those same bounds. The upper-left portion began at `(22.92997419834137, 0)` and used these three segments:

```text
C 16.32735013961792 0 13.026105165481567 0 9.472409784793854 1.1236710101366043
C 5.592360198497772 2.5359001010656357 2.5359001010656357 5.592360198497772 1.1236710101366043 9.472409784793854
C 0 12.29999989271164 0 14.399999678134918 0 15
```

These are observed framework output, not fitted coefficients. This provides a stronger reference than an independently tuned squircle. It does not establish that the screenshot's specific native control uses the same path. The retained exporter is `scripts/export-native.swift`; exported fixtures are `tests/fixtures/apple-capsules.json`.

The original web adapter scaled coordinates with height and anchored each end to its corresponding side, preserving the straight center. It was compared against nine independent native exports (including 214×30, 76×38, 160×48, and their border insets). Maximum control-point discrepancy was approximately `3.55e-15` pixels, before SVG serialization to nine decimal places. All nine native continuous-capsule paths matched the half-height continuous rounded rectangle. These are historical command comparisons; current tests verify the frozen fitted prototype described in the [native-render fit procedure](#native-render-fit--2026-09-26). The supported aspect-ratio minimum remains 1.6.

Each cubic is calculated as `B(t) = (1−t)^3 P0 + 3(1−t)^2 t P1 + 3(1−t)t^2 P2 + t^3 P3`, for `0 ≤ t ≤ 1`. The SVG `C` command takes P1, P2, P3; P0 is the previous segment's endpoint. The browser performs that calculation directly from the measured control points. The highlighted joins in the demo separate shoulder, middle, and tip segments; they are segments of a single boundary, not stacked filled outlines.

### Compact-badge investigation (original profile)

The reported “3 closed” badge was reproduced at 60.703125 × 22 CSS pixels
with no border. A fresh native export on macOS 27.0, build 26A428, matched
Fleet's original control points at this size within `1.78e-15` pixels. Nine additional
compact samples cover the 1 px border inset, heights from 16 to 24, and aspect
ratios down to the supported 1.6 boundary. All matched the original profile and
the half-height continuous rounded rectangle.

These independent exports live in `tests/fixtures/apple-compact-capsules.json`.
Re-export candidates with `swift scripts/export-native.swift --compact` on the
recorded OS. At the time, tests compared internal coordinates, serialized surfaces,
and focus clearance against native exports, and the generator used the original
fixture. Current generation uses `capsule-fit-profile.json`; capsule tests compare
curves and focus clearance against the frozen fitted prototype. See the
[native-render fit procedure](#native-render-fit--2026-09-26) for current reproduction commands.

Those comparisons ruled out a size-dependent command mismatch for the original profile at these sizes. The native
continuous contour itself has flat top/bottom runs and shallow shoulders; their
appearance alone does not establish clipping. Native path agreement does not
rule out clipping or rasterization differences in a consumer. Preserve the
measured profile when investigating those rendering differences.

In a Chromium 153 fixture, a borderless `border-shape: path(...)` fill at a
fractional vertical position loses pixels at the flat top/bottom boundary. A
60.703125 × 22 badge at `top: 20.5px`, tested at device scale 3, differs from an
unclipped SVG reference by up to 255 channel levels with a black fill. Moving
it to an integer position reduces the difference to ordinary antialiasing.
The reference SVG must have its viewport at an integer origin and translate
its path to the badge; a fractionally positioned SVG viewport introduces a
separate alignment difference and is not a reliable reference.

Giving the fill a 1 px paint margin removes the rectangular crop: keep the
native contour, enlarge only its paint box by 1 px on each side, and
translate the path coordinates by `(1, 1)` within that box. The minimized case
then differs by at most 6 channel levels. This is a consumer painting workaround,
not a profile change. Tab Out applies it to its borderless count badge through
a pseudo-element that uses the same fill color token. Borders, shadows, dimensions,
and interaction remain with the original element. Bordered controls need their
own inset/background verification before adopting this treatment.

For clipping investigations, run Tab Out's retained
[browser regression](https://github.com/m7yang/tab-out/blob/f13fa5cac9597108813f40da29dec87a6982fbbf/tests/browser/capsule-crop.spec.ts).
From a configured Tab Out checkout containing that test, with dependencies and
Playwright Chromium installed:

```sh
mise exec -- pnpm build
mise exec -- pnpm test:browser:all tests/browser/capsule-crop.spec.ts
```

The test starts its fixture server and compares the real badge against an SVG
reference at display scales 1, 2, and 3 and four fractional offsets. All three
cases must pass; actual/reference screenshots are saved in Playwright's test
output. The test owns the current offsets and pixel tolerance; the 255/6 figures
above record the earlier minimized experiment.

This observation is consistent with Chromium's background painter using a
pixel-snapped background rectangle before clipping it to the shape
([painter source](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/paint/box_painter_base.cc)).
The original user screenshot's exact layout position is unknown; the fixture
establishes a reproducible crop mechanism, not a measurement of that screenshot.

## Newer system controls and Liquid Glass

Apple's WWDC25 design talk describes capsules as using half the container height. It distinguishes macOS Mini/Small/Medium rounded-rectangle controls from Large and X-Large capsules, and discusses concentric shapes whose radius follows their container. Thus “Apple capsule” is not sufficient to identify every system control's geometry. [Get to know the new design system, Design Language chapter](https://developer.apple.com/videos/play/wwdc2025/356/?time=126)

SwiftUI's glass effect defaults to a capsule, but callers can supply another shape. Liquid Glass additionally includes adaptive shading, refraction, reflection, and interaction effects. A perceived edge in a raster screenshot can include that material, an inset highlight, and a shadow. First compare silhouettes; then match those surface layers separately. The shape/material separation is an implementation recommendation, rather than an assertion about private Apple rendering internals. [Build a SwiftUI app with the new design](https://developer.apple.com/videos/play/wwdc2025/323/), [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)

## Joined curves versus overlapping layers

A precise silhouette should be one closed path assembled from multiple segments. At a join, matching position avoids a gap, matching tangent avoids a kink, and matching curvature avoids a sudden change in bending. Separate overlapping filled shapes do not generally satisfy these conditions: their visible boundary switches from one constituent outline to another. Blurring that union alters the silhouette further.

Layers remain useful for border, inner highlight, gradient, and shadow once the outline is correct. They are not a substitute for calculating the boundary.

An independent construction is:

`straight → cubic shoulder → circular end arc → cubic shoulder → straight`

This keeps a circular outer tip while smoothing the transition into the long straight edges. It avoids turning the whole capsule into a superellipse, which also changes the end profile. More Bézier segments can approximate a measured native outline to a chosen error tolerance, but merely adding more layers or segments does not improve accuracy without a reference and error metric.

## Useful independent implementations

[Kyant0/Capsule](https://github.com/Kyant0/Capsule) implements joined cubic Béziers and circular arcs, with separate profiles for rounded rectangles and capsules. In the inspected commit, the capsule extension is `0.5286651 × 0.75` and its `arcFraction` is zero. That zero removes the arc within the generic quarter-corner scheme; the dedicated horizontal capsule still retains a circular arc around each end. This is useful executable evidence for a smooth capsule construction, **not Apple source code or evidence of Apple's exact coefficients**. Its README also conditions exact G2 continuity on matching the Bézier and arc curvature scales; avoid assuming all interpolated/custom settings meet that condition. [Profile source](https://github.com/Kyant0/Capsule/blob/830975a0515e94444c59cf5dccaf35909a1c0f50/capsule/src/main/java/com/kyant/capsule/continuities/G2ContinuityProfile.kt), [path construction](https://github.com/Kyant0/Capsule/blob/830975a0515e94444c59cf5dccaf35909a1c0f50/capsule/src/main/java/com/kyant/capsule/continuities/G2Continuity.kt)

Figma's engineering article explains its own smooth-corner construction and documents why a superellipse was insufficient for reproducing the historical iOS icon outline. It also notes aspect-ratio-dependent behavior in the historical Apple formula and uses piecewise Bézier geometry. This supports treating corner smoothing as a piecewise-curve problem, but a 2018 icon analysis cannot establish the exact outline of a current macOS capsule. [Desperately seeking squircles](https://www.figma.com/blog/desperately-seeking-squircles/)

## Original evidence hierarchy (superseded by the render check below)

1. Export native SwiftUI paths and compare bounds and aspect ratios numerically.
2. Show that native reference beside the screenshots at their actual size and enlarged.
3. If the target control differs, capture a clean native control from the intended OS, then fit its outline with joined segments. Report the residual rather than calling the fit exact.
4. Recreate surface layers only after the silhouette matches. Reuse the same geometry for fill, stroke, clipping, and appropriate inset paths.

The original screenshots alone are too small to recover unique control points: antialiasing, stroke width, and shading can move the apparent boundary by an appreciable fraction of a pixel.

## Web focus-offset implementation

The focus ring uses a numerical parallel curve, not an exported native focus
shape. For a clockwise boundary in screen coordinates, evaluate each cubic's
position `B(t)` and derivative `(dx, dy)`, then add an outward displacement
`distance * (dy, -dx) / hypot(dx, dy)`. The
[offset helper](../src/focus-offset.js) owns the sampling algorithm; the
[public implementation](../src/index.js) combines the painted border extent,
clear gap, and half the focus stroke into that distance.

The source-curve sampling bound is not a universal offset-error guarantee for
arbitrary paths or very large offsets. Validate the dimensions and focus tokens
adopted by a consumer with the retained geometry checks.

In the original demo, browser `getPointAtLength` sampling took roughly 640 ms for
two rings per update; direct calculation took about 1.2 ms combined on the same
machine. These are local observations, not a performance promise. The core
retains no cache; adapters own memoization for their dimensions and tokens.

## Continuous rectangle generator — 2026-09-26

Version 0.2.0 adds independent horizontal/vertical shoulder compression derived
from 32 public SwiftUI RoundedRectangle path exports. Its float32 coefficients
and float64 interpolation match 561 fresh native holdouts (including portraits,
near squares, tiny sizes, radius clamping and transition boundaries) with maximum
corresponding control-point distance 0.000092908604 CSS pixels; bound 0.0002.
Tests retain the native corpus, not paths generated by the implementation.
Reproduce with `swift scripts/export-rectangles.swift --validation` on the pinned
macOS 27.0 (26A428) profile. Compare before adopting a different OS. The original
capsule generator and its measured fixtures remain unchanged.

## Native-render fit — 2026-09-26

Version 0.3.0 adopts a fitted silhouette, not the original exported commands.
On macOS 27.0 (26A428), rebuilding the public Capsule path's enumerated commands
as a new SwiftUI Path differs from rendering Capsule itself, even within the
same ImageRenderer. At 16×, the sampled support gap is 0.2732px at 332×150 and
0.0521px at 300×26.25. The untouched native Path matches Capsule at that scale.
The original command-equality checks therefore did not prove native paint fidelity;
this finding supersedes their stronger interpretation earlier in this record.

The retained training PNG is the 332×150 native filled Capsule at 16×, black on
white. `scripts/fit-capsule.py` uses NumPy and Pillow, interpolated 50% crossings
in both axes, and a damped least-squares objective over 361 support directions.
Nine parameters describe three cubics per quarter. Endpoints, horizontal/vertical
axis tangents, and zero extreme curvature stay fixed; neighboring tangents align.
Controls are monotone and bounded. This establishes G1, not G2 continuity.
The coefficients were frozen before inspecting the eight holdout sizes; none
were retuned against the regression. Fitting is offline, never in the browser.

`tests/fixtures/capsule-fit-profile.json` records parameters and training residuals;
`capsule-fit-cases.json` retains the prototype's baseline/fitted commands;
`capsule-fit-report.json` records all eighteen native comparisons at 2× and 16×.
Original public native exports remain in `apple-capsules.json` and
`apple-compact-capsules.json`. The generated runtime profile uses the existing
height scaling and end anchoring; the public API and offset algorithm are unchanged.

All eight holdouts improve at 16×, seven at 2×. The 300×26.25 reference improves
0.0521→0.0110px at 16× and 0.1485→0.0538px at 2×. The synthetic 180×24 case
regresses 0.0906→0.1082px at 2× while improving 0.0473→0.0099px at 16×.
Low-resolution antialiasing and pixel alignment may contribute, but the cause
has not been isolated. Do not claim improvement at every scale or an end-vertex
fix. The metric is a raster-derived estimate at 721 normal directions, not a
proven geometric bound. Focus rings and browser pixels are not native matches.

Reproduce the fit with Python plus NumPy/Pillow (not runtime dependencies):

```sh
OPENBLAS_NUM_THREADS=1 python3 scripts/fit-capsule.py
pnpm generate:profile
pnpm test
```

To compare the current runtime against native paint on the recorded OS, write
captures to a separate output directory (the Swift script requires macOS):

```sh
node scripts/export-fit-cases.mjs /tmp/capsule-fit-validation
swift scripts/capture-capsule-fit.swift /tmp/capsule-fit-validation
```

This uses current runtime commands and retained baseline commands, then renders
both alongside native Capsule in the same ImageRenderer. Inspect the output
report against the retained report; another OS requires a new candidate review.
Consumer integration additionally requires actual browser fill, stroke, focus,
fractional-position and resize verification; native captures cannot replace it.

### Browser serialization

A single 3× edge pixel differed by 64 channel levels between CSS border-shape
and the SVG reference with the original twelve cubics. Increasing the padded
paint margin did not resolve it; absorbing SVG translation into path coordinates
fixed that case but introduced other mismatches. Exact midpoint subdivision of
every cubic passed all 46 existing capsule paint checks without relaxing their
12-level tolerance. This isolates sensitivity to the equivalent curve
representation; it does not establish the browser's internal cause.

The profile generator now bakes two exact halves for each fitted cubic, producing
24 runtime cubics. No refitting, silhouette change, extra renderer or per-size
rule is introduced. Geometry tests compare both runtime and serialized curves
against the original unsplit frozen prototype, and sample focus clearance
against that independent boundary. Native render evidence must also be checked
again because mathematically equivalent paths can rasterize differently.

Rechecking the subdivided runtime preserves the 8/8 high-resolution and 7/8
normal-resolution holdout improvements. Its compact 300×26.25 error is 0.0125px
at 16× (the unsplit prototype was 0.0110px); the 180×24 normal-resolution
regression remains 0.0176px. `tests/fixtures/capsule-runtime-report.json` retains
the post-subdivision results separately from the original prototype report.
