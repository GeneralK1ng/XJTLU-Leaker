(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});

  XJTLU.inject = {
    injectHook
  };

  function injectHook() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("page/hook.js");
    script.async = false;
    (document.documentElement || document.head).appendChild(script);
    script.remove();
  }
})();
