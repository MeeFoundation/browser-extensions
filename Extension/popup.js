import { getDomainData, changeEnableDomain } from "./store.js";

function getCurrentParsedDomain() {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        let url = new URL(tab.url);
        let currentUrl = url.hostname.replace("www.", "");
        resolve(currentUrl);
      });
    } catch (e) {
      reject();
    }
  });
}

function getEnabled(domainData, wellknownData = null) {
  if (domainData) {
    return domainData.enabled;
  } else if (wellknownData && wellknownData.gpc) {
    return true;
  } else {
    return false;
  }
}

async function checkDomain(parsedDomain, wellknownData = null) {
  const domainData = await getDomainData(parsedDomain);
  const enabled = getEnabled(domainData, wellknownData);
  const enabledExtension = isExtensionEnabled();
  if (!enabledExtension) {
  }
  document.getElementById("slider-item").checked = enabled;
}

async function isExtensionEnabled() {
  const extensionData = await getDomainData("meeExtension");
  return !extensionData || extensionData.enabled;
}

async function checkEnabledExtension() {
  const enabledExtension = await isExtensionEnabled();
  document.getElementById("slider").checked = enabledExtension;
  document.getElementById("domain-container").style.display = enabledExtension
    ? "flex"
    : "none";
}

async function checkSiteHasConnection() {
  const parsedDomain = await getCurrentParsedDomain();
  chrome.runtime
    .sendMessage({
      msg: "APP_COMMUNICATION",
      type: "GET_DOMAIN_STATUS",
      data: parsedDomain,
    })
    .then((response) => {
      if (response?.hasConnection) {
        document.getElementById("has-connection").innerHTML = " true";
      } else {
        document.getElementById("has-connection").innerHTML = " false";
      }
    });
}

chrome.runtime.onMessage.addListener(async function (message, _, __) {
  const parsedDomain = await getCurrentParsedDomain();
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    let { domain, wellknownData } = message.data;

    if (domain === parsedDomain) {
      checkDomain(parsedDomain, wellknownData);
    }
  }
});

document.addEventListener("DOMContentLoaded", async (_) => {
  const parsedDomain = await getCurrentParsedDomain();
  document.getElementById("current-domain").innerHTML = parsedDomain ? parsedDomain : "Undefined";

  chrome.runtime.sendMessage({
    msg: "POPUP_LOADED",
    data: null,
  });

  await checkDomain(parsedDomain);
  await checkEnabledExtension();
  await checkSiteHasConnection();
});

document.getElementById("slider-item").addEventListener("click", async (_) => {
  const parsedDomain = await getCurrentParsedDomain();

  const update_result = await changeEnableDomain(parsedDomain);

  if (update_result) {
    chrome.runtime.sendMessage({
      msg: "UPDATE_SELECTOR",
    });
    checkDomain(parsedDomain);
  }
});

document.getElementById("slider").addEventListener("click", async (_) => {
  const parsedDomain = await getCurrentParsedDomain();
  const update_result = await changeEnableDomain("meeExtension");

  if (update_result) {
    chrome.runtime.sendMessage({
      msg: "UPDATE_ENABLED",
    });
    checkDomain(parsedDomain);
  }

  await checkEnabledExtension();
});
