# Continuous capsules for web UI

Read when integrating the measured Apple-style capsule into a web app, adapting
it to another framework, or implementing its focus ring. Consumer design systems choose which controls use capsules and own nested corner spacing.

## Adoption workflow

1. **Select the control.** Identify its existing primitive, dimensions, theme
   tokens, public props, form integration, and event/ref behavior. Proceed with
   those constraints recorded; preserve the control's semantics and behavior.
2. **Install the core.** Follow the package's
   [consumption instructions](../README.md#consume-from-another-repository).
   Use a pinned release, or a local path during development. Record the package
   version and this repository's commit; run the package's
   [geometry checks](../README.md#development).
3. **Add the adapter.** Use the [rendering rules](#layout-and-rendering) below.
   For React, read the [React adapter reference](continuous-capsules-react.md);
   other frameworks use the same core with their own lifecycle and rendering.
   This step is complete when the selected control paints its surface, provides
   the required focus treatment (native outline or generated path) when focusable,
   updates for its actual dimensions, and retains a usable CSS fallback.
4. **Verify the consumer.** Check keyboard focus, disabled state, grouped
   controls, resizing, overflow, supported themes (including forced colors), and
   server hydration where applicable. Run the native fixture and offset checks
   for adopted geometry changes. Profile resizing at the actual control count
   and confirm that surface styling changes do not regenerate paths. Compare
   at ordinary size and 2× display scale in the target browsers.

Integration is complete when the selected control retains its existing behavior,
passes the applicable checks, and remains usable when geometry is unavailable.

## Ownership and API

This repository owns the [canonical package](../README.md),
native fixtures, exporter, tests, and research. Import `continuous-capsule`
and maintain geometry changes here; adapters and themes remain app-owned.

Use the [public declarations](../src/index.d.ts)
for the API and the [implementation](../src/index.js)
for current defaults and validation. The package README explains supported
dimensions and fallback behavior. Keep that contract authoritative rather than
reimplementing its validation in an adapter.

When changing the measured profile, follow the package's
[regeneration procedure](../README.md#profile-and-provenance).
When evaluating native equivalence or changing the offset algorithm, read the
[research record](research.md). The measured
SwiftUI silhouette is distinct from our calculated focus ring and approximate
material; a complete native-control or Liquid Glass match remains unverified.

## Layout and rendering

Use CSS pixels and the actual control box. Keep the SVG coordinate system equal
to those dimensions: stretching a fixed viewBox horizontally stretches its ends.
Translate both returned paths by the returned inset and paint each with the
same stroke width supplied to the geometry function.

Keep the native HTML control responsible for semantics, keyboard interaction,
events, disabled state, and refs. Render SVG as decoration with `aria-hidden`,
`focusable="false"`, and `pointer-events: none`. Compose with the existing
primitive rather than introducing nested interactive elements.

For content-sized controls, measure the untransformed border box with
[ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver).
Handle hidden/zero-size elements, update only when dimensions change, and
disconnect on unmount. Observe the control rather than its decorative SVG;
geometry updates must not change the measured layout. For server rendering,
use known dimensions or render the same CSS fallback until client measurement.

Do not widen short labels to satisfy the capsule's 1.6 aspect-ratio minimum.
Use the README's [narrow fallback](../README.md#continuous-capsule): the
half-height continuous rectangle at the control's natural size.

Memoize by dimensions, profile, and geometric tokens. Keep shared caches bounded;
text, color, and hover changes require new geometry only if they change dimensions.

## Focus and painted spacing

The focus gap means clear distance between the painted border and painted ring,
not between their path centerlines. Use the returned focus path with a single
stroke. Subtracting independently resized capsules can produce an uneven band.

The returned focus path is offset from the unmodified surface. If the adapter
changes the surface contour, for example with an optical shoulder adjustment,
derive the ring from the painted path instead. With border width `b`, gap `g`,
and ring width `w`, stroke the surface path at `b + 2g + 2w` and mask out the
filled surface plus a `b + 2g` stroke of the same path. Stroke widths offset
every point by the same distance, so the ring stays exactly `g` clear of the
border. Give the mask `maskUnits="userSpaceOnUse"` and a region extending
`b / 2 + g + w` beyond the inset path on every side; the default 10% margin
clips short controls.

Keep the ordinary CSS capsule and focus outline when geometry is unavailable;
suppress the native outline only while its replacement is available.

For a search field, put decoration beside the real input inside a positioned
shell. Keep the input background transparent and preserve its label, ref,
events, selection, and form behavior. A shell's `:focus-within` can expose the
ring. For a multi-button group, retain an indicator of which child has keyboard
focus; the group ring alone cannot convey that.

## Clipping and material

Start with an SVG background and border. Text/icon padding usually avoids the
need to clip content. If imagery or a child background must follow the capsule,
clip a separate inner content layer using the same geometry and coordinate
system. Keep the focus SVG outside it, with room for the ring in surrounding
scroll containers and overflow rules.

Apply shadow to the surface layer alone; shadowing the common SVG/container also
shadows the focus ring. The theme owns gradients, colors, highlights, and
interaction states. A new inset capsule is not necessarily an exact parallel
inset, so describe material approximations accurately. Give per-instance SVG
resources unique IDs when using gradients, masks, or clip paths.

For callers that paint only the surface, pass `includeFocus: false`; the result
omits `focusPath` and skips its offset calculation. Keep the default when painting
an offset ring. Both modes retain identical surface geometry and validation.
