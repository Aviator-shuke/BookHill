// Personal data store (see docs/USER_DATA.md, section 8).
// Every piece of a learner's data is a record { identity, id, scope, collection, key, value, updatedAt, deleted }.
// `scope` is "global" (per identity) or a learning-language id ("en", "es"). Records live in IndexedDB and the
// current identity's records are mirrored in memory, so the page reads synchronously; writes update memory at once
// and are flushed to IndexedDB in the background. Deletes keep a tombstone so imports and future sync can merge.
(function () {
  const DB_NAME = "langlsrw-userdata";
  const STORE = "records";
  const FORMAT = "langlsrw-userdata";
  const FORMAT_VERSION = 2;

  // Registry of personal data. Export, import, delete, and sync all work from this list.
  // kind "state": the latest value per key; kind "event": append-only history.
  // enabled: false keeps a collection's code but hides it: nothing is written, loaded, exported, or imported.
  // exportable: false keeps a collection on this device only: never exported, imported, or synced.
  // The answer records (practiceEvent, reviewEvent) are hidden until a feature uses them (docs/USER_DATA.md 8.2).
  const COLLECTIONS = {
    settings: { scope: "global", kind: "state" },
    localSecrets: { scope: "global", kind: "state", exportable: false },
    position: { scope: "language", kind: "state" },
    favoriteWord: { scope: "language", kind: "state" },
    favoriteSentence: { scope: "language", kind: "state" },
    wordProgress: { scope: "language", kind: "state" },
    newWordBatch: { scope: "language", kind: "state" },
    sentenceProgress: { scope: "language", kind: "state" },
    practiceEvent: { scope: "language", kind: "event", enabled: false },
    reviewEvent: { scope: "language", kind: "event", enabled: false },
    grammarResult: { scope: "language", kind: "state" },
    customLibrary: { scope: "language", kind: "state" }
  };

  let db = null;
  let persistent = true;
  let identity = "";
  let version = 0;
  const cache = new Map();
  const pending = new Map();
  let flushTimer = 0;
  let eventCounter = 0;
  const listeners = new Set();

  function recordId(scope, collection, key) {
    return `${scope}\u0001${collection}\u0001${key}`;
  }

  function requireCollection(collection) {
    if (!COLLECTIONS[collection]) throw new Error(`未登记的个人数据：${collection}`);
    return COLLECTIONS[collection];
  }

  function isActive(collection) {
    return Boolean(COLLECTIONS[collection]) && COLLECTIONS[collection].enabled !== false;
  }

  function isPortable(collection) {
    return isActive(collection) && COLLECTIONS[collection].exportable !== false;
  }

  function openDatabase() {
    if (db) return Promise.resolve(db);
    if (!("indexedDB" in window)) return Promise.reject(new Error("浏览器不支持 IndexedDB"));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: ["identity", "id"] });
        store.createIndex("identity", "identity");
      };
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readIdentity(identityId) {
    const database = await openDatabase();
    const store = database.transaction(STORE, "readonly").objectStore(STORE);
    return requestResult(store.index("identity").getAll(identityId));
  }

  function scheduleFlush() {
    if (!persistent) return;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 300);
  }

  async function flush() {
    clearTimeout(flushTimer);
    if (!persistent || !pending.size) return;
    const records = [...pending.values()];
    pending.clear();
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        records.forEach((record) => store.put(record));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      records.forEach((record) => {
        if (!pending.has(`${record.identity}\u0002${record.id}`)) pending.set(`${record.identity}\u0002${record.id}`, record);
      });
      console.error("个人数据保存失败", error);
      scheduleFlush();
    }
  }

  function changed() {
    version += 1;
    listeners.forEach((listener) => listener());
  }

  function writeRecord(record) {
    cache.set(record.id, record);
    pending.set(`${record.identity}\u0002${record.id}`, record);
    changed();
    scheduleFlush();
  }

  // Opens an identity ("local:<name>", "cloud:<id>", or "guest") and loads its records into memory.
  async function open(identityId) {
    await flush();
    identity = String(identityId || "guest");
    cache.clear();
    try {
      // Records of collections no longer registered (e.g. a removed feature) are ignored.
      (await readIdentity(identity)).forEach((record) => {
        if (isActive(record.collection)) cache.set(record.id, record);
      });
      persistent = true;
    } catch (error) {
      persistent = false;
      console.error("个人数据只能暂存在本页（无法使用 IndexedDB）", error);
    }
    changed();
    return identity;
  }

  function get(collection, key, scope) {
    requireCollection(collection);
    const record = cache.get(recordId(scope, collection, key));
    return record && !record.deleted ? record.value : undefined;
  }

  function entries(collection, scope) {
    requireCollection(collection);
    const prefix = `${scope}\u0001${collection}\u0001`;
    const result = [];
    cache.forEach((record, id) => {
      if (!record.deleted && id.startsWith(prefix)) result.push({ key: record.key, value: record.value, updatedAt: record.updatedAt });
    });
    return result;
  }

  function put(collection, key, value, scope) {
    requireCollection(collection);
    if (!identity || !isActive(collection)) return;
    writeRecord({
      identity, id: recordId(scope, collection, key), scope, collection, key: String(key), value, updatedAt: Date.now(), deleted: false
    });
  }

  function remove(collection, key, scope) {
    requireCollection(collection);
    const id = recordId(scope, collection, key);
    const existing = cache.get(id);
    if (!existing || existing.deleted) return;
    writeRecord({ ...existing, value: null, updatedAt: Date.now(), deleted: true });
  }

  // Appends an event and returns its key (time-ordered, unique within this page).
  function append(collection, value, scope) {
    if (requireCollection(collection).kind !== "event") throw new Error(`${collection} 不是事件记录`);
    if (!isActive(collection)) return "";
    eventCounter = (eventCounter + 1) % 1296;
    const key = `${Date.now().toString(36)}${eventCounter.toString(36).padStart(2, "0")}`;
    put(collection, key, value, scope);
    return key;
  }

  // The whole identity as a portable document: { format, version, exportedAt, identity, global, languages }.
  // Each collection maps key -> [value, updatedAt]; deleted records are kept as [null, updatedAt, 1].
  function exportDocument(meta = {}) {
    const document = { format: FORMAT, version: FORMAT_VERSION, exportedAt: Date.now(), identity: meta.identity || { id: identity }, global: {}, languages: {} };
    cache.forEach((record) => {
      if (!isPortable(record.collection)) return;
      const target = record.scope === "global"
        ? document.global
        : (document.languages[record.scope] ||= {});
      const collection = (target[record.collection] ||= {});
      collection[record.key] = record.deleted ? [null, record.updatedAt, 1] : [record.value, record.updatedAt];
    });
    return document;
  }

  function documentRecords(document) {
    const records = [];
    const addScope = (scope, collections) => {
      Object.entries(collections || {}).forEach(([collection, items]) => {
        if (!isPortable(collection) || !items || typeof items !== "object") return;
        Object.entries(items).forEach(([key, entry]) => {
          if (!Array.isArray(entry)) return;
          records.push({ scope, collection, key, value: entry[0], updatedAt: Number(entry[1]) || 0, deleted: entry[2] === 1 });
        });
      });
    };
    addScope("global", document.global);
    Object.entries(document.languages || {}).forEach(([scope, collections]) => addScope(scope, collections));
    return records;
  }

  function isDocument(document) {
    return Boolean(document && document.format === FORMAT && Number(document.version) === FORMAT_VERSION);
  }

  // Merges a document into the current identity: a record is taken when it is new or newer than the local copy.
  // With { dryRun: true } only counts what would change.
  function importDocument(document, { dryRun = false } = {}) {
    if (!isDocument(document)) throw new Error("不是有效的个人数据文件（只支持新版格式）");
    const counts = { added: 0, updated: 0, unchanged: 0 };
    documentRecords(document).forEach((incoming) => {
      const id = recordId(incoming.scope, incoming.collection, incoming.key);
      const existing = cache.get(id);
      if (existing && existing.updatedAt >= incoming.updatedAt) {
        counts.unchanged += 1;
        return;
      }
      if (existing) counts.updated += 1;
      else if (!incoming.deleted) counts.added += 1;
      else return;
      if (dryRun) return;
      const record = { identity, id, scope: incoming.scope, collection: incoming.collection, key: incoming.key, value: incoming.deleted ? null : incoming.value, updatedAt: incoming.updatedAt, deleted: incoming.deleted };
      cache.set(id, record);
      pending.set(`${identity}\u0002${id}`, record);
    });
    if (!dryRun && (counts.added || counts.updated)) {
      changed();
      scheduleFlush();
    }
    return counts;
  }

  // Removes every record of an identity (deleting a local user).
  async function deleteIdentity(identityId) {
    await flush();
    const target = String(identityId || "");
    if (!target) return;
    if (target === identity) cache.clear();
    [...pending.keys()].forEach((key) => {
      if (key.startsWith(`${target}\u0002`)) pending.delete(key);
    });
    try {
      const database = await openDatabase();
      const records = await readIdentity(target);
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        records.forEach((record) => store.delete([record.identity, record.id]));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("删除个人数据失败", error);
    }
    changed();
  }

  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  window.langLSRWUserData = {
    collections: COLLECTIONS,
    isActive,
    get identity() { return identity; },
    get version() { return version; },
    get persistent() { return persistent; },
    open,
    get,
    entries,
    put,
    remove,
    append,
    flush,
    exportDocument,
    importDocument,
    isDocument,
    deleteIdentity,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
})();
