(() => {
  const XJTLU = globalThis.__XJTLU_PDF__;
  if (!XJTLU) return;

  const { constants, url: urlUtils, download, ui, inject, state } = XJTLU;

  inject.injectHook();

  const urlFromViewer = urlUtils.getUrlFromViewerParam();
  if (urlFromViewer) {
    updateTargetUrl(urlFromViewer);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== constants.eventName || !data.url) return;
    updateTargetUrl(data.url);
  });

  function updateTargetUrl(input) {
    if (!urlUtils.isTargetUrl(input)) return;
    const normalized = urlUtils.normalizeUrl(input);
    if (!normalized || state.targetUrl === normalized) return;

    state.targetUrl = normalized;
    ui.ensureButton(handleDownloadClick);
  }

  async function handleDownloadClick() {
    if (!state.targetUrl) return;
    const button = state.button;

    ui.setButtonState(button, "loading");

    try {
      const result = await download.fetchPdf(state.targetUrl);
      download.saveBlob(result.blob, result.filename);
      ui.setButtonState(button, "success", { autoResetMs: 1200 });
    } catch (err) {
      console.error("PDF download failed", err);
      ui.setButtonState(button, "error", { autoResetMs: 1600 });
      ui.showToast(formatError(err));
    }
  }

  function formatError(err) {
    if (!err) return "Download failed. Please refresh and try again.";
    const message = String(err.message || err);
    if (message.includes("HTTP")) {
      return `Download failed (${message}).`;
    }
    return "Download failed. Please refresh and try again.";
  }
})();
