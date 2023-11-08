import { getDomainData, changeEnableDomain } from "./store.js";
import { getCurrentParsedDomain } from "./utils/browser";

function getEnabled(domainData, wellknownData = null) {
  // return !!domainData.enabled || !!(wellknownData && wellknownData?.gpc);
  return domainData.enabled;
}

async function checkDomain(parsedDomain, wellknownData = null) {
  const domainData = await getDomainData(parsedDomain);
  const enabled = getEnabled(domainData, wellknownData);
  document.getElementById("slider-domain").checked = enabled;
}

async function isExtensionEnabled() {
  const extensionData = await getDomainData("meeExtension");
  return !extensionData || extensionData.enabled;
}

async function checkEnabledExtension() {
  const enabledExtension = await isExtensionEnabled();
  document.getElementById("slider-extension").checked = enabledExtension;
  document.getElementById("domain-container").style.display = enabledExtension ? "flex" : "none";
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
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    const parsedDomain = await getCurrentParsedDomain();
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

document.getElementById("slider-domain").addEventListener("click", async (_) => {
  const parsedDomain = await getCurrentParsedDomain();
  const update_result = await changeEnableDomain(parsedDomain);

  if (update_result) {
    chrome.runtime.sendMessage({
      msg: "UPDATE_SELECTOR",
      mode: update_result.isEnabled ? "enable" : "disable",
      domain: update_result.domain,
    });
    checkDomain(update_result.domain);
  }
});

document.getElementById("slider-extension").addEventListener("click", async (_) => {
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
