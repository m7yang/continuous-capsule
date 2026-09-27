# Continuous capsule

This repository owns the dependency-free geometry package. Consumer applications
own rendering, observation, interaction, and theme behavior.

- Read [README.md](README.md) for the public interface and packaging workflow.
- Before changing the profile or offset algorithm, read [the research record](docs/research.md).
  Preserve native fixtures and provenance; regenerate `src/profile.js` through
  `scripts/generate-profile.mjs` when intentionally adopting a new profile.
- Before changing path serialization or curve subdivision, read
  [the browser serialization evidence](docs/research.md#browser-serialization).
- Geometry changes require `pnpm test`. Performance changes also require
  `pnpm benchmark`; distinguish geometry timings from browser performance.
- Keep runtime JavaScript and `src/index.d.ts` consistent. Default calls retain
  the surface, focus path, and inset; surface-only calls omit `focusPath`.
- Consumer paint, path serialization, and curve subdivision changes require
  the affected consumer's browser checks. Geometry tests alone do not establish
  visual equivalence.
