(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const urlUtils = XJTLU.url;

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
    const filename = urlUtils.buildFilenameFromUrl(pdfUrl);
    return { blob, filename };
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
})();
