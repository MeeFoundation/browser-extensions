import {
  initDB,
  addRowToDB,
  getDisableDomains,
  getDomainData,
  getDomainFromUrl,
  changeExtensionEnabled,
  toggleGPCHeaders,
  enableNavigatorGPC,
  disableNavigatorGPC,
  getUserInfo,
  addUserInfo,
} from "mee-extension-lib";

import config from "./config";
import { getSDAData, parseTaxonomyRecords } from "./sda-profile";

initDB();

function afterDownloadWellknown(
  message: Message,
  sender: chrome.runtime.MessageSender
) {
  let tabID = sender.tab?.id;
  const url = sender.url;

  if (url && tabID) {
    let domain = getDomainFromUrl(url);
    let wellknown = [];

    wellknown[tabID] = message.data;
    let wellknownData = message.data;

    const gpc =
      wellknown[tabID] && wellknown[tabID]["gpc"] === true ? true : false;

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

let taxonomyRecords: string[][];

const getTaxonomyRecords = async () => {
  const response = await fetch(chrome.runtime.getURL("/taxonomy.tsv"));
  const taxonomy = await response.text();
  taxonomyRecords = parseTaxonomyRecords(taxonomy);
};

getTaxonomyRecords();

const onInitPage = async () => {
  const userInfo = await getUserInfo();
  const userUid = userInfo?.user_uid ? userInfo.user_uid : crypto.randomUUID();
  if (!userInfo.user_uid) {
    addUserInfo(userUid);
  }
  const data = await getSDAData(taxonomyRecords, userUid);
  try {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    const request = new Request(config.backendUrl + "api/v1/ad_profiles", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    fetch(request);
  } catch (e) {}
};

async function checkEnabledExtension() {
  const extensionData = await getDomainData("meeExtension");
  return !extensionData || extensionData.enabled;
}

async function onCheckEnabledMessageHandled(
  message: Message,
  sendResponse: (response?: any) => void
) {
  const enabledExtension = await checkEnabledExtension();
  const disable_domains = await getDisableDomains();
  const enabled =
    message.url && !disable_domains.includes(message.url) && enabledExtension;
  sendResponse({ enabled });
}

chrome.runtime.onInstalled.addListener(async function () {
  await changeExtensionEnabled(import.meta.env.VITE_BROWSER === "safari");
});

interface Message {
  msg: string;
  data?: string | boolean | any;
  url?: string;
  domain?: string;
  mode?: "enable" | "disable" | "remove";
}
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    switch (message.msg) {
      case "DOWNLOAD_WELLKNOWN": {
        afterDownloadWellknown(message, sender);
        return true;
      }
      case "UPDATE_ENABLED": {
        changeExtensionEnabled(import.meta.env.VITE_BROWSER === "safari");
        return true;
      }
      case "UPDATE_SELECTOR": {
        if (message.mode === "enable") {
          enableNavigatorGPC();
        } else {
          disableNavigatorGPC();
        }
        if (message.domain && message.mode) {
          toggleGPCHeaders(
            1,
            message.domain,
            import.meta.env.VITE_BROWSER === "safari",
            message.mode
          );
        }

        return true;
      }
      case "CONTENT_LOADED": {
        onCheckEnabledMessageHandled(message, sendResponse);
        onInitPage();
        return true;
      }
      default: {
        return false;
      }
    }
  }
);
