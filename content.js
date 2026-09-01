(() => {
  'use strict';

  function onSearchResults() {
    return location.pathname.startsWith('/search');
  }

  function clickedSearchResultPhoto(event) {
    const path = event.composedPath ? event.composedPath() : [];
    for (const node of path) {
      if (!(node instanceof Element)) continue;

      // Grid tiles in search results are anchors pointing at the photo route,
      // e.g. href="./photo/AF1Qip...". UI icons never carry that href, so this
      // keeps avatars and toolbar buttons from triggering fullscreen.
      if (node.tagName === 'A' && (node.getAttribute('href') || '').includes('/photo/')) {
        return true;
      }

      // Stop climbing once we leave the results grid.
      if (node.tagName === 'BODY') break;
    }
    return false;
  }

  document.addEventListener(
    'click',
    (event) => {
      if (document.fullscreenElement) return;
      if (!onSearchResults()) return;
      if (!clickedSearchResultPhoto(event)) return;

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
