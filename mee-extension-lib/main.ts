import {
  initDB,
  addRowToDB,
  getDisableDomains,
  getDomainData,
  changeEnableDomain,
  addUserInfo,
  getUserInfo,
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
            value: "1",
          },
          {
            header: "DNT",
            operation: "set",
            value: "1",
          },
        ];

  let UpdateRuleOptions = {
    addRules: [
      {
        id: id,
        priority: id === 1 ? 2 : 3,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
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
  const domains = await getDisableDomains();
  if (domains.length) {
    for (let domainData of domains) {
      let new_id = id + domainData.id;
      await toggleGPCHeaders(
        new_id,
        getRegDomain(domainData.domain),
        isSafari,
        "remove"
      );
    }
  }
}

async function updateNavigatorGPCScripts() {
  try {
    const disable_domains_data = await getDisableDomains();
    const disable_domains = disable_domains_data.map(
      (domain_data) => domain_data.domain
    );
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const isBaseScriptExist = scripts.find((script) => script.id === "1");
    const isDisabledScriptExist = scripts.find((script) => script.id === "2");

    isBaseScriptExist
      ? await chrome.scripting.updateContentScripts([
          {
            id: "1",
            matches: ["<all_urls>"],
            excludeMatches: getRegDomains(disable_domains),
            js: ["gpc-scripts/add-gpc-dom.js"],
            runAt: "document_start",
          },
        ])
      : await chrome.scripting.registerContentScripts([
          {
            id: "1",
            matches: ["<all_urls>"],
            excludeMatches: getRegDomains(disable_domains),
            js: ["gpc-scripts/add-gpc-dom.js"],
            runAt: "document_start",
          },
        ]);

    if (disable_domains.length) {
      isDisabledScriptExist
        ? await chrome.scripting.updateContentScripts([
            {
              id: "2",
              matches: getRegDomains(disable_domains),
              js: ["gpc-scripts/disable-gpc-dom.js"],
              runAt: "document_start",
            },
          ])
        : await chrome.scripting.registerContentScripts([
            {
              id: "2",
              matches: getRegDomains(disable_domains),
              js: ["gpc-scripts/disable-gpc-dom.js"],
              runAt: "document_start",
            },
          ]);
    } else if (isDisabledScriptExist) {
      await chrome.scripting.unregisterContentScripts({ ids: ["2"] });
    }
  } catch (error) {
    console.warn(`failed to update content scripts: ${error}`);
  }
}

export async function updateSelector(domain: string, isSafari: boolean) {
  const domainData = await getDomainData(domain);

  if (domainData) {
    updateNavigatorGPCScripts();
    toggleGPCHeaders(
      100 + domainData.id,
      domainData.domain,
      isSafari,
      domainData.enabled ? "enable" : "remove"
    );
  }
}

async function registerRules(isSafari: boolean) {
  try {
    await toggleGPCHeaders(1, "*", isSafari);
    await addRulesForDisabledDomains(isSafari);

    await updateNavigatorGPCScripts();
  } catch (error) {
    console.warn(`failed to register content scripts: ${error}`);
  }
}

async function unregisterRules(isSafari: boolean) {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const scriptIds = scripts.map((script) => script.id);

    if (scriptIds.length) {
      await chrome.scripting.unregisterContentScripts({ ids: scriptIds });
    }

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map((rule) => rule.id);

    oldRuleIds.map(async (id) => {
      await toggleGPCHeaders(id, "*", isSafari, "remove");
    });
  } catch (error) {
    console.warn(`failed to unregister content scripts: ${error}`);
  }
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
  addUserInfo,
  getUserInfo,
};
