Photo Search Carousel

What it does
- Go to Google Images (google.com, then the Images tab).
- Click any image in the search results.
- The screen goes dark and the full-resolution image opens centered (theatre mode).
- Chrome enters true fullscreen automatically.
- Use Left / Right arrow keys, or the on-screen arrows, to move through results.
- Press Esc or click the X to close.
- The current version is shown in the icon popup. It is also drawn below the
  Google logo, but only when the extension is loaded unpacked, so published
  installs leave the page untouched.

How the full-size image is found
Google Images only puts a small thumbnail in the page markup. The original
image URL is embedded in the page's inline script data, so the extension reads
it from there. If a site blocks hotlinking, the overlay falls back to the
thumbnail Google serves.

Install
1. Unzip this folder.
2. Open chrome://extensions
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select the unzipped folder.
6. Click the extension icon to see the current version.

Notes
- Runs on www.google.com/search only, and does nothing unless the page is in
  Images mode (udm=2 or tbm=isch). Country domains such as google.co.uk are not
  listed because Google redirects them to google.com before the page loads.
- Icons are original artwork drawn from scripts/icon-art.ps1. Run
  scripts/generate-icons.ps1 after changing the design; it also emits
  store-icon-512.png for the Chrome Web Store listing.
- scripts/generate-store-assets.ps1 draws the 440x280 promo tile into
  store-assets/, alongside the 1280x800 listing screenshot.
- scripts/build.ps1 produces the upload zip in dist/. It packages only the
  files Chrome loads and fails if the manifest points at anything missing.
