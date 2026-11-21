(function () {
  const databaseName = "moneytrack-local";
  const storeName = "transactions";
  let connection;

  function open() {
    if (connection) return Promise.resolve(connection);
    if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is not supported in this browser."));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("date", "date", { unique: false });
          store.createIndex("type", "type", { unique: false });
        }
      };
      request.onsuccess = () => {
        connection = request.result;
        connection.onversionchange = () => { connection.close(); connection = null; };
        resolve(connection);
      };
      request.onerror = () => reject(request.error || new Error("Could not open the local database."));
      request.onblocked = () => reject(new Error("The local database is blocked by another open tab."));
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("The database request failed."));
    });
  }

  async function getAll() {
    const db = await open();
    return requestResult(db.transaction(storeName, "readonly").objectStore(storeName).getAll());
  }

  async function save(transaction) {
    const db = await open();
    await requestResult(db.transaction(storeName, "readwrite").objectStore(storeName).put(transaction));
  }

  async function remove(id) {
    const db = await open();
    await requestResult(db.transaction(storeName, "readwrite").objectStore(storeName).delete(id));
  }

  window.MoneyTrackDB = { getAll, save, remove };
})();
