let parsedDomain;

function getCurrentParsedDomain() {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        let url = new URL(tab.url);
        let currentUrl = url.hostname.replace("www.", "");
        resolve(currentUrl);
      });
    } catch (e) {
      reject();
    }
  });
}

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
initDB();

let enabled = false;
let has_wellknown = false;

async function getDomainData(parsedDomain) {
  const promise = new Promise((resolve, reject) => {
    const request = openDB();

    request.onerror = (event) => {
      reject();
    };
    request.onsuccess = function (event) {
      let db = event.target.result;
      var transaction = db.transaction(["domains"], "readwrite");
      var objectStore = transaction.objectStore("domains");

      const request_get = objectStore.get(parsedDomain);
      request_get.onerror = (event) => {
        reject();
      };
      request_get.onsuccess = (event) => {
        resolve(event.target.result);
      };

      db.close();
    };
  });

  return await promise.then((result) => {
    return result;
  });
}

document.addEventListener("DOMContentLoaded", async (event) => {
  parsedDomain = await getCurrentParsedDomain();
  document.getElementById("current-domain").innerHTML = parsedDomain
    ? parsedDomain
    : "Undefined";

  chrome.runtime.sendMessage({
    msg: "POPUP_LOADED",
    data: null,
  });

  await checkDomain(parsedDomain);
});

document.getElementById("slider").checked = enabled;

function getEnabled(domainData, wellknownData = null) {
  if (domainData) {
    return domainData.enabled;
  } else if (wellknownData && wellknownData.gpc) {
    return true;
  } else {
    return false;
  }
}

function getWellknown(domainData, wellknownData = null) {
  if (
    (domainData && domainData.wellknown) ||
    (wellknownData && wellknownData.gpc)
  ) {
    return true;
  } else {
    return false;
  }
}

async function checkDomain(parsedDomain, wellknownData = null) {
  const domainData = await getDomainData(parsedDomain);
  enabled = getEnabled(domainData, wellknownData);
  has_wellknown = getWellknown(domainData, wellknownData);

  document.getElementById("slider").checked = enabled;
}

chrome.runtime.onMessage.addListener(function (message, _, __) {
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    let { domain, wellknownData } = message.data;

    if (domain === parsedDomain) {
      checkDomain(parsedDomain, wellknownData);
    }
  }
});

document.getElementById("slider").addEventListener("click", async () => {
  if (!parsedDomain) {
    parsedDomain = await getCurrentParsedDomain();
  }

  const request = openDB();

  request.onsuccess = function (event) {
    let db = event.target.result;
    var transaction = db.transaction(["domains"], "readwrite");
    var objectStore = transaction.objectStore("domains");
    const request_get = objectStore.get(parsedDomain);

    request_get.onsuccess = (event) => {
      const old_data = event.target.result;

      const new_data = {
        domain: parsedDomain,
        wellknown: old_data.wellknown,
        enabled: !old_data.enabled,
      };
      const requestUpdate = objectStore.put(new_data);
      requestUpdate.onerror = (event) => {
        console.warn("requestUpdate error", event);
      };
      requestUpdate.onsuccess = (event) => {
        console.log("requestUpdate onsuccess", event);

        chrome.runtime.sendMessage({
          msg: "UPDATE_SELECTOR",
        });
      };
    };
    db.close();

    checkDomain(parsedDomain);
  };
});
