import { performance } from 'node:perf_hooks';
import { createCapsuleGeometry } from '../src/index.js';

// Compare the public modes with changing fractional widths and no cache.
// Geometry only: this does not measure browser layout or painting.
let consumed = 0;
function measure(width, height, includeFocus) {
  const run = (count) => {
    const start = performance.now();
    for (let i = 0; i < count; i++) {
      const geometry = createCapsuleGeometry({ width: width + (i % 10) / 10, height, includeFocus });
      consumed += geometry.surfacePath.length + (geometry.focusPath?.length ?? 0);
    }
    return (performance.now() - start) / count;
  };
  run(1000);
  return Array.from({ length: 5 }, () => run(5000)).sort((a, b) => a - b)[2];
}

for (const [width, height] of [[80, 20], [136, 24], [280, 34]]) {
  const full = measure(width, height, true);
  const surface = measure(width, height, false);
  console.log(`${width}×${height}: full ${full.toFixed(4)} ms, surface ${surface.toFixed(4)} ms, ${(full / surface).toFixed(1)}×`);
}
if (!consumed) throw new Error('No geometry measured');
