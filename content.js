(() => {
  'use strict';

  const OVERLAY_ID = 'gpc-theatre-overlay';
  const STYLE_ID = 'gpc-theatre-styles';
  const BADGE_ID = 'gpc-version-badge';
  const EXTENSION_VERSION = chrome.runtime.getManifest().version;

  const TILE_SELECTOR = 'div[data-img-wrapper]';

  // Chrome adds update_url to the runtime manifest for store-installed builds,
  // so this is true only when the extension is loaded unpacked. Keeps the
  // version readout available while developing without shipping our own
  // branding into Google's header for end users.
  const SHOW_VERSION_BADGE = !('update_url' in chrome.runtime.getManifest());

  const PRELOAD_COUNT = 20;
  // Enough headroom to keep the rolling window plus what was already passed,
  // so backtracking stays instant without holding on to the whole result set.
  const PRELOAD_CACHE_LIMIT = 60;

  let tiles = [];
  let currentIndex = -1;
  let originalsCache = null;
  let originalsCacheScriptCount = -1;
  const preloadedImages = new Map();

  function onImageSearch() {
    if (location.pathname !== '/search') return false;

    const params = new URLSearchParams(location.search);
    return params.get('udm') === '2' || params.get('tbm') === 'isch';
  }

  function thumbnailToken(url) {
    return (url.match(/tbn:([A-Za-z0-9_-]+)/) || [])[1] || '';
  }

  // Google ships the search results as escaped JS literals shaped like
  // ["<thumbnail url>",h,w],["<original url>",h,w]. The DOM only ever holds the
  // thumbnail, so the full-resolution URL has to come from that payload.
  function buildOriginalsIndex() {
    const scripts = document.querySelectorAll('script');

    if (originalsCache && originalsCacheScriptCount === scripts.length) {
      return originalsCache;
    }

    const text = [...scripts]
      .map((script) => script.textContent || '')
      .join('\n')
      .replace(/\\u003d/g, '=')
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/');

    const byToken = new Map();
    const pairPattern =
      /\["(https:\/\/encrypted-tbn\d\.gstatic\.com\/images[^"]+)",(\d+),(\d+)\],\["(https?:\/\/[^"]+?)",(\d+),(\d+)\]/g;

    for (let match; (match = pairPattern.exec(text)); ) {
      const token = thumbnailToken(match[1]);
      if (token && !byToken.has(token)) {
        byToken.set(token, { url: match[4], height: Number(match[5]), width: Number(match[6]) });
      }
    }

    // Lazy-loaded tiles start with an inline data: URI, so their thumbnail URL
    // has to be recovered from the id -> thumbnail lookup Google also emits.
    const thumbnailById = new Map();
    const idPattern = /"(dimg_[A-Za-z0-9_-]+)":"(https:\/\/encrypted-tbn\d\.gstatic\.com\/images[^"]+)"/g;

    for (let match; (match = idPattern.exec(text)); ) {
      thumbnailById.set(match[1], match[2]);
    }

    originalsCache = { byToken, thumbnailById };
    originalsCacheScriptCount = scripts.length;
    return originalsCache;
  }

  // The link to the hosting page lives on the result card, a few levels above
  // the image wrapper. Stop at the nearest ancestor that has one so we don't
  // pick up a neighbouring result's link.
  function findSourceLink(tile) {
    let node = tile;

    for (let depth = 0; depth < 4 && node; depth += 1) {
      const link = node.querySelector('a[href^="http"]');
      if (link) return link;
      node = node.parentElement;
    }
    return null;
  }

  function describeTile(tile) {
    const img = tile.querySelector('img');
    if (!img) return null;

    const { byToken, thumbnailById } = buildOriginalsIndex();
    const src = img.currentSrc || img.src || '';
    const thumbnailUrl = src.includes('encrypted-tbn') ? src : thumbnailById.get(img.id) || '';
    const original = byToken.get(thumbnailToken(thumbnailUrl));

    const sourceLink = findSourceLink(tile);

    return {
      tile,
      thumbnailUrl: thumbnailUrl || src,
      originalUrl: original?.url || '',
      dimensions: original ? `${original.width} x ${original.height}` : '',
      title: img.getAttribute('alt') || '',
      sourceUrl: sourceLink?.getAttribute('href') || '',
    };
  }

  function collectTiles() {
    return [...document.querySelectorAll(TILE_SELECTOR)].filter((tile) => tile.querySelector('img'));
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.9);
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
      }

      #${OVERLAY_ID} .gpc-stage {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 56px 88px 72px;
        box-sizing: border-box;
      }

      #${OVERLAY_ID} img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        user-select: none;
        transition: opacity 120ms ease;
      }

      #${OVERLAY_ID}.gpc-loading img {
        opacity: 0.25;
      }

      #${OVERLAY_ID} .gpc-spinner {
        position: absolute;
        width: 42px;
        height: 42px;
        border: 3px solid rgba(255, 255, 255, 0.25);
        border-top-color: #8ab4f8;
        border-radius: 50%;
        opacity: 0;
        animation: gpc-spin 800ms linear infinite;
        pointer-events: none;
      }

      #${OVERLAY_ID}.gpc-loading .gpc-spinner {
        opacity: 1;
      }

      @keyframes gpc-spin {
        to { transform: rotate(360deg); }
      }

      #${OVERLAY_ID} .gpc-control {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        cursor: pointer;
        transition: background 120ms ease;
      }

      #${OVERLAY_ID} .gpc-control:hover {
        background: rgba(255, 255, 255, 0.26);
      }

      #${OVERLAY_ID} .gpc-close {
        top: 18px;
        right: 22px;
        width: 42px;
        height: 42px;
        font-size: 26px;
        line-height: 1;
      }

      #${OVERLAY_ID} .gpc-prev,
      #${OVERLAY_ID} .gpc-next {
        top: 50%;
        transform: translateY(-50%);
        width: 52px;
        height: 52px;
        font-size: 30px;
        line-height: 1;
      }

      #${OVERLAY_ID} .gpc-prev { left: 20px; }
      #${OVERLAY_ID} .gpc-next { right: 20px; }

      #${OVERLAY_ID} .gpc-caption {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 0 24px;
        color: rgba(255, 255, 255, 0.72);
        font-size: 12px;
        text-align: center;
      }

      #${OVERLAY_ID} .gpc-caption a {
        color: #8ab4f8;
        text-decoration: none;
        max-width: 46vw;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${OVERLAY_ID} .gpc-caption a:hover {
        text-decoration: underline;
      }

      #${BADGE_ID} {
        position: absolute;
        z-index: 2147483000;
        margin: 0;
        font: 500 10px/1.35 'Google Sans', Roboto, Arial, sans-serif;
        color: #70757a;
        white-space: pre-line;
        pointer-events: none;
        user-select: none;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function getOverlay() {
    return document.getElementById(OVERLAY_ID);
  }

  function closeTheatre() {
    getOverlay()?.remove();
    currentIndex = -1;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function createOverlay() {
    ensureStyles();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    const stage = document.createElement('div');
    stage.className = 'gpc-stage';

    const image = document.createElement('img');
    image.alt = '';
    stage.appendChild(image);

    const spinner = document.createElement('div');
    spinner.className = 'gpc-spinner';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'gpc-control gpc-close';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.textContent = '\u00d7';
    closeButton.addEventListener('click', closeTheatre);

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'gpc-control gpc-prev';
    prevButton.setAttribute('aria-label', 'Previous image');
    prevButton.textContent = '\u2039';
    prevButton.addEventListener('click', () => movePhoto(-1));

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'gpc-control gpc-next';
    nextButton.setAttribute('aria-label', 'Next image');
    nextButton.textContent = '\u203a';
    nextButton.addEventListener('click', () => movePhoto(1));

    const caption = document.createElement('div');
    caption.className = 'gpc-caption';

    overlay.append(stage, spinner, closeButton, prevButton, nextButton, caption);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target === stage) closeTheatre();
    });

    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function bestUrlFor(tile) {
    const details = describeTile(tile);
    if (!details) return '';
    return details.originalUrl || details.thumbnailUrl;
  }

  function preloadUrl(url) {
    if (!url || preloadedImages.has(url)) return;

    const image = new Image();
    image.decoding = 'async';
    // Keep these behind whatever the overlay is currently fetching.
    image.fetchPriority = 'low';
    image.src = url;
    preloadedImages.set(url, image);

    while (preloadedImages.size > PRELOAD_CACHE_LIMIT) {
      const oldest = preloadedImages.keys().next().value;
      preloadedImages.delete(oldest);
    }
  }

  function preloadAhead(index) {
    if (!tiles.length) return;

    for (let step = 1; step <= PRELOAD_COUNT; step += 1) {
      const tile = tiles[(index + step) % tiles.length];
      if (tile) preloadUrl(bestUrlFor(tile));
    }
  }

  function preloadInitial() {
    if (!onImageSearch()) return;

    for (const tile of collectTiles().slice(0, PRELOAD_COUNT)) {
      preloadUrl(bestUrlFor(tile));
    }
  }

  function showPhoto(index) {
    const tile = tiles[index];
    if (!tile) return;

    const details = describeTile(tile);
    if (!details) return;

    currentIndex = index;

    const overlay = getOverlay() || createOverlay();
    const image = overlay.querySelector('img');
    const caption = overlay.querySelector('.gpc-caption');

    overlay.classList.add('gpc-loading');

    // Some hosts block hotlinking, so fall back to the thumbnail Google serves.
    image.onload = () => overlay.classList.remove('gpc-loading');
    image.onerror = () => {
      overlay.classList.remove('gpc-loading');
      if (details.thumbnailUrl && image.src !== details.thumbnailUrl) {
        image.src = details.thumbnailUrl;
      }
    };

    image.fetchPriority = 'high';
    image.src = details.originalUrl || details.thumbnailUrl;
    image.alt = details.title;

    preloadAhead(index);

    caption.textContent = '';

    const counter = document.createElement('span');
    counter.textContent = `${index + 1} / ${tiles.length}`;
    caption.appendChild(counter);

    if (details.dimensions) {
      const size = document.createElement('span');
      size.textContent = details.dimensions;
      caption.appendChild(size);
    }

    if (details.sourceUrl) {
      const link = document.createElement('a');
      link.href = details.sourceUrl;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      link.textContent = details.title || details.sourceUrl;
      caption.appendChild(link);
    }
  }

  function openTheatre(tile) {
    tiles = collectTiles();

    const index = tiles.indexOf(tile);
    if (index === -1) return;

    showPhoto(index);

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  }

  function movePhoto(step) {
    if (!getOverlay() || !tiles.length) return;

    const nextIndex = (currentIndex + step + tiles.length) % tiles.length;
    showPhoto(nextIndex);
  }

  function findTile(event) {
    const path = event.composedPath ? event.composedPath() : [];

    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.(TILE_SELECTOR)) return node;
      if (node.tagName === 'BODY') break;
    }
    return null;
  }

  function ensureVersionBadge() {
    const existing = document.getElementById(BADGE_ID);

    if (!SHOW_VERSION_BADGE || !onImageSearch()) {
      existing?.remove();
      return;
    }

    const logo = document.querySelector('a#logo, #logo');
    if (!logo || !document.body) return;

    ensureStyles();

    const badge = existing || document.createElement('div');
    badge.id = BADGE_ID;
    badge.textContent = `Photo Search\nCarousel v${EXTENSION_VERSION}`;

    // The logo anchor sets overflow:hidden and is only as tall as the wordmark,
    // and its header cell clips horizontally, so anything placed under the logo
    // inside that subtree gets clipped away. Position it against the page
    // instead and keep it aligned to the logo box.
    if (badge.parentElement !== document.body) {
      document.body.appendChild(badge);
    }

    const rect = logo.getBoundingClientRect();
    badge.style.left = `${rect.left + window.scrollX}px`;
    badge.style.top = `${rect.bottom + window.scrollY + 3}px`;
  }

  function watchVersionBadge() {
    let pending = false;

    const schedule = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        ensureVersionBadge();
      });
    };

    schedule();

    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('popstate', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
  }

  document.addEventListener(
    'click',
    (event) => {
      if (!onImageSearch()) return;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const tile = findTile(event);
      if (!tile) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      openTheatre(tile);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (!getOverlay()) return;

      const handlers = {
        Escape: closeTheatre,
        ArrowLeft: () => movePhoto(-1),
        ArrowRight: () => movePhoto(1),
      };

      const handler = handlers[event.key];
      if (!handler) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      handler();
    },
    true
  );

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) getOverlay()?.remove();
  });

  function start() {
    if (SHOW_VERSION_BADGE) watchVersionBadge();

    // Warm the first batch once the page is otherwise idle, so opening the
    // first image is instant without competing with Google's own loading.
    const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 1500));
    idle(() => preloadInitial());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
