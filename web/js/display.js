// Places the game fullscreen on the projector display automatically, using
// the Window Management API (Chrome) instead of relying on the operator
// manually dragging the browser window onto the second display first (which
// is fragile: mirrored displays, "separate Spaces per display" being off,
// or the window not being fully on the target display all break the old
// drag-then-fullscreen flow).
export async function requestFullscreenOnProjector() {
  const el = document.documentElement;

  if (window.getScreenDetails) {
    try {
      const details = await window.getScreenDetails();
      const target = details.screens.find((s) => !s.isPrimary) || details.currentScreen;
      await el.requestFullscreen({ screen: target });
      return;
    } catch (e) {
      console.warn('Window Management API unavailable or denied, falling back to manual fullscreen.', e);
    }
  }

  // Fallback: fullscreens on whichever display the window currently is on.
  // The operator must have already dragged the window there.
  await el.requestFullscreen();
}
