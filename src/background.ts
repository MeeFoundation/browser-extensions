import {
  initDB,
  addRowToDB,
  getDisableDomains,
  getDomainData,
  getDomainFromUrl,
  changeExtensionEnabled,
  updateSelector,
  getUserInfo,
  addUserInfo,
  getMySignalsEnabled,
  switchMySignalsMode,
  handleProbeResult,
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
  const disable_domains_data = await getDisableDomains();
  const disable_domains = disable_domains_data.map(
    (domain_data) => domain_data.domain
  );
  const enabled =
    message.url && !disable_domains.includes(message.url) && enabledExtension;
  sendResponse({ enabled });
}

async function probeMySignals(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(async function () {
  const mySignalsOn = await getMySignalsEnabled();
  if (mySignalsOn) {
    await switchMySignalsMode(import.meta.env.VITE_BROWSER === "safari");
  } else {
    await changeExtensionEnabled(import.meta.env.VITE_BROWSER === "safari");
  }
});

interface Message {
  msg: string;
  data?: string | boolean | any;
  url?: string;
  domain?: string;
  mode?: "enable" | "remove";
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
        if (message.domain) {
          updateSelector(
            message.domain,
            import.meta.env.VITE_BROWSER === "safari"
          );
        }
        return true;
      }
      case "TOGGLE_MYSIGNALS": {
        switchMySignalsMode(import.meta.env.VITE_BROWSER === "safari");
        return true;
      }
      case "CONTENT_LOADED": {
        onCheckEnabledMessageHandled(message, sendResponse);
        onInitPage();

        // MySignals probe logic
        if (message.url) {
          const domain = message.url;
          (async () => {
            try {
              const mySignalsOn = await getMySignalsEnabled();
              if (mySignalsOn) {
                const domainData = await getDomainData(domain);
                if (domainData && domainData.enabled && !domainData.msConfirmed) {
                  const confirmed = await probeMySignals(domain);
                  if (confirmed) {
                    await handleProbeResult(
                      domain,
                      true,
                      import.meta.env.VITE_BROWSER === "safari"
                    );
                  }
                }
              }
            } catch (error) {
              console.warn(`MySignals probe error for ${domain}:`, error);
            }
          })();
        }
        return true;
      }
      default: {
        return false;
      }
    }
  }
);
