(() => {
  class DictionaryService {
    constructor(options = {}) {
      this.manifestUrl = options.manifestUrl || "assets/dictionaries/runtime/ecdict/manifest.json";
      this.workerUrl = options.workerUrl || "src/dictionary/dictionary-worker.js?v=20260925-7";
      this.worker = null;
      this.sequence = 0;
      this.pending = new Map();
      this.progressListeners = new Set();
      this.manifest = null;
    }

    ensureWorker() {
      if (this.worker) return;
      this.worker = new Worker(this.workerUrl, { type: "module" });
      this.worker.addEventListener("message", (event) => {
        if (event.data?.type === "progress") {
          this.progressListeners.forEach((listener) => listener(event.data));
          return;
        }
        const task = this.pending.get(event.data?.id);
        if (!task) return;
        this.pending.delete(event.data.id);
        if (event.data.error) task.reject(new Error(event.data.error));
        else task.resolve(event.data.result);
      });
      this.worker.addEventListener("error", (event) => {
        const error = new Error(event.message || "词典 Worker 启动失败");
        this.pending.forEach((task) => task.reject(error));
        this.pending.clear();
      });
    }

    call(method, payload) {
      this.ensureWorker();
      const id = ++this.sequence;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.worker.postMessage({ id, method, payload });
      });
    }

    async loadManifest() {
      if (this.manifest) return this.manifest;
      const response = await fetch(this.manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`无法读取词典清单（${response.status}）`);
      this.manifest = await response.json();
      return this.manifest;
    }

    async status() {
      const [manifest, installed] = await Promise.all([
        this.loadManifest(),
        this.call("status")
      ]);
      const currentVersion = installed.metadata?.dictionary_version;
      return {
        ...installed,
        manifest,
        updateAvailable: Boolean(installed.installed && currentVersion && currentVersion !== manifest.version)
      };
    }

    async install() {
      const manifest = await this.loadManifest();
      const databaseUrl = new URL(manifest.file, new URL(this.manifestUrl, location.href)).href;
      return this.call("install", {
        databaseUrl,
        totalBytes: manifest.downloadBytes || manifest.databaseBytes,
        compression: manifest.format === "sqlite+gzip" ? "gzip" : "none",
        schemaVersion: manifest.schemaVersion,
        version: manifest.version
      });
    }

    remove() {
      return this.call("remove");
    }

    query(word) {
      return this.call("query", String(word || "").trim());
    }

    match(word, limit = 10, strip = false) {
      return this.call("match", { word: String(word || "").trim(), limit, strip });
    }

    count() {
      return this.call("count");
    }

    list(options = {}) {
      return this.call("list", options);
    }

    onProgress(listener) {
      this.progressListeners.add(listener);
      return () => this.progressListeners.delete(listener);
    }
  }

  window.langLSRWDictionary = new DictionaryService();
})();
