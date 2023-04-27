function injectStaticScript() {
  const script = document.createElement("script");
  (script.src = chrome.runtime.getURL("gpc-scripts/gpc-dom.js")),
    (script.online = function () {
      this.remove();
    }),
    document.documentElement.prepend(script);
}

injectStaticScript();
