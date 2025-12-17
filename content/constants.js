(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});

  XJTLU.constants = {
    targetPath: "/api/v1/File/BrowserFile",
    eventName: "XJTLU_PDF_URL",
    buttonId: "xjtlu-pdf-download",
    labels: {
      idle: "Download PDF",
      loading: "Downloading...",
      success: "Downloaded",
      error: "Download failed"
    }
  };
})();
