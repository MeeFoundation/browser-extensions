import { initDB, addRowToDB, getDisableDomains, getDomainData } from "./store.js";
import { getDomainFromUrl, getRegDomain, getRegDomains } from "./utils/string";

initDB();

let memoryDatabase = [];
let extensionDisabled = false;

async function toggleGPCHeaders(id, domain, mode = "enable") {
  // Safari doesn't give all Resources from type, so we need writing this array by hand
  const allResourceTypes =
    import.meta.env.VITE_BROWSER === "safari"
      ? [
          "font",
          "image",
          "main_frame",
          "media",
          "ping",
          "script",
          "stylesheet",
          "sub_frame",
          "websocket",
          "xmlhttprequest",
        ]
      : Object.values(chrome.declarativeNetRequest.ResourceType);

  const headers =
    mode === "remove"
      ? [
          {
            header: "Sec-GPC",
            operation: "remove",
          },
          { header: "DNT", operation: "remove" },
        ]
      : [
          {
            header: "Sec-GPC",
            operation: "set",
            value: mode === "enable" ? "1" : "0",
          },
          { header: "DNT", operation: "set", value: mode === "enable" ? "1" : "0" },
        ];

  let UpdateRuleOptions = {
    addRules: [
      {
        id: id,
        priority: 2,
        action: {
          type: "modifyHeaders",
          requestHeaders: headers,
        },
        condition: {
          urlFilter: domain,
          resourceTypes: allResourceTypes,
        },
      },
    ],
    removeRuleIds: [id],
  };

  await chrome.declarativeNetRequest.updateDynamicRules(UpdateRuleOptions);
}

async function enableNavigatorGPC(domains = ["<all_urls>"]) {
  const disable_domains = await getDisableDomains();
  await chrome.scripting.updateContentScripts([
    {
      id: "1",
      matches: domains,
      excludeMatches: getRegDomains(disable_domains),
      js: ["gpc-scripts/add-gpc-dom.js"],
      runAt: "document_start",
    },
  ]);
}

async function disableNavigatorGPC() {
  const disable_domains = await getDisableDomains();
  await chrome.scripting.updateContentScripts([
    {
      id: "1",
      matches: getRegDomains(disable_domains),
      excludeMatches: [],
      js: ["gpc-scripts/disable-gpc-dom.js"],
      runAt: "document_start",
    },
  ]);
}

async function deleteAllDynamicRules() {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map((rule) => rule.id);

  oldRuleIds.map(async (id) => {
    toggleGPCHeaders(id, "*", "remove");
  });
}

async function addRulesForDisabledDomains() {
  let id = 1;
  const disable_domains = await getDisableDomains();
  if (disable_domains) {
    memoryDatabase = disable_domains;
    for (let domain of disable_domains) {
      await toggleGPCHeaders(id++, getRegDomain(domain), "disable");
    }
  }
}

function afterDownloadWellknown(message, sender) {
  let tabID = sender.tab.id;
  let domain = getDomainFromUrl(sender.url);
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

  chrome.runtime.onMessage.addListener((message) => {
    if (message.msg === "POPUP_LOADED") {
      chrome.runtime.sendMessage({
        msg: "SEND_WELLKNOWN_TO_POPUP",
        data: { domain, wellknownData },
      });
    }
  });
}

async function changeExtensionEnabled() {
  const disable_domains = await getDisableDomains();
  const extensionData = await getDomainData("meeExtension");
  const enabledExtension = !extensionData || extensionData.enabled;
  extensionDisabled = !enabledExtension;

  if (enabledExtension) {
    // if (import.meta.env.VITE_BROWSER !== "firefox") {
    //   console.log("On chrome");
    //   await addGPCToNavigator();
    // }
    // if (import.meta.env.VITE_BROWSER === "firefox") {
    //   console.log("On ff");
    //   chrome.runtime.sendMessage({ msg: "ENABLE_DOM" });
    // }

    await toggleGPCHeaders(1, "*");
    await addRulesForDisabledDomains();

    await chrome.scripting.registerContentScripts([
      {
        id: "1",
        matches: ["<all_urls>"],
        excludeMatches: getRegDomains(disable_domains),
        js: ["gpc-scripts/add-gpc-dom.js"],
        runAt: "document_start",
      },
    ]);
    await disableNavigatorGPC();
  } else {
    await deleteAllDynamicRules();
    await chrome.scripting.unregisterContentScripts({ ids: ["1"] });
  }
}

function onCheckEnabledMessageHandled(message, sendResponse) {
  const isEnabled = memoryDatabase.findIndex((domain) => domain === message.data) === -1 && !extensionDisabled;

  sendResponse({ isEnabled });
}

function onAppCommunicationMessageHandled(message, sendResponse) {
  new Promise((resolve) => {
    chrome.runtime.sendNativeMessage("Mee", { type: message.type, message: message.data }, (response) => {
      resolve(response);
    });
  })
    .then((response) => {
      sendResponse(response);
    })
    .catch((e) => {
      console.log("error: ", e);
      sendResponse(e);
    });
}

chrome.runtime.onInstalled.addListener(async function () {
  const extensionData = await getDomainData("meeExtension");
  const disable_domains = await getDisableDomains();
  const enabledExtension = !extensionData || extensionData.enabled;
  extensionDisabled = !enabledExtension;

  if (enabledExtension) {
    await chrome.scripting.registerContentScripts([
      {
        id: "1",
        matches: ["<all_urls>"],
        excludeMatches: getRegDomains(disable_domains),
        js: ["gpc-scripts/add-gpc-dom.js"],
        runAt: "document_start",
      },
    ]);
    await toggleGPCHeaders(1, "*");
    await addRulesForDisabledDomains();
  } else {
    await chrome.scripting.unregisterContentScripts(["1"]);
    await deleteAllDynamicRules();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.msg) {
    case "DOWNLOAD_WELLKNOWN": {
      afterDownloadWellknown(message, sender);
      return true;
    }
    case "UPDATE_SELECTOR": {
      if (message.mode === "enable") {
        enableNavigatorGPC();
      } else {
        disableNavigatorGPC();
      }
      toggleGPCHeaders(1, message.domain, message.mode);
      return true;
    }
    case "UPDATE_ENABLED": {
      changeExtensionEnabled();
      return true;
    }
    case "APP_COMMUNICATION": {
      if (import.meta.env.VITE_BROWSER === "safari") {
        onAppCommunicationMessageHandled(message, sendResponse);
        return true;
      }
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
