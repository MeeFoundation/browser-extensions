let parsedDomain;

function getCurrentParsedDomain() {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        let url = new URL(tab.url);
        let currentUrl = url.host;
        resolve(currentUrl);
      });
    } catch (e) {
      reject();
    }
  });
}

document.addEventListener("DOMContentLoaded", async (event) => {
  parsedDomain = await getCurrentParsedDomain();
  document.getElementById("current-domain").innerHTML = parsedDomain
    ? parsedDomain
    : "Undefined";

  chrome.runtime.sendMessage({
    msg: "POPUP_LOADED",
    data: null,
  });
});

chrome.runtime.onMessage.addListener(function (message, _, __) {
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    let { domain, wellknownData } = message.data;

    if (domain === parsedDomain) {
      document.getElementById("domain-block").style.color =
        wellknownData && wellknownData.gpc ? "#06ae4d" : "red";
    }
  }
});
