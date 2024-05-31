import { getDomainData, changeEnableDomain } from "mee-extension-lib";

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
  const sliderExtension = document.getElementById(
    "slider-extension"
  ) as HTMLInputElement | null;
  const domainContainer = document.getElementById("domain-container");
  if (sliderExtension) sliderExtension.checked = enabledExtension;
  if (domainContainer)
    domainContainer.style.display = enabledExtension ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", async (_) => {
  chrome.runtime.sendMessage({
    msg: "POPUP_LOADED",
    data: null,
  });

  await checkEnabledExtension();
});

const sliderExtension = document.getElementById(
  "slider-extension"
) as HTMLInputElement | null;
const yearSpan = document.getElementById("year");

sliderExtension?.addEventListener("click", async (_) => {
  const update_result = await changeEnableDomain("meeExtension");

  if (update_result) {
    chrome.runtime.sendMessage({
      msg: "UPDATE_ENABLED",
    });
  }

  await checkEnabledExtension();
});
if (yearSpan) yearSpan.innerHTML = new Date().getFullYear().toString();
