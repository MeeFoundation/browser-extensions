import {
  initDB,
  addRowToDB,
  getDisableDomains,
  getDomainData,
} from "./store.js";
import { getBrowserInfo } from "./utils/browser.js";

initDB();

let memoryDatabase = [];
let extensionDisabled = false;
const browserInfo = getBrowserInfo();

async function addDynamicRule(id, domain) {
  let UpdateRuleOptions = {
    addRules: [
      {
        id: id,
        priority: 2,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "Sec-GPC", operation: "remove" },
            { header: "DNT", operation: "remove" },
          ],
        },
        condition: {
          urlFilter: domain,
          resourceTypes: [
            "main_frame",
            "sub_frame",
            "stylesheet",
            "script",
            "image",
            "font",
            "object",
            "xmlhttprequest",
            "ping",
            "csp_report",
            "media",
            "websocket",
            "other",
          ],
        },
      },
    ],
    removeRuleIds: [id],
  };

  // TODO: Allow only on Chrome. Should research about necessity of this types for us.
  if (browserInfo === "Chrome") UpdateRuleOptions.addRules[0].condition.resourceTypes.push("webtransport", "webbundle");

  console.log(`Rules:`, UpdateRuleOptions.addRules);

  await chrome.declarativeNetRequest.updateDynamicRules(UpdateRuleOptions);
}

async function deleteAllDynamicRules() {
  let MAX_RULES = chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES;
  let UpdateRuleOptions = { removeRuleIds: [...Array(MAX_RULES).keys()] };
  await chrome.declarativeNetRequest.updateDynamicRules(UpdateRuleOptions);
}

async function addRulesForDisabledDomains() {
  let id = 1;
  const disable_domains = await getDisableDomains();
  if (disable_domains) {
    memoryDatabase = disable_domains;
    let excludeMatches = [];
    for (let domain of disable_domains) {
      await addDynamicRule(id++, domain);
      excludeMatches.push(`*://${domain}/*`);
    }

    // chrome.scripting.updateContentScripts([
    //   {
    //     id: "1",
    //     matches: ["<all_urls>"],
    //     excludeMatches: excludeMatches,
    //     js: ["gpc-scripts/add-gpc-dom.js"],
    //     runAt: "document_start",
    //   },
    // ]);
  }
}

function afterDownloadWellknown(message, sender) {
  let tabID = sender.tab.id;
  let url = new URL(sender.url);
  let domain = url.hostname.replace("www.", "");
  let wellknown = [];

  wellknown[tabID] = message.data;
  let wellknownData = message.data;

  const gpc = wellknown[tabID] && wellknown[tabID]["gpc"] === true ? true : false;

  if (gpc === true) {
    chrome.action.setIcon({
      tabId: tabID,
      path: "images/icon-96.png",
    });
  }

  addRowToDB({
    domain: domain,
    wellknown: gpc,
    enabled: true,
  });

  chrome.runtime.onMessage.addListener(function (message, _, __) {
    if (message.msg === "POPUP_LOADED") {
      chrome.runtime.sendMessage({
        msg: "SEND_WELLKNOWN_TO_POPUP",
        data: { domain, wellknownData },
      });
    }
  });
}

async function changeExtensionEnabled() {
  await deleteAllDynamicRules();
  const extensionData = await getDomainData("meeExtension");
  const enabledExtension = !extensionData || extensionData.enabled;
  extensionDisabled = !enabledExtension;

  if (!enabledExtension) {
    // chrome.scripting.updateContentScripts([
    //   {
    //     id: "1",
    //     matches: ["https://example.com/"],
    //     excludeMatches: [],
    //     js: ["gpc-scripts/add-gpc-dom.js"],
    //     runAt: "document_start",
    //   },
    // ]);

    await addDynamicRule(1, "*");
  } else {
    await addRulesForDisabledDomains();
  }
}

function onCheckEnabledMessageHandled(message, sender, sendResponse) {
  if (message.msg === "CHECK_ENABLED") {
    const isEnabled = memoryDatabase.findIndex((domain) => domain === message.data) === -1 && !extensionDisabled;
    sendResponse({ isEnabled: isEnabled });
  }
}

chrome.runtime.onMessage.addListener(onCheckEnabledMessageHandled);

function onAppCommunicationMessageHandled(message, sender, sendResponse) {
  if (message.msg === "APP_COMMUNICATION" && browserInfo !== "Firefox Mobile") {
    new Promise((resolve, reject) => {
      chrome.runtime.sendNativeMessage("Mee", { type: message.type, message: message.data }, function (response) {
        resolve(response);
      });
    })
      .then((response) => {
        sendResponse(response);
        return true;
      })
      .catch((e) => {
        console.log("error: ", e);
        sendResponse(e);
        return true;
      });
  }
}

chrome.runtime.onMessage.addListener(onAppCommunicationMessageHandled);

function onMessageHandlerAsync(message, sender) {
  switch (message.msg) {
    case "DOWNLOAD_WELLKNOWN": {
      afterDownloadWellknown(message, sender);
    }
    case "UPDATE_SELECTOR": {
      deleteAllDynamicRules();
      addRulesForDisabledDomains();
    }
    case "UPDATE_ENABLED": {
      changeExtensionEnabled();
    }
  }
}

chrome.runtime.onMessage.addListener(onMessageHandlerAsync);

chrome.runtime.onInstalled.addListener(async function () {
  const disable_domains = await getDisableDomains();
  if (disable_domains) {
    memoryDatabase = disable_domains;
  }
  // await chrome.scripting.registerContentScripts([
  //   {
  //     id: "1",
  //     matches: ["<all_urls>"],
  //     excludeMatches: [],
  //     js: ["gpc-scripts/add-gpc-dom.js"],
  //     runAt: "document_start",
  //   },
  // ]);
  const extensionData = await getDomainData("meeExtension");
  const enabledExtension = !extensionData || extensionData.enabled;
  extensionDisabled = !enabledExtension;

  if (!enabledExtension) {
    // chrome.scripting.updateContentScripts([
    //   {
    //     id: "1",
    //     matches: ["https://example.com/"],
    //     excludeMatches: [],
    //     js: ["gpc-scripts/add-gpc-dom.js"],
    //     runAt: "document_start",
    //   },
    // ]);

    await addDynamicRule(1, "*");
  } else {
    await addRulesForDisabledDomains();
  }
});
