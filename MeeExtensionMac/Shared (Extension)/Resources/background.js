function openDB() {
  return indexedDB.open("MeeExtensionDB");
}

function initDB() {
  const request = openDB();

  request.onupgradeneeded = function (event) {
    const db = event.target.result;
    const objectStore = db.createObjectStore("domains", { keyPath: "domain" });
    objectStore.createIndex("wellknown", "wellknown", { unique: false });
    objectStore.createIndex("enabled", "enabled", { unique: false });
    objectStore.createIndex("domain", "enabled", { unique: true });
    db.close();
  };
}

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
            "webtransport",
            "webbundle",
            "other",
          ],
        },
      },
    ],
    removeRuleIds: [id],
  };
  await chrome.declarativeNetRequest.updateDynamicRules(UpdateRuleOptions);
}

async function deleteAllDynamicRules() {
  let MAX_RULES =
    chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES;
  let UpdateRuleOptions = { removeRuleIds: [...Array(MAX_RULES).keys()] };
  await chrome.declarativeNetRequest.updateDynamicRules(UpdateRuleOptions);
}

async function addRulesForDisabledDomains() {
  let id = 1;
  const disable_domains = await getDisableDomains();
  if (disable_domains) {
    let excludeMatches = [];
    for (let domain of disable_domains) {
      await addDynamicRule(id++, domain);
      excludeMatches.push(`*://${domain}/*`);
    }

    chrome.scripting.updateContentScripts([
      {
        id: "1",
        matches: ["<all_urls>"],
        excludeMatches: excludeMatches,
        js: ["add-gpc-dom.js"],
        runAt: "document_start",
      },
    ]);
  }
}

function addRowToDB(data) {
  const request = openDB();

  request.onsuccess = function (event) {
    let db = event.target.result;
    var transaction = db.transaction(["domains"], "readwrite");
    var objectStore = transaction.objectStore("domains");

    const request_get = objectStore.get(data.domain);

    request_get.onsuccess = (event) => {
      const old_data = event.target.result;
      const new_data =
        old_data && !old_data.enabled
          ? {
              domain: data.domain,
              wellknown: data.gpc,
              enabled: false,
            }
          : data;
      const requestUpdate = objectStore.put(new_data);
      requestUpdate.onerror = (event) => {
        console.warn("requestUpdate error", event);
      };
      requestUpdate.onsuccess = (event) => {
        console.log("requestUpdate onsuccess", event);
      };
    };
  };
}

async function getDisableDomains() {
  const promise = new Promise((resolve, reject) => {
    const domains = [];
    const request = openDB();

    request.onerror = (event) => {
      reject();
    };

    request.onsuccess = function (event) {
      let db = event.target.result;
      var transaction = db.transaction(["domains"], "readwrite");
      var objectStore = transaction.objectStore("domains");

      objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.enabled === false) {
            domains.push(cursor.value.domain);
          }

          cursor.continue();
        } else {
          resolve(domains);
        }
      };

      db.close();
    };
  });

  return await promise.then((domains) => {
    return domains;
  });
}

function afterDownloadWellknown(message, sender) {
  let tabID = sender.tab.id;
  let url = new URL(sender.origin);

  let domain = url.hostname.replace("www.", "");
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

async function onMessageHandlerAsync(message, sender, sendResponse) {
  switch (message.msg) {
    case "DOWNLOAD_WELLKNOWN": {
      afterDownloadWellknown(message, sender);
      break;
    }
    case "UPDATE_SELECTOR": {
      await deleteAllDynamicRules();
      await addRulesForDisabledDomains();
      break;
    }
  }
  return true;
}

initDB();

chrome.runtime.onMessage.addListener(onMessageHandlerAsync);

chrome.runtime.onInstalled.addListener(async function (details) {
  await chrome.scripting.registerContentScripts([
    {
      id: "1",
      matches: ["<all_urls>"],
      excludeMatches: [],
      js: ["add-gpc-dom.js"],
      runAt: "document_start",
    },
  ]);

  await addRulesForDisabledDomains();
});
