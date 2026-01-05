(() => {
  const root = globalThis.__XJTLU_PDF__ || {};
  if (!globalThis.__XJTLU_PDF__) {
    globalThis.__XJTLU_PDF__ = root;
  }

  root.state = root.state || {
    targetUrl: null,
    button: null,
    resetTimer: null,
    toast: null,
    toastTimer: null
  };
  root.pdf = root.pdf || {};
})();
