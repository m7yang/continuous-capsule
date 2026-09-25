# Continuous capsules in React

Read when implementing the React adapter selected by the
[continuous capsule workflow](continuous-capsules.md#adoption-workflow).
Follow that guide for shared geometry, focus, and verification requirements.
This reference contains the React-specific example and lifecycle guidance.

## Fixed-size button

This fixed-size button example consumes the geometry package. It demonstrates
an app-owned adapter; the package itself has no React dependency:

```tsx
import { useMemo, type ComponentPropsWithoutRef } from "react";
import { createCapsuleGeometry } from "@fleet/continuous-capsule";

type Props = ComponentPropsWithoutRef<"button"> & {
  width: number;
  height: number;
};

export function CapsuleButton({
  width, height, children, className = "", style, type = "button", ...props
}: Props) {
  const geometry = useMemo(() => createCapsuleGeometry({ width, height }), [width, height]);
  return (
    <button {...props} type={type}
      className={`capsule-button ${className}`}
      data-capsule-ready={geometry ? "true" : undefined}
      style={{ ...style, width, height }}>
      {geometry && (
        <svg className="capsule-paint" width={width} height={height}
          viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
          <g transform={`translate(${geometry.inset} ${geometry.inset})`}>
            <path className="capsule-surface" d={geometry.surfacePath} strokeWidth={1} />
            <path className="capsule-focus" d={geometry.focusPath}
              fill="none" strokeWidth={2} strokeLinejoin="round" />
          </g>
        </svg>
      )}
      <span className="capsule-content">{children}</span>
    </button>
  );
}
```

```css
.capsule-button {
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
  overflow: visible;
  appearance: none;
  border: 0;
  border-radius: 9999px;
  background: var(--capsule-fill, ButtonFace);
  color: var(--capsule-text, ButtonText);
  font: inherit;
  padding: 0 16px;
}
.capsule-button:focus-visible {
  outline: 2px solid var(--capsule-focus, Highlight);
  outline-offset: 4px;
}
.capsule-button[data-capsule-ready="true"] { background: transparent; }
.capsule-button[data-capsule-ready="true"]:focus-visible { outline: none; }
.capsule-paint {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}
.capsule-content { position: relative; }
.capsule-surface {
  fill: var(--capsule-fill, ButtonFace);
  stroke: var(--capsule-border, ButtonText);
}
.capsule-focus { stroke: var(--capsule-focus, Highlight); visibility: hidden; }
.capsule-button:focus-visible > .capsule-paint .capsule-focus { visibility: visible; }
@media (forced-colors: active) {
  .capsule-surface { fill: ButtonFace; stroke: ButtonText; forced-color-adjust: none; }
  .capsule-focus { stroke: Highlight; forced-color-adjust: none; }
}
```

Use `<CapsuleButton width={120} height={32}>Save</CapsuleButton>`. The fallback
retains a focus outline when geometry is unavailable. Forward the control ref
using the target project's React version and primitive contract when adapting
this example. The theme owns disabled, hover, pressed, error, and contrast rules.
CSS overrides that alter the rendered dimensions need corresponding geometry
updates; this fixed-size example does not observe those overrides.

## Measurement and server rendering

For content-sized controls, apply the shared
[measurement rules](continuous-capsules.md#layout-and-rendering) through a
React effect, then use the measured dimensions as geometry inputs.

For a client-measured React component, initially render the ordinary CSS capsule
on both server and client. Attach the observer in an effect and enable SVG after
a valid measurement. Effects run only on the client and require cleanup;
see [React useEffect](https://react.dev/reference/react/useEffect). Known explicit
dimensions can generate deterministic SVG during server rendering. In Subvocab's
Next.js app, place hook-based adapters behind the appropriate client boundary.

Simple solid fills need no IDs. If adding gradients, masks, or clip paths, give
each instance unique IDs; React's [useId](https://react.dev/reference/react/useId)
supports matching server/client trees. Keep IDs out of geometry cache keys.
