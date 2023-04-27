import "./popup.css";
import psl from "psl";
import { getDomainData, changeEnableDomain } from "./store.js";

let parsedDomain;
let enabled = false;

function getCurrentParsedDomain() {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        let url = new URL(tab.url);
        let parsed = psl.parse(url.hostname);
        let currentUrl = parsed.domain;
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
  enabled = getEnabled(domainData, wellknownData);

  document.getElementById("slider").checked = enabled;
}

chrome.runtime.onMessage.addListener(function (message, _, __) {
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    let { domain, wellknownData } = message.data;

    if (domain === parsedDomain) {
      checkDomain(parsedDomain, wellknownData);
    }
  }
});

document.addEventListener("DOMContentLoaded", async (event) => {
  parsedDomain = await getCurrentParsedDomain();
  document.getElementById("current-domain").innerHTML = parsedDomain
    ? parsedDomain
    : "Undefined";

  chrome.runtime.sendMessage({
    msg: "POPUP_LOADED",
    data: null,
  });

  await checkDomain(parsedDomain);
});

document.getElementById("slider").addEventListener("click", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!parsedDomain) {
    parsedDomain = await getCurrentParsedDomain();
  }

  const update_result = await changeEnableDomain(parsedDomain);

  if (update_result) {
    chrome.runtime.sendMessage({
      msg: "UPDATE_SELECTOR",
    });
    checkDomain(parsedDomain);
  }
});
