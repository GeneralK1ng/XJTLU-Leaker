(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const constants = XJTLU.constants || {};
  const state = XJTLU.state || (XJTLU.state = {});

  XJTLU.ui = {
    ensureButton,
    setButtonState,
    showToast
  };

  function ensureButton(onClick) {
    if (state.button) return state.button;
    injectStyles();

    const button = document.createElement("button");
    button.id = constants.buttonId;
    button.type = "button";
    button.textContent = constants.labels.idle;
    button.addEventListener("click", onClick);

    mountButton(button);
    observeToolbar(button);

    state.button = button;
    return button;
  }

  function setButtonState(button, status, options = {}) {
    if (!button) return;
    const labels = constants.labels;

    clearTimeout(state.resetTimer);
    button.disabled = status === "loading";
    button.textContent = labels[status] || labels.idle;

    if (options.autoResetMs) {
      state.resetTimer = setTimeout(() => {
        setButtonState(button, "idle");
      }, options.autoResetMs);
    }
  }

  function showToast(message, options = {}) {
    const toast = ensureToast();
    if (!toast) return;

    clearTimeout(state.toastTimer);
    toast.textContent = message;
    positionToast(toast, state.button);
    toast.classList.add("xjtlu-toast-visible");

    const duration = options.durationMs || 3200;
    state.toastTimer = setTimeout(() => {
      toast.classList.remove("xjtlu-toast-visible");
    }, duration);
  }

  function mountButton(button) {
    const toolbar = document.querySelector("#toolbarViewerRight");
    if (toolbar) {
      button.classList.add("xjtlu-toolbar");
      toolbar.prepend(button);
      return;
    }

    const mount = document.body || document.documentElement;
    mount.appendChild(button);

    if (!document.body) {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          if (button && !document.body.contains(button)) {
            document.body.appendChild(button);
          }
        },
        { once: true }
      );
    }
  }

  function observeToolbar(button) {
    if (document.querySelector("#toolbarViewerRight")) return;
    const observer = new MutationObserver(() => {
      const toolbar = document.querySelector("#toolbarViewerRight");
      if (toolbar) {
        button.classList.add("xjtlu-toolbar");
        toolbar.prepend(button);
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function ensureToast() {
    if (state.toast) return state.toast;
    injectStyles();

    const toast = document.createElement("div");
    toast.id = "xjtlu-pdf-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const mount = document.body || document.documentElement;
    mount.appendChild(toast);

    if (!document.body) {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          if (toast && !document.body.contains(toast)) {
            document.body.appendChild(toast);
          }
        },
        { once: true }
      );
    }

    state.toast = toast;
    return toast;
  }

  function positionToast(toast, button) {
    const padding = 8;
    if (!button || !button.getBoundingClientRect) {
      toast.style.top = "calc(52px + env(safe-area-inset-top, 0px))";
      toast.style.right = "calc(18px + env(safe-area-inset-right, 0px))";
      return;
    }

    const rect = button.getBoundingClientRect();
    const top = rect.bottom + padding;
    const right = Math.max(12, window.innerWidth - rect.right);

    toast.style.top = `${Math.round(top)}px`;
    toast.style.right = `${Math.round(right)}px`;
  }

  function injectStyles() {
    if (document.getElementById("xjtlu-pdf-style")) return;
    const style = document.createElement("style");
    style.id = "xjtlu-pdf-style";
    style.textContent = `
#${constants.buttonId} {
  position: fixed;
  top: 14px;
  right: 18px;
  top: calc(14px + env(safe-area-inset-top));
  right: calc(18px + env(safe-area-inset-right));
  z-index: 2147483647;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, #ffffff, #eef2f7);
  color: #1a1f2b;
  font: 600 13px/1 "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0.2px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
}
#${constants.buttonId}:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}
#${constants.buttonId}:active {
  transform: translateY(0);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.16);
}
#${constants.buttonId}:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.14);
}
#${constants.buttonId}.xjtlu-toolbar {
  position: relative;
  top: 0;
  right: 0;
  margin-left: 8px;
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #ffffff;
}
#xjtlu-pdf-toast {
  position: fixed;
  top: 52px;
  right: 18px;
  top: calc(52px + env(safe-area-inset-top, 0px));
  right: calc(18px + env(safe-area-inset-right, 0px));
  max-width: min(320px, calc(100vw - 32px));
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.96);
  color: #1a1f2b;
  font: 500 12px/1.4 "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease;
  z-index: 2147483646;
}
#xjtlu-pdf-toast.xjtlu-toast-visible {
  opacity: 1;
  transform: translateY(0);
}
`;

    document.documentElement.appendChild(style);
  }
})();
