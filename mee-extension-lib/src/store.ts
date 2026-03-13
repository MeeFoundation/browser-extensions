export function openDB(): IDBOpenDBRequest {
  return indexedDB.open("MeeWebExtensionDB", 8);
}

export function initDB() {
  const request = openDB();

  request.onupgradeneeded = function (event: IDBVersionChangeEvent) {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains("domains")) {
      const objectStore = db.createObjectStore("domains", {
        keyPath: "id",
        autoIncrement: true,
      });
      objectStore.createIndex("wellknown", "wellknown", { unique: false });
      objectStore.createIndex("enabled", "enabled", { unique: false });
      objectStore.createIndex("domain", "domain", { unique: true });
    }
    if (!db.objectStoreNames.contains("user")) {
      const userStore = db.createObjectStore("user", { keyPath: "id" });
      userStore.createIndex("id", "id", { unique: true });
      userStore.createIndex("user_uid", "user_uid", { unique: true });
    }
    if (!db.objectStoreNames.contains("settings")) {
      db.createObjectStore("settings", { keyPath: "key" });
    }
    if (event.oldVersion < 8 && db.objectStoreNames.contains("domains")) {
      const transaction = (event.target as IDBOpenDBRequest).transaction!;
      const store = transaction.objectStore("domains");
      store.openCursor().onsuccess = (e: any) => {
        const cursor: IDBCursorWithValue = e.target.result;
        if (cursor) {
          const row = cursor.value;
          if (!("varyHeaders" in row)) {
            cursor.update({ ...row, varyHeaders: [] });
          }
          cursor.continue();
        }
      };
    }
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

interface AddDBRow {
  domain: string;
  wellknown: boolean;
  enabled: boolean;
  msConfirmed?: boolean;
  varyHeaders?: string[];
  id?: number;
}
interface DBRow extends AddDBRow {
  id: number;
}

export function addRowToDB(data: AddDBRow) {
  const request = openDB();

  request.onsuccess = async function (event) {
    const db = (event.target as IDBOpenDBRequest).result;
    const transaction = db.transaction(["domains"], "readwrite");
    const objectStore = transaction.objectStore("domains");
    const request_getAll = objectStore.getAll();
    const old_data = await new Promise<DBRow | undefined>((resolve) => {
      request_getAll.onsuccess = (event: any) => {
        event.target.result.forEach((old_data: DBRow) => {
          if (old_data.domain === data.domain) {
            resolve(old_data);
          }
        });
        resolve(undefined);
      };
    });
    const new_data = old_data
      ? {
          ...old_data,
          enabled: old_data ? old_data.enabled : data.enabled,
          wellknown: data.wellknown,
          varyHeaders: data.varyHeaders ?? old_data.varyHeaders ?? [],
        }
      : { ...data, msConfirmed: data.msConfirmed ?? false, varyHeaders: data.varyHeaders ?? [] };

    const requestUpdate = objectStore.put(new_data);
    requestUpdate.onerror = (event) => {
      console.warn("requestUpdate error", event);
    };
  };
}

export function getDomains(): Promise<DBRow[]> {
  return new Promise((resolve, reject) => {
    const domains: DBRow[] = [];
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
          if (cursor.domain !== "meeExtension") {
            domains.push(cursor.value);
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

export async function getDisableDomains(): Promise<DBRow[]> {
  const domains = await getDomains();
  return domains.filter(domain => !domain.enabled);
}

export async function getDomainData(
  parsedDomain: string
): Promise<DBRow | undefined> {
  return new Promise((resolve, reject) => {
    const request = openDB();

    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = async function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");
      const request_get_all = objectStore.getAll();

      request_get_all.onsuccess = (event: any) => {
        event.target.result.forEach((old_data: DBRow) => {
          if (old_data.domain === parsedDomain) {
            resolve(old_data);
          }
        });
        resolve(undefined);
      };
      request_get_all.onerror = () => {
        reject(`${parsedDomain} Result: has't been found`);
      };
      db.close();
    };
  });
}

export async function changeEnableDomain(
  parsedDomain: string
): Promise<AddDBRow> {
  return new Promise((resolve, reject) => {
    const request = openDB();
    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = async function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");

      const request_get_all = objectStore.getAll();
      request_get_all.onerror = () => {
        db.close();
        reject(`${parsedDomain} Result: has't been found`);
      };
      const old_data = await new Promise<DBRow | undefined>((resolve2) => {
        request_get_all.onsuccess = (event: any) => {
          event.target.result.forEach((old_data: DBRow) => {
            if (old_data.domain === parsedDomain) {
              resolve2(old_data);
            }
          });
          resolve2(undefined);
        };
      });

      const new_data = old_data
        ? { ...old_data, enabled: !old_data.enabled }
        : {
            domain: parsedDomain,
            wellknown: false,
            enabled: false,
            msConfirmed: false,
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
  });
}

export async function getMySignalsEnabled(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = openDB();
    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["settings"], "readonly");
      const objectStore = transaction.objectStore("settings");
      const getRequest = objectStore.get("mySignalsEnabled");

      getRequest.onsuccess = (event: any) => {
        const data = event.target.result;
        resolve(data ? data.value : false);
      };
      getRequest.onerror = () => {
        resolve(false);
      };
      db.close();
    };
  });
}

export async function setMySignalsEnabled(enabled: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = openDB();
    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["settings"], "readwrite");
      const objectStore = transaction.objectStore("settings");
      const putRequest = objectStore.put({ key: "mySignalsEnabled", value: enabled });

      putRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      putRequest.onerror = () => {
        db.close();
        reject("Error saving MySignals setting");
      };
    };
  });
}

export async function setDomainMsConfirmed(
  domain: string,
  confirmed: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = openDB();
    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = async function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");
      const request_get_all = objectStore.getAll();

      request_get_all.onsuccess = (event: any) => {
        const records: DBRow[] = event.target.result;
        const domainRecord = records.find((r) => r.domain === domain);
        if (domainRecord) {
          const updated = { ...domainRecord, msConfirmed: confirmed };
          const putRequest = objectStore.put(updated);
          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          putRequest.onerror = () => {
            db.close();
            reject("Error updating msConfirmed");
          };
        } else {
          db.close();
          resolve();
        }
      };
      request_get_all.onerror = () => {
        db.close();
        reject("Error reading domains");
      };
    };
  });
}

export async function setDomainVaryHeaders(
  domain: string,
  headers: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = openDB();
    request.onerror = () => {
      reject("Error in openDB");
    };
    request.onsuccess = async function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["domains"], "readwrite");
      const objectStore = transaction.objectStore("domains");
      const request_get_all = objectStore.getAll();

      request_get_all.onsuccess = (event: any) => {
        const records: DBRow[] = event.target.result;
        const domainRecord = records.find((r) => r.domain === domain);
        if (domainRecord) {
          const updated = { ...domainRecord, varyHeaders: headers };
          const putRequest = objectStore.put(updated);
          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          putRequest.onerror = () => {
            db.close();
            reject("Error updating varyHeaders");
          };
        } else {
          db.close();
          resolve();
        }
      };
      request_get_all.onerror = () => {
        db.close();
        reject("Error reading domains");
      };
    };
  });
}

export async function getMsConfirmedDomains(): Promise<DBRow[]> {
  const domains = await getDomains();
  return domains.filter((domain) => domain.msConfirmed);
}
