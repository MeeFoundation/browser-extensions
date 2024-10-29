export function openDB(): IDBOpenDBRequest {
  return indexedDB.open("MeeWebExtensionDB", 6);
}

export function initDB() {
  const request = openDB();

  request.onupgradeneeded = function (event: IDBVersionChangeEvent) {
    const db = (event.target as IDBOpenDBRequest).result;
    const objectStore = db.createObjectStore("domains", {
      keyPath: "id",
      autoIncrement: true,
    });
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
        }
      : data;

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
