function injectStaticScript() {
  const script = document.createElement("script");
  (script.src = chrome.runtime.getURL("gpc-scripts/gpc-dom-disable.js")),
    (script.online = function () {
      this.remove();
    }),
    document.documentElement.prepend(script);
}

injectStaticScript();
