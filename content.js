(() => {
  'use strict';

  function clickedPhoto(event) {
    const path = event.composedPath ? event.composedPath() : [];
    for (const node of path) {
      if (!(node instanceof Element)) continue;

      // Google Photos thumbnails and opened photos are normally rendered as <img>.
      if (node.tagName === 'IMG') return true;

      // Some Photos layouts wrap an image inside a clickable tile.
      if (
        (node.matches('a, button, [role="button"], [role="link"]')) &&
        node.querySelector?.('img')
      ) {
        return true;
      }
    }
    return false;
  }

  document.addEventListener(
    'click',
    (event) => {
      if (document.fullscreenElement) return;
      if (!clickedPhoto(event)) return;

      // This runs directly from the user's click, which satisfies the browser's
      // user-activation requirement for the Fullscreen API.
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
        // If Chrome rejects fullscreen for any reason, leave Google Photos'
        // normal click behavior untouched.
      });
    },
    true
  );
})();
