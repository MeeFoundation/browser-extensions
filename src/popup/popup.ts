import {
  getDomainData,
  changeEnableDomain,
  getCurrentParsedDomain,
} from "mee-extension-lib";

async function checkDomain(parsedDomain: string) {
  const sliderDomain = document.getElementById(
    "slider-domain"
  ) as HTMLInputElement | null;
  try {
    const domainData = await getDomainData(parsedDomain);
    const enabled = domainData.enabled;
    if (sliderDomain) sliderDomain.checked = enabled;
  } catch (error) {
    if (sliderDomain) sliderDomain.checked = false;
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

async function checkAlert(parsedDomain: string) {
  const alertContainer = document.getElementById("alert-container");
  const currentDomainContainer = document.getElementById("current-domain");
  const enabledExtension = await isExtensionEnabled();
  let domainEnabled = true;
  try {
    const domainData = await getDomainData(parsedDomain);
    domainEnabled = domainData.enabled;
  } catch (error) {}

  if (!enabledExtension || !domainEnabled) {
    alertContainer?.classList.add("active");
    if (currentDomainContainer) currentDomainContainer.innerHTML = parsedDomain;
  } else {
    alertContainer?.classList.remove("active");
  }
}

async function checkEnabledExtension() {
  const enabledExtension = await isExtensionEnabled();
  const sliderExtension = document.getElementById(
    "slider-extension"
  ) as HTMLInputElement | null;
  if (sliderExtension) {
    sliderExtension.checked = enabledExtension;
  }
}

chrome.runtime.onMessage.addListener(async function (message, _, __) {
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    const parsedDomain = await getCurrentParsedDomain();
    let { domain } = message.data;

    if (domain === parsedDomain) {
      checkDomain(parsedDomain);
      checkAlert(parsedDomain);
    }
  }
});

document.addEventListener("DOMContentLoaded", async (_) => {
  const parsedDomain = await getCurrentParsedDomain();

  chrome.runtime.sendMessage({
    msg: "POPUP_LOADED",
    data: null,
  });

  if (parsedDomain) {
    checkDomain(parsedDomain);
    checkAlert(parsedDomain);
  }

  checkEnabledExtension();
});

document
  .getElementById("slider-domain")
  ?.addEventListener("click", async (_) => {
    const parsedDomain = await getCurrentParsedDomain();
    if (parsedDomain) {
      const update_result = await changeEnableDomain(parsedDomain);

      if (update_result) {
        chrome.runtime.sendMessage({
          msg: "UPDATE_SELECTOR",
          mode: update_result.enabled ? "enable" : "disable",
          domain: update_result.domain,
        });
        checkDomain(update_result.domain);
        checkAlert(update_result.domain);
      }
    }
  });

document
  .getElementById("slider-extension")
  ?.addEventListener("click", async (_) => {
    const parsedDomain = await getCurrentParsedDomain();
    const update_result = await changeEnableDomain("meeExtension");

    if (update_result && parsedDomain) {
      chrome.runtime.sendMessage({
        msg: "UPDATE_ENABLED",
      });
      checkDomain(parsedDomain);
      checkAlert(parsedDomain);
    }

    await checkEnabledExtension();
  });
