# Privacy Policy for Photo Search Carousel

Last updated: 1 September 2026

Photo Search Carousel does not collect, store, transmit, or sell any user data.

## What the extension does

Photo Search Carousel replaces the small preview panel on Google image search
results with a full-screen viewer that shows the original, full-resolution
image, and lets you move between results with the arrow keys.

## Data collection

None. The extension does not collect or receive:

- personal or identifying information of any kind
- your browsing history or the searches you run
- analytics, telemetry, crash reports, or usage statistics
- credentials, financial information, or location data

The extension requests no storage permission and keeps no data between page
loads. It creates no account and requires no sign-in.

## Page access

The extension runs a content script on `https://www.google.com/search` pages.
It takes no action unless the page is an image search (`udm=2` or `tbm=isch`).

On those pages it reads the markup and the inline data that Google already
places in the page, in order to find the address of the full-resolution version
of each thumbnail. This reading happens entirely inside your browser. Nothing
that is read is recorded, and nothing is sent anywhere.

## Network activity

The extension does not contact any server operated by the developer. There is
no backend, and no service receives information about you or your searches.

The only network activity the extension causes is your browser loading the
images themselves: the one you open, plus a small number of upcoming results
preloaded so that moving through the carousel is responsive. Those images are
requested directly from the third-party websites that host them, exactly as
your browser would request them if you opened the image yourself. The developer
has no involvement in and no visibility into those requests.

## Sharing

No data is collected, so no data is shared, sold, or transferred to third
parties. The extension is not used to determine creditworthiness or for any
lending purpose.

## Permissions

Host access to `https://www.google.com/search` is the only permission the
extension requests. It is required in order to detect which search result you
clicked, to draw the viewer over the page, and to locate the full-resolution
image. No broader access to your browsing is requested.

## Changes to this policy

If this policy changes, the updated version will be published at this address
and the date above will be revised.

## Contact

Questions or concerns can be raised at
<https://github.com/norad73/google-photos-carousel/issues>.
