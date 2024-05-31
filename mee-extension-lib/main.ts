import {
  initDB,
  addRowToDB,
  getDisableDomains,
  getDomainData,
  changeEnableDomain,
} from "./src/store";
import { getDomainFromUrl, getRegDomain, getRegDomains } from "./src/string";
import { getCurrentParsedDomain } from "./src/browser";

export async function toggleGPCHeaders(
  id: number,
  domain: string,
  isSafari: boolean,
  mode: string = "enable"
) {
  // Safari doesn't give all Resources from type, so we need writing this array by hand
  const allResourceTypes = isSafari
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
          {
            header: "DNT",
            operation: "set",
            value: mode === "enable" ? "1" : "0",
          },
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
  /* @ts-ignore */
  chrome.declarativeNetRequest.updateDynamicRules(UpdateRuleOptions);
}

async function addRulesForDisabledDomains(isSafari: boolean) {
  let id = 1;
  const disable_domains = await getDisableDomains();
  if (disable_domains) {
    for (let domain of disable_domains) {
      await toggleGPCHeaders(id++, getRegDomain(domain), isSafari, "disable");
    }
  }
}

async function registerRules(isSafari: boolean) {
  try {
    const disable_domains = await getDisableDomains();
    await toggleGPCHeaders(1, "*", isSafari);
    await addRulesForDisabledDomains(isSafari);
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
  } catch (error) {
    console.log(`failed to register content scripts: ${error}`);
  }
}

async function disableNavigatorGPC() {
  try {
    const disable_domains = await getDisableDomains();
    if (disable_domains.length > 0)
      await chrome.scripting.updateContentScripts([
        {
          id: "1",
          matches: getRegDomains(disable_domains),
          js: ["gpc-scripts/disable-gpc-dom.js"],
          runAt: "document_start",
        },
      ]);
  } catch (error) {
    console.log(`failed to update content scripts: ${error}`);
  }
}

async function unregisterRules(isSafari: boolean) {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const scriptIds = scripts.map((script) => script.id);
    await deleteAllDynamicRules(isSafari);
    if (scriptIds.length)
      await chrome.scripting.unregisterContentScripts({ ids: scriptIds });
  } catch (error) {
    console.log(`failed to unregister content scripts: ${error}`);
  }
}

async function deleteAllDynamicRules(isSafari: boolean) {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map((rule) => rule.id);

  oldRuleIds.map(async (id) => {
    toggleGPCHeaders(id, "*", isSafari, "remove");
  });
}

export async function checkEnabledExtension() {
  const extensionData = await getDomainData("meeExtension");
  return !extensionData || extensionData.enabled;
}

export async function changeExtensionEnabled(isSafari: boolean) {
  const enabledExtension = await checkEnabledExtension();

  if (enabledExtension) {
    await registerRules(isSafari);
  } else {
    await unregisterRules(isSafari);
  }
}

export {
  getDomainData,
  changeEnableDomain,
  initDB,
  addRowToDB,
  getDisableDomains,
  getDomainFromUrl,
  getRegDomain,
  getRegDomains,
  getCurrentParsedDomain,
};
