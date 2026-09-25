import { appleCapsulePath } from './native-capsule.js';
import { offsetFocusPath } from './focus-offset.js';

export const profileId = 'swiftui-macos-27.0-26A428';

/**
 * Return paths in CSS pixels, or null when a CSS fallback is needed.
 * Translate paths by inset; paint them with the requested stroke widths.
 * Set includeFocus to false to omit the offset calculation and focusPath.
 * @param {import('./index.js').CapsuleOptions<boolean>} options
 * @returns {import('./index.js').CapsuleSurfaceGeometry | import('./index.js').CapsuleGeometry | null}
 */
export function createCapsuleGeometry({
  width,
  height,
  borderWidth = 1,
  focusGap = 4,
  focusWidth = 2,
  includeFocus = true,
}) {
  if (
    ![width, height, borderWidth, focusGap, focusWidth].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    borderWidth < 0 ||
    focusGap < 0 ||
    focusWidth <= 0
  )
    return null;

  const pathWidth = width - borderWidth;
  const pathHeight = height - borderWidth;
  if (pathWidth <= 0 || pathHeight <= 0 || pathWidth / pathHeight < 1.6) return null;

  const inset = borderWidth / 2;
  const surfacePath = appleCapsulePath(pathWidth, pathHeight);
  if (!includeFocus) return { surfacePath, inset };
  const focusPath = offsetFocusPath(surfacePath, inset + focusGap + focusWidth / 2);
  return { surfacePath, focusPath, inset };
}
