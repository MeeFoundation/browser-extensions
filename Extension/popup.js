import { getDomainData, changeEnableDomain } from "./store.js";
import { getCurrentParsedDomain } from "./utils/browser";

function getEnabled(domainData, wellknownData = null) {
  // return !!domainData.enabled || !!(wellknownData && wellknownData?.gpc);
  return domainData.enabled;
}

async function checkDomain(parsedDomain, wellknownData = null) {
  try {
    const domainData = await getDomainData(parsedDomain);
    const enabled = getEnabled(domainData, wellknownData);
    document.getElementById("slider-domain").checked = enabled;
  } catch (error) {
    console.log(error);
    document.getElementById("slider-domain").checked = false;
  }
}

async function isExtensionEnabled() {
  try {
    const extensionData = await getDomainData("meeExtension");
    return !extensionData || extensionData.enabled;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function checkEnabledExtension() {
  const enabledExtension = await isExtensionEnabled();
  document.getElementById("slider-extension").checked = enabledExtension;
  document.getElementById("domain-container").style.display = enabledExtension ? "flex" : "none";
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
