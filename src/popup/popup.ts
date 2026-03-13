import {
  getDomainData,
  changeEnableDomain,
  getCurrentParsedDomain,
  getMySignalsEnabled,
  setMySignalsEnabled,
} from "mee-extension-lib";

async function checkDomain(parsedDomain: string) {
  const sliderDomain = document.getElementById(
    "slider-domain"
  ) as HTMLInputElement | null;
  try {
    const domainData = await getDomainData(parsedDomain);
    const enabled = domainData ? domainData.enabled : true;
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
    domainEnabled = domainData ? domainData.enabled : true;
  } catch (error) {}

  if (!enabledExtension || !domainEnabled) {
    alertContainer?.classList.add("active");
    if (currentDomainContainer) currentDomainContainer.innerHTML = parsedDomain;
  } else {
    alertContainer?.classList.remove("active");
  }
}

function changeDisableSlider(id: string, disabled: boolean) {
  const sliderSwitch = document.getElementById(id) as HTMLElement | null;
  const slider = sliderSwitch?.querySelector(
    "input"
  ) as HTMLInputElement | null;

  if (slider) {
    slider.disabled = disabled;

    if (disabled) {
      sliderSwitch?.classList.add("disabled");
    } else {
      sliderSwitch?.classList.remove("disabled");
    }
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

  changeDisableSlider("slider-domain-switch", !enabledExtension);
  changeDisableSlider("slider-mysignals-switch", !enabledExtension);
}

async function checkMySignalsState() {
  const mySignalsEnabled = await getMySignalsEnabled();
  const sliderMySignals = document.getElementById(
    "slider-mysignals"
  ) as HTMLInputElement | null;
  if (sliderMySignals) {
    sliderMySignals.checked = mySignalsEnabled;
  }
}

async function updateVaryStatus(varyHeaders: string[]) {
  const mySignalsOn = await getMySignalsEnabled();
  const varyRow = document.getElementById("vary-status-row");
  const tooltip = document.getElementById("vary-tooltip");

  const shouldShow = mySignalsOn && varyHeaders.length > 0;
  if (varyRow) varyRow.style.display = shouldShow ? "flex" : "none";
  if (tooltip) {
    tooltip.replaceChildren(); // or tooltip.textContent = "";
    varyHeaders.forEach((header) => {
      const span = document.createElement("span");
      span.textContent = header; // textContent automatically escapes all HTML characters
      tooltip.appendChild(span);
    });
  }
}

chrome.runtime.onMessage.addListener(async function (message, _, __) {
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    const parsedDomain = await getCurrentParsedDomain();
    let { domain, varyHeaders } = message.data;

    if (parsedDomain && domain === parsedDomain) {
      checkDomain(parsedDomain);
      checkAlert(parsedDomain);
      updateVaryStatus(varyHeaders ?? []);
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
    checkEnabledExtension();
    checkMySignalsState();
    getDomainData(parsedDomain).then((data) =>
      updateVaryStatus(data?.varyHeaders ?? [])
    );
  } else {
    changeDisableSlider("slider-extension-switch", true);
    changeDisableSlider("slider-domain-switch", true);
    changeDisableSlider("slider-mysignals-switch", true);
  }
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
    await checkMySignalsState();
  });

document
  .getElementById("slider-mysignals")
  ?.addEventListener("click", async (_) => {
    const currentState = await getMySignalsEnabled();
    await setMySignalsEnabled(!currentState);
    chrome.runtime.sendMessage({
      msg: "TOGGLE_MYSIGNALS",
    });
    await checkMySignalsState();
    const parsedDomain = await getCurrentParsedDomain();
    if (parsedDomain) {
      const domainData = await getDomainData(parsedDomain);
      await updateVaryStatus(domainData?.varyHeaders ?? []);
    }
  });
