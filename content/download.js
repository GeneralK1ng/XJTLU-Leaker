(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const urlUtils = XJTLU.url;
  const constants = XJTLU.constants || {};
  const sanitizer = XJTLU.pdf?.sanitizer;

  XJTLU.download = {
    fetchPdf,
    saveBlob
  };

  async function fetchPdf(targetUrl) {
    const pdfUrl = new URL(targetUrl, location.href);
    const resp = await fetch(pdfUrl.href, { credentials: "include" });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const blob = await resp.blob();
    const sanitizedBlob = await sanitizeBlob(blob);
    const filename = urlUtils.buildFilenameFromUrl(pdfUrl);
    return { blob: sanitizedBlob, filename };
  }

  function saveBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;

    const mount = document.body || document.documentElement;
    mount.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  }

  async function sanitizeBlob(blob) {
    if (!sanitizer || typeof sanitizer.sanitizePdfBlob !== "function") {
      throw new Error("PDF sanitizer is not available.");
    }

    const targetText = constants.redactText;
    return await sanitizer.sanitizePdfBlob(blob, { targetText });
  }
})();
