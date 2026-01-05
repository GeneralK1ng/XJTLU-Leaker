# Release Log

## v1.1.0
- Added PDF sanitizer pipeline to strip watermark text before download.
- Refactored PDF handling into modular content scripts for maintainability.

## v1.0.0
- Initial release of XJTLU-Leaker.
- Captures the `BrowserFile` request from the viewer (XHR + fetch).
- Adds a clean download button in the viewer toolbar or top-right corner.
- Downloads PDFs with a dynamic filename based on request parameters.
- Shows a minimal toast under the button when errors occur.
