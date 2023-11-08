import { initDB, addRowToDB, getDisableDomains, getDomainData } from "./store.js";
import { getDomainFromUrl } from "./utils/string";

initDB();

let memoryDatabase = [];
let extensionDisabled = false;

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

async function toggleGPCHeaders(id, domain, mode = "enable") {
  const allResourceTypes = Object.values(chrome.declarativeNetRequest.ResourceType);
  console.log(id, domain);
  let UpdateRuleOptions = {
    addRules: [
      {
        id: id,
        priority: 2,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "Sec-GPC", operation: "set", value: mode === "enable" ? "1" : "0" },
            { header: "DNT", operation: "set", value: mode === "enable" ? "1" : "0" },
          ],
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
  console.log(`Rules has been ${mode}d`);
}

async function deleteAllDynamicRules() {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map((rule) => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
  console.log(`Rules has been removed`);
}

async function addRulesForDisabledDomains() {
  let id = 1;
  const disable_domains = await getDisableDomains();
  if (disable_domains) {
    memoryDatabase = disable_domains;
    let excludeMatches = [];
    for (let domain of disable_domains) {
      await toggleGPCHeaders(id++, domain, "disable");
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

function onCheckEnabledMessageHandled(message, sendResponse) {
  const isEnabled = memoryDatabase.findIndex((domain) => domain === message.data) === -1 && !extensionDisabled;
  sendResponse({ isEnabled: isEnabled });
}

function onAppCommunicationMessageHandled(message, sendResponse) {
  new Promise((resolve) => {
    chrome.runtime.sendNativeMessage("Mee", { type: message.type, message: message.data }, function (response) {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.msg) {
    case "DOWNLOAD_WELLKNOWN": {
      afterDownloadWellknown(message, sender);
      return true;
    }
    case "UPDATE_SELECTOR": {
      deleteAllDynamicRules();
      toggleGPCHeaders(1, message.domain, message.mode);
      return true;
    }
    case "UPDATE_ENABLED": {
      changeExtensionEnabled();
      return true;
    }
    case "APP_COMMUNICATION": {
      onAppCommunicationMessageHandled(message, sendResponse);
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
