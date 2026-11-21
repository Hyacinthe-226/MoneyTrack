(function () {
  const databaseName = "moneytrack-local";
  const storeName = "transactions";
  const outboxStoreName = "sync-outbox";
  let connection;

  function open() {
    if (connection) return Promise.resolve(connection);
    if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is not supported in this browser."));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("date", "date", { unique: false });
          store.createIndex("type", "type", { unique: false });
        }
        if (!db.objectStoreNames.contains(outboxStoreName)) db.createObjectStore(outboxStoreName, { keyPath: "id" });
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

  async function queueOutbox(item) {
    const db = await open();
    await requestResult(db.transaction(outboxStoreName, "readwrite").objectStore(outboxStoreName).put(item));
  }

  async function flushOutbox() {
    if (!navigator.onLine) return false;
    const db = await open();
    const items = await requestResult(db.transaction(outboxStoreName, "readonly").objectStore(outboxStoreName).getAll());
    if (!items.length) return false;
    const endpoint = localStorage.getItem("moneytrack-sync-endpoint");
    if (!endpoint) return false;
    for (const item of items) {
      const response = await fetch(endpoint, { method: item.action === "delete" ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.transaction || { id: item.id }) });
      if (!response.ok) throw new Error("Online sync failed.");
      await requestResult(db.transaction(outboxStoreName, "readwrite").objectStore(outboxStoreName).delete(item.id));
    }
    return true;
  }

  window.MoneyTrackDB = { getAll, save, remove, queueOutbox, flushOutbox };
})();
