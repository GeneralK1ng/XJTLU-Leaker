(() => {
  const TARGET_PATH = "/api/v1/File/BrowserFile";
  const EVENT_NAME = "XJTLU_PDF_URL";

  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  function normalizeUrl(input) {
    try {
      return new URL(input, location.href).href;
    } catch (err) {
      return null;
    }
  }

  function isTarget(input) {
    const normalized = normalizeUrl(input);
    if (!normalized) return false;
    const url = new URL(normalized);
    return url.origin === location.origin && url.pathname === TARGET_PATH;
  }

  function notify(url) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    window.postMessage(
      {
        type: EVENT_NAME,
        url: normalized
      },
      "*"
    );
  }

  window.fetch = function (input, init) {
    try {
      const url = typeof input === "string" ? input : input && input.url;
      if (url && isTarget(url)) {
        notify(url);
      }
    } catch (err) {
      // ignore
    }
    return originalFetch.apply(this, arguments);
  };

  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      if (url && isTarget(url)) {
        this.__xjtluPdfUrl = url;
      }
    } catch (err) {
      // ignore
    }
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (this.__xjtluPdfUrl) {
        notify(this.__xjtluPdfUrl);
      }
    } catch (err) {
      // ignore
    }
    return originalSend.apply(this, arguments);
  };
})();
