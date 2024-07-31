export function openDB(): IDBOpenDBRequest {
  return indexedDB.open("MeeWebExtensionDB", 1);
}

export function initDB() {
  const request = openDB();

  request.onupgradeneeded = function (event: IDBVersionChangeEvent) {
    const db = (event.target as IDBOpenDBRequest).result;
    const objectStore = db.createObjectStore("domains", { keyPath: "domain" });
    objectStore.createIndex("wellknown", "wellknown", { unique: false });
    objectStore.createIndex("enabled", "enabled", { unique: false });
    objectStore.createIndex("domain", "domain", { unique: true });
    const userStore = db.createObjectStore("user", { keyPath: "id" });
    userStore.createIndex("id", "id", { unique: true });
    userStore.createIndex("user_uid", "user_uid", { unique: true });
    db.close();
  };
}

export function addUserInfo(userUid: string) {
  const request = openDB();

  request.onsuccess = function (event) {
    const db = (event.target as IDBOpenDBRequest).result;
    const transaction = db.transaction(["user"], "readwrite");
    const objectStore = transaction.objectStore("user");

    const request_get = objectStore.get(1);

    request_get.onsuccess = (event: any) => {
      const old_data = event.target.result;
      if (!old_data) {
        const requestUpdate = objectStore.put({ id: 1, user_uid: userUid });
        requestUpdate.onerror = (event) => {
          console.warn("requestUpdate error", event);
        };
        // requestUpdate.onsuccess = (event) => {
        //   console.log("requestUpdate onsuccess", event);
        // };
      }
    };
  };
}

interface UserData {
  user_uid: string;
}
export async function getUserInfo(): Promise<UserData> {
  return new Promise((resolve, reject) => {
    const request = openDB();

    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["user"], "readwrite");
      const objectStore = transaction.objectStore("user");

      const request_get = objectStore.get(1);
      request_get.onerror = () => {
        reject(`Result: has't been found`);
      };
      request_get.onsuccess = (event: any) => {
        const data = event.target.result;
        resolve({ user_uid: data?.user_uid });
      };

      db.close();
    };
  });
}

interface DBRow {
  domain: string;
  wellknown: boolean;
  enabled: boolean;
}

export function addRowToDB(data: DBRow) {
  const request = openDB();

  request.onsuccess = function (event) {
    const db = (event.target as IDBOpenDBRequest).result;
    const transaction = db.transaction(["domains"], "readwrite");
    const objectStore = transaction.objectStore("domains");

    const request_get = objectStore.get(data.domain);

    request_get.onsuccess = (event: any) => {
      const old_data = event.target.result;
      const new_data =
        old_data && !old_data.enabled
          ? {
              domain: data.domain,
              wellknown: data.wellknown,
              enabled: false,
            }
          : data;
      const requestUpdate = objectStore.put(new_data);
      requestUpdate.onerror = (event) => {
        console.warn("requestUpdate error", event);
      };
      // requestUpdate.onsuccess = (event) => {
      //   console.log("requestUpdate onsuccess", event);
      // };
    };
  };
}

export function getDisableDomains(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const domains: string[] = [];
    const request = openDB();

    request.onerror = () => {
      reject("Error in openDB");
    };

    request.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");

      objectStore.openCursor().onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.enabled === false) {
            const domain = cursor.value.domain;
            domains.push(domain);
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

export async function getDomainData(parsedDomain: string): Promise<DBRow> {
  return new Promise((resolve, reject) => {
    const request = openDB();

    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");

      const request_get = objectStore.get(parsedDomain);
      request_get.onerror = () => {
        reject(`${parsedDomain} Result: has't been found`);
      };
      request_get.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      db.close();
    };
  });
}

export async function changeEnableDomain(parsedDomain: string): Promise<DBRow> {
  return new Promise((resolve, reject) => {
    const request = openDB();
    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");
      const request_get = objectStore.get(parsedDomain);
      request_get.onerror = () => {
        db.close();
        reject(`${parsedDomain} Result: has't been found`);
      };

      request_get.onsuccess = (event: any) => {
        const old_data = event.target.result;

        const new_data = {
          domain: parsedDomain,
          wellknown: old_data ? old_data.wellknown : false,
          enabled: old_data ? !old_data.enabled : false,
        };
        const requestUpdate = objectStore.put(new_data);
        requestUpdate.onerror = () => {
          db.close();
          reject("Error with put data");
        };
        requestUpdate.onsuccess = () => {
          db.close();
          resolve(new_data);
        };
      };
    };
  });
}
