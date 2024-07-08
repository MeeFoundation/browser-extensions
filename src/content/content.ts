export {};

async function getWellknown(url: URL) {

  try {
    const response = await fetch(`${url.origin}/.well-known/gpc.json`);
    const wellknownData = await response.json();
    chrome.runtime.sendMessage({
      msg: "DOWNLOAD_WELLKNOWN",
      data: wellknownData,
    });
  } catch {
    chrome.runtime.sendMessage({
      msg: "DOWNLOAD_WELLKNOWN",
      data: null,
    });
  }
}

const setDom = (state = true) => {
  if (import.meta.env.VITE_BROWSER === "safari") {
    try {
      const script_content = `
        Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
          get: () => ${state},
          configurable: true,
          enumerable: true
        });
        document.currentScript.parentElement.removeChild(document.currentScript);
      `;
      const script = document.createElement("script");
      script.innerHTML = script_content;
      document.documentElement.prepend(script);
    } catch (err) {
      console.error(`Failed to set DOM signal: ${err}`);
    }
  }
};

(() => {
  let url = new URL(location.toString());
  getWellknown(url);
  chrome.runtime
    .sendMessage({
      msg: "CHECK_ENABLED",
      url: url.hostname,
    })
    .then((response) => {
      const iOSVersion = /(iPhone|iPad) OS ([1-9]*)/g.exec(
        window.navigator.userAgent
      )?.[2];
      const iOSVersionNumber = Number(iOSVersion);
      if (
        import.meta.env.VITE_BROWSER === "safari" &&
        iOSVersion &&
        iOSVersionNumber < 17
      ) {
        console.log(
          "🚀 ~ file: content.js:46 ~ .then ~ iOSVersion:",
          iOSVersion
        );
        if (response.enabled) {
          setDom(true);
        } else {
          setDom(false);
        }
      }
    });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.msg === "GPC_ENABLED") {
      console.log("GPC_ENABLED");
    }
  });
})();
