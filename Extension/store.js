
export function openDB() {
  return indexedDB.open("MeeExtensionDB", 6);
}

export async function initDB() {
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

export async function getDisableDomains() {
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

export async function getDomainData(parsedDomain) {
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

export async function changeEnableDomain(parsedDomain) {
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

  return await promise
    .then((result) => {
      return result;
    })
    .catch(() => {
      return false;
    });
}

