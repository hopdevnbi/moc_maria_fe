/**
 * Mobile keyboards can shrink the visual viewport (Safari / most browsers),
 * the layout viewport (resizes-content), or overlay both (Android PWA).
 * Return the actual unobstructed height for the fixed chat shell.
 */
export function chatViewportGeometry({
  viewportHeight,
  viewportTop,
  layoutHeight,
  restingHeight,
  keyboardTop,
  keyboardHeight = 0,
  focused,
}: {
  viewportHeight: number;
  viewportTop: number;
  layoutHeight: number;
  restingHeight: number;
  keyboardTop?: number;
  keyboardHeight?: number;
  focused: boolean;
}): { height: number; top: number; keyboardOpen: boolean } {
  const top = Math.max(0, Number.isFinite(viewportTop) ? viewportTop : 0);
  const sourceHeight = viewportHeight > 0 ? viewportHeight : layoutHeight;
  let height = Math.max(1, sourceHeight);
  if (
    focused &&
    keyboardHeight > 0 &&
    typeof keyboardTop === "number" &&
    Number.isFinite(keyboardTop)
  ) {
    height = Math.min(height, Math.max(1, keyboardTop - top));
  }
  const keyboardOpen = focused && (restingHeight - (top + height) > 110 || keyboardHeight > 110);
  return { height: Math.round(height), top: Math.round(top), keyboardOpen };
}
