# Apple continuous capsule: geometry research

Retained from the Subvocab experiment through Fleet and now maintained in this repository. File paths
below are relative to this package. References to the demo describe that original
experiment; reproducing the geometry checks requires only this package.

Checked 2026-09-24. This note separates Apple's documented APIs, observable output, and independent approximations. The supplied screenshots do not establish which Apple framework or shape generated their outlines.

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

The web adapter scales coordinates with height and anchors each end to its corresponding side, preserving the straight center. It was compared against nine independent native exports (including 214×30, 76×38, 160×48, and their border insets). Maximum control-point discrepancy was approximately `3.55e-15` pixels, before SVG serialization to nine decimal places. All nine native continuous-capsule paths matched the half-height continuous rounded rectangle. Run `node --test tests/*.test.js` to repeat this comparison. The adapter intentionally rejects aspect ratios below 1.6, outside the demonstrated wide-capsule use case; do not stretch this profile into circles or narrow rectangles.

Each cubic is calculated as `B(t) = (1−t)^3 P0 + 3(1−t)^2 t P1 + 3(1−t)t^2 P2 + t^3 P3`, for `0 ≤ t ≤ 1`. The SVG `C` command takes P1, P2, P3; P0 is the previous segment's endpoint. The browser performs that calculation directly from the measured control points. The highlighted joins in the demo separate shoulder, middle, and tip segments; they are segments of a single boundary, not stacked filled outlines.

### Compact-badge investigation

The reported “3 closed” badge was reproduced at 60.703125 × 22 CSS pixels
with no border. A fresh native export on macOS 27.0, build 26A428, matches
Fleet's control points at this size within `1.78e-15` pixels. Nine additional
compact samples cover the 1 px border inset, heights from 16 to 24, and aspect
ratios down to the supported 1.6 boundary. All match the retained profile and
the half-height continuous rounded rectangle.

These independent exports live in `tests/fixtures/apple-compact-capsules.json`.
Reproduce them with `swift scripts/export-native.swift --compact`; the geometry
tests compare both the internal coordinates and the public serialized surface,
and check focus offsets against the native boundaries. The runtime profile is
still generated only from the original fixture.

This rules out a size-dependent geometry error for these inputs. The native
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

## Recommended evidence hierarchy

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
