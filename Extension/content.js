async function getWellknown(url) {
  const response = await fetch(`${url.origin}/.well-known/gpc.json`);
  let wellknownData;
  try {
    wellknownData = await response.json();
  } catch {
    wellknownData = null;
  }

  chrome.runtime.sendMessage({
    msg: "DOWNLOAD_WELLKNOWN",
    data: wellknownData,
  });
}

function setDom() {
  try {
    const script_content = `
        Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
          get: () => true,
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

(() => {
  let url = new URL(location);
  getWellknown(url);
  chrome.runtime
    .sendMessage({
      msg: "CHECK_ENABLED",
      data: url.hostname,
    })
    .then((response) => {
      if (response.isEnabled) {
        setDom();
      }
    });
  chrome.runtime
    .sendMessage({
      msg: "APP_COMMUNICATION",
      type: "GET_DOMAIN_STATUS",
      data: url.hostname,
    })
    .then((response) => {
      console.log(response);
    });
})();
