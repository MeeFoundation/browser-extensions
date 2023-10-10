export function openDB() {
  return indexedDB.open("MeeExtensionDB", 7);
}

export function initDB() {
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

export function addRowToDB(data) {
  const request = openDB();

  request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(["domains"], "readwrite");
    const objectStore = transaction.objectStore("domains");

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

export function getDisableDomains() {
  return new Promise((resolve, reject) => {
    const domains = [];
    const request = openDB();

    request.onerror = (event) => {
      reject();
    };

    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");

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
}

export async function getDomainData(parsedDomain) {
  return new Promise((resolve, reject) => {
    const request = openDB();

    request.onerror = (event) => {
      reject();
    };
    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");

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
}

export async function changeEnableDomain(parsedDomain) {
  return new Promise((resolve, reject) => {
    const request = openDB();
    request.onerror = (event) => {
      reject();
    };
    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");
      const request_get = objectStore.get(parsedDomain);
      request_get.onerror = (event) => {
        db.close();
        reject();
      };

      request_get.onsuccess = (event) => {
        const old_data = event.target.result;
        
        const new_data = {
          domain: parsedDomain,
          wellknown: old_data ? old_data.wellknown : false,
          enabled: old_data ? !old_data.enabled : false,
        };
        const requestUpdate = objectStore.put(new_data);
        requestUpdate.onerror = (event) => {
          db.close();
          reject();
        };
        requestUpdate.onsuccess = (event) => {
          db.close();
          resolve(true);
        };
      };
    };
  });
}

const visitedKey = "visitedKey"
export async function saveVisitedSite(data) {
  let newValue
  let currValue
  try {
    const curr = await chrome.storage.local.get([visitedKey])
    currValue = JSON.parse(curr[visitedKey]);
  } catch {
    currValue = []
  }
  newValue = currValue ? currValue : []

  const newDataObj = {}

  let updFlag = false
  newValue.forEach(el => {
    if (el.id === data.id) {
      el = data
      updFlag = true
    }
  })

  if (!updFlag) {
    newDataObj[visitedKey] = JSON.stringify([...newValue, data])
  } else {
    newDataObj[visitedKey] = JSON.stringify([...newValue])
  }

  await chrome.storage.local.set(newDataObj)
}
