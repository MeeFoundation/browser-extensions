import {
  initDB,
  addRowToDB,
  getDisableDomains,
  getDomainData,
  getDomainFromUrl,
  changeExtensionEnabled,
} from "mee-extension-lib";

import { loadTemplate } from "./content/injectTemplate.js";

initDB();

async function injectTemplate(tabID: number) {
  const enabledExtension = await checkEnabledExtension();
  if (enabledExtension) {
    chrome.scripting.executeScript({
      target: {
        tabId: tabID,
      },
      func: loadTemplate,
    });
  }
}

function afterDownloadWellknown(message: Message, sender: chrome.runtime.MessageSender) {
  let tabID = sender.tab?.id;
  const url = sender.url;

  if (url && tabID) {
    let domain = getDomainFromUrl(url);
    let wellknown = [];
  
    wellknown[tabID] = message.data;
    let wellknownData = message.data;
  
    const gpc =
      wellknown[tabID] && wellknown[tabID]["gpc"] === true ? true : false;
  
    if (gpc === true) {
      chrome.action.setIcon({
        tabId: tabID,
        path: "images/icon-96.png",
      });
      injectTemplate(tabID);
    }
  
    addRowToDB({
      domain: domain,
      wellknown: gpc,
      enabled: true,
    });
  
    chrome.runtime.onMessage.addListener((message) => {
      if (message.msg === "POPUP_LOADED") {
        chrome.runtime.sendMessage({
          msg: "SEND_WELLKNOWN_TO_POPUP",
          data: { domain, wellknownData },
        });
      }
    });
  }
  
}

async function checkEnabledExtension() {
  const extensionData = await getDomainData("meeExtension");
  return !extensionData || extensionData.enabled;
}


async function onCheckEnabledMessageHandled(message: Message, sendResponse:(response?: any) => void) {
  const enabledExtension = await checkEnabledExtension();
  const disable_domains = await getDisableDomains();
  const isEnabled = message.url && !disable_domains.includes(message.url) && enabledExtension;
  sendResponse({ isEnabled });
}

chrome.runtime.onInstalled.addListener(async function () {
  await changeExtensionEnabled(import.meta.env.VITE_BROWSER === "safari");
});

interface Message {
  msg: string,
  data?: string| boolean | any
  url?: string
}
chrome.runtime.onMessage.addListener((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  switch (message.msg) {
    case "DOWNLOAD_WELLKNOWN": {
      afterDownloadWellknown(message, sender);
      return true;
    }
    case "UPDATE_ENABLED": {
      changeExtensionEnabled(import.meta.env.VITE_BROWSER === "safari");
      return true;
    }
    case "CHECK_ENABLED": {
      onCheckEnabledMessageHandled(message, sendResponse);
      return true;
    }
    default: {
      return false;
    }
  }
});