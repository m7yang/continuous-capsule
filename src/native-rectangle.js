// Reconstructed from SwiftUI macOS 27.0 (26A428); see docs/research.md.
export function rectanglePathGeometry({ width, height, radius }) {
  if (![width, height, radius].every(Number.isFinite) || width <= 0 || height <= 0 || radius < 0) return null;
  const r = Math.min(radius, width / 2, height / 2);
  const commands = r === 0
    ? [{ type: 'M', points: [0, 0] }, { type: 'L', points: [width, 0] }, { type: 'L', points: [width, height] }, { type: 'L', points: [0, height] }]
    : [{ type: 'M', points: [width, height / 2] }];
  // Native coefficients are float32 values, then multiplied by a CGFloat radius.
  const full = Math.fround(1.528665);
  const a = Math.fround(0.0749114), b = Math.fround(0.631494);
  const c = Math.fround(0.16906), d = Math.fround(0.372824);
  // Each axis compresses independently. Endpoints measured at full extension
  // and half-size interpolate the two tangent handles; the middle stays fixed.
  // Float64 interpolation differs from native rounding by <0.0001px in holdouts.
  function shoulder(side) {
    const extent = Math.min(full, side / (2 * r));
    const t = (extent - 1) / (full - 1);
    return [extent, Math.fround(0.96) + t * (Math.fround(1.08849) - Math.fround(0.96)), Math.fround(0.82) + t * (Math.fround(0.868407) - Math.fround(0.82))];
  }
  const x = r > 0 ? shoulder(width) : [], y = r > 0 ? shoulder(height) : [];
  function corner(horizontal, vertical, transform) {
    const [ex, x1, x2] = horizontal, [ey, y1, y2] = vertical;
    const parts = [
      ['L', [0, ey]],
      ['C', [0, y1, 0, y2, a, b]],
      ['C', [c, d, d, c, b, a]],
      ['C', [x2, 0, x1, 0, ex, 0]],
    ];
    for (const [type, values] of parts) {
      const points = [];
      for (let i = 0; i < values.length; i += 2) points.push(...transform(values[i] * r, values[i + 1] * r));
      commands.push({ type, points });
    }
  }
  if (r > 0) {
    corner(x, y, (x, y) => [width - x, height - y]);
    corner(y, x, (x, y) => [y, height - x]);
    corner(x, y, (x, y) => [x, y]);
    corner(y, x, (x, y) => [width - y, x]);
  }
  commands.push({ type: 'Z', points: [] });
  return { surfacePath: commands.map(({ type, points }) => `${type} ${points.join(' ')}`).join(' '), commands };
}
