# XJTLU-Leaker

The school only lets us view past exam papers online. This extension grabs the PDF anyway. Online-only access is a policy, not a law of nature. The name says it all.

**AI notice:** Most of this README and the extension code were written by AI.

**Disclaimer:** This tool is for reference and learning purposes only.

## The One-Liner I Wrote (and why this exists)
I wrote exactly this snippet first. It is the core idea, the spark for the whole project, and the original human-written code in this repo:

```js
(async () => {
  const url = "https://etd.xjtlu.edu.cn/api/v1/File/BrowserFile?dbCode=EXAMXJTLU&recordId=13698&dbId=3&flag=0";
  const resp = await fetch(url, {
    headers: {
      "Referer": location.href,
      "Cookie": document.cookie
    }
  });
  const blob = await resp.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "exam.pdf";
  a.click();
})();
```

> BTW, you can also run this snippet in the console of the viewer page. The url should be replaced with the actual URL which you can get from the network tab.

## What the Extension Does
- Detects the `BrowserFile` XHR/fetch request used by the viewer.
- Shows a clean download button in the top-right toolbar area.
- Downloads the PDF with a dynamic filename based on the request params.
- Sanitizes PDFs to remove the repeating watermark text before saving.
- Surfaces download errors with a minimal toast under the button.

## Download (CRX)
I already packed the extension. Grab the latest `.crx` from the Releases page and use it directly. If Chrome blocks installation, fall back to Developer Mode below.

## Install (Developer Mode)
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select this repo folder
4. Open a viewer page, then click the button

## Project Structure
- `content/` Content script modules (UI, download, URL parsing, PDF sanitizer)
- `content/pdf/` PDF processing pipeline (matchers, source parsing, stream scrubbing)
- `page/` Page-level hook to capture network requests
- `manifest.json` MV3 entry

## Release Log
See `RELEASE_LOG.md`.

## License
This project is released under the MIT License. The goal is simple and direct: Real Free.
## Notes
If the viewer is loaded in another domain or the API changes, you may need to update the host permissions and path matcher.
