import {
  initDB,
  addRowToDB,
  getDomains,
  getDisableDomains,
  getDomainData,
  changeEnableDomain,
  addUserInfo,
  getUserInfo,
  getMySignalsEnabled,
  setMySignalsEnabled,
  setDomainMsConfirmed,
  setDomainVaryHeaders,
  getMsConfirmedDomains,
} from "./src/store";
import { getDomainFromUrl, getRegDomain, getRegDomains } from "./src/string";
import { getCurrentParsedDomain } from "./src/browser";

function getAllResourceTypes(isSafari: boolean) {
  // Safari doesn't give all Resources from type, so we need writing this array by hand
  return isSafari
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
}

export async function toggleGPCHeaders(
  id: number,
  domain: string,
  isSafari: boolean,
  mode: string = "enable"
) {
  const allResourceTypes = getAllResourceTypes(isSafari);

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

export async function toggleMSHeaders(
  id: number,
  domain: string,
  isSafari: boolean,
  mode: "sec-ms" | "sec-ms-gpc" | "remove"
) {
  const allResourceTypes = getAllResourceTypes(isSafari);

  let headers;
  if (mode === "remove") {
    headers = [
      { header: "Sec-MS", operation: "remove" },
      { header: "Sec-MS-GPC", operation: "remove" },
    ];
  } else if (mode === "sec-ms") {
    headers = [
      { header: "Sec-MS", operation: "set", value: "1" },
    ];
  } else {
    // sec-ms-gpc: replaces Sec-MS with Sec-MS-GPC for confirmed domains
    headers = [
      { header: "Sec-MS", operation: "remove" },
      { header: "Sec-MS-GPC", operation: "set", value: "1" },
    ];
  }

  let priority;
  if (id === 2) {
    priority = 2;
  } else if (mode === "remove") {
    priority = 5;
  } else {
    priority = 4;
  }

  let UpdateRuleOptions = {
    addRules: [
      {
        id: id,
        priority: priority,
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

async function addDynamicRules(isSafari: boolean) {
  let id = 1;
  const domains = await getDomains();
  if (domains.length) {
    for (let domainData of domains) {
      let new_id = id + domainData.id;
      await toggleGPCHeaders(
        new_id,
        getRegDomain(domainData.domain),
        isSafari,
        domainData.enabled ? "enable" : "remove"
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
  const mySignalsEnabled = await getMySignalsEnabled();

  if (domainData) {
    if (mySignalsEnabled) {
      if (domainData.enabled) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [300 + domainData.id],
        });
        if (domainData.msConfirmed) {
          await toggleMSHeaders(
            200 + domainData.id,
            getRegDomain(domainData.domain),
            isSafari,
            "sec-ms-gpc"
          );
        }
      } else {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [200 + domainData.id],
        });
        await toggleMSHeaders(
          300 + domainData.id,
          getRegDomain(domainData.domain),
          isSafari,
          "remove"
        );
      }
    } else {
      updateNavigatorGPCScripts();
      toggleGPCHeaders(
        100 + domainData.id,
        domainData.domain,
        isSafari,
        domainData.enabled ? "enable" : "remove"
      );
    }
  }
}

async function registerRules(isSafari: boolean) {
  try {
    const oldRuleIds = (
      await chrome.declarativeNetRequest.getDynamicRules()
    ).map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
    });
    await toggleGPCHeaders(1, "*", isSafari);
    await addDynamicRules(isSafari);

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

    const oldRuleIds = (
      await chrome.declarativeNetRequest.getDynamicRules()
    ).map((rule) => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
    });

    toggleGPCHeaders(1, "*", isSafari, "remove");
  } catch (error) {
    console.warn(`failed to unregister content scripts: ${error}`);
  }
}

async function registerMySignalsRules(isSafari: boolean) {
  try {
    const oldRuleIds = (
      await chrome.declarativeNetRequest.getDynamicRules()
    ).map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
    });

    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ["universal_GPC"],
    });

    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const scriptIds = scripts.map((s) => s.id);
    if (scriptIds.length) {
      await chrome.scripting.unregisterContentScripts({ ids: scriptIds });
    }

    await toggleMSHeaders(2, "*", isSafari, "sec-ms");

    const domains = await getDomains();
    for (const domainData of domains) {
      if (domainData.msConfirmed && domainData.enabled) {
        await toggleMSHeaders(
          200 + domainData.id,
          getRegDomain(domainData.domain),
          isSafari,
          "sec-ms-gpc"
        );
      }
      if (!domainData.enabled) {
        await toggleMSHeaders(
          300 + domainData.id,
          getRegDomain(domainData.domain),
          isSafari,
          "remove"
        );
      }
    }
  } catch (error) {
    console.warn(`Failed to register MySignals rules: ${error}`);
  }
}

async function unregisterMySignalsRules(isSafari: boolean) {
  try {
    const oldRuleIds = (
      await chrome.declarativeNetRequest.getDynamicRules()
    ).map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
    });

    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["universal_GPC"],
    });

    await registerRules(isSafari);
  } catch (error) {
    console.warn(`Failed to unregister MySignals rules: ${error}`);
  }
}

export async function switchMySignalsMode(isSafari: boolean) {
  const mySignalsEnabled = await getMySignalsEnabled();
  const extensionEnabled = await checkEnabledExtension();

  if (!extensionEnabled) {
    return;
  }

  if (mySignalsEnabled) {
    await registerMySignalsRules(isSafari);
  } else {
    await unregisterMySignalsRules(isSafari);
  }
}

export async function handleProbeResult(
  domain: string,
  confirmed: boolean,
  isSafari: boolean
) {
  if (confirmed) {
    await setDomainMsConfirmed(domain, true);
    const domainData = await getDomainData(domain);
    if (domainData && domainData.enabled) {
      await toggleMSHeaders(
        200 + domainData.id,
        getRegDomain(domainData.domain),
        isSafari,
        "sec-ms-gpc"
      );
    }
  }
}

export async function checkEnabledExtension() {
  const extensionData = await getDomainData("meeExtension");
  return !extensionData || extensionData.enabled;
}

export async function changeExtensionEnabled(isSafari: boolean) {
  const enabledExtension = await checkEnabledExtension();
  const mySignalsEnabled = await getMySignalsEnabled();

  if (enabledExtension) {
    if (mySignalsEnabled) {
      await registerMySignalsRules(isSafari);
    } else {
      await registerRules(isSafari);
    }
  } else {
    await unregisterRules(isSafari);
    if (mySignalsEnabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ["universal_GPC"],
      });
    }
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
  getMySignalsEnabled,
  setMySignalsEnabled,
  setDomainMsConfirmed,
  setDomainVaryHeaders,
  getMsConfirmedDomains,
};
