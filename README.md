# XJTLU-Leaker

The school only lets us view past exam papers online. This extension grabs the PDF anyway. Online-only access is a policy, not a law of nature. The name says it all.

**AI notice:** This README (and the extension code) was written by AI. The only line I personally wrote is the script below.

## The One-Liner I Wrote (and why this exists)
I wrote exactly this snippet first. It is the core idea, the spark for the whole project, and the only human-written code in this repo:

```js
(async () => {
  const url = "https://etd.xjtlu.edu.cn/api/v1/File/BrowserFile?xxxxxxxxxxxx";
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

## What the Extension Does
- Detects the `BrowserFile` XHR/fetch request used by the viewer.
- Shows a clean download button in the top-right toolbar area.
- Downloads the PDF with a dynamic filename based on the request params.
- Surfaces download errors with a minimal toast under the button.

## Install (Developer Mode)
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select this repo folder
4. Open a viewer page, then click the button

## Project Structure
- `content/` Content script modules (UI, download, URL parsing)
- `page/` Page-level hook to capture network requests
- `manifest.json` MV3 entry

## Notes
If the viewer is loaded in another domain or the API changes, you may need to update the host permissions and path matcher.
