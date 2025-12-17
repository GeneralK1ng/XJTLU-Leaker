(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const constants = XJTLU.constants || {};

  XJTLU.url = {
    normalizeUrl,
    isTargetUrl,
    getUrlFromViewerParam,
    buildFilenameFromUrl,
    sanitizeFilename
  };

  function normalizeUrl(input) {
    try {
      if (!input) return null;
      const url = input instanceof URL ? input : new URL(input, location.href);
      return url.href;
    } catch (err) {
      return null;
    }
  }

  function isTargetUrl(input) {
    const normalized = normalizeUrl(input);
    if (!normalized) return false;
    const url = new URL(normalized);
    return url.origin === location.origin && url.pathname === constants.targetPath;
  }

  function getUrlFromViewerParam() {
    const params = new URLSearchParams(location.search);
    const fileParam = params.get("file");
    if (!fileParam) return null;

    try {
      const decoded = decodeURIComponent(fileParam);
      const url = new URL(decoded, location.origin);
      return url.href;
    } catch (err) {
      return null;
    }
  }

  function buildFilenameFromUrl(urlInput) {
    const url = urlInput instanceof URL ? urlInput : new URL(urlInput, location.href);
    const params = url.searchParams;
    const dbCode = params.get("dbCode");
    const recordId = params.get("recordId");
    const dbId = params.get("dbId");

    const parts = [];
    if (dbCode) parts.push(dbCode);
    if (recordId) parts.push(recordId);
    if (dbId) parts.push(`db${dbId}`);

    const baseName = parts.length ? parts.join("_") : "xjtlu_download";
    return `${sanitizeFilename(baseName)}.pdf`;
  }

  function sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .slice(0, 180);
  }
})();
