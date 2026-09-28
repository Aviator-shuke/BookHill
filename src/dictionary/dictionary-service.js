(() => {
  const DICTIONARY_PACKAGES = {
    ecdict: {
      id: "ecdict",
      languageId: "en",
      label: "英语",
      manifestUrl: "assets/dictionaries/runtime/ecdict/manifest.json",
      databaseName: "/ecdict.sqlite",
      testWord: "dictionary"
    },
    "spanish-wiktionary": {
      id: "spanish-wiktionary",
      languageId: "es",
      label: "西语",
      manifestUrl: "assets/dictionaries/runtime/spanish-wiktionary/manifest.json",
      databaseName: "/spanish-wiktionary.sqlite",
      testWord: "gratis"
    }
  };

  class DictionaryService {
    constructor(options = {}) {
      this.packages = options.packages || DICTIONARY_PACKAGES;
      this.activeDictionaryId = options.activeDictionaryId || "ecdict";
      this.workerUrl = options.workerUrl || "src/dictionary/dictionary-worker.js?v=20260928-1";
      this.worker = null;
      this.sequence = 0;
      this.pending = new Map();
      this.progressListeners = new Set();
      this.manifests = new Map();
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

    dictionary(id = this.activeDictionaryId) {
      const dictionary = this.packages[id];
      if (!dictionary) throw new Error(`未知词典：${id}`);
      return dictionary;
    }

    listPackages() {
      return Object.values(this.packages);
    }

    setActiveDictionary(id) {
      this.dictionary(id);
      this.activeDictionaryId = id;
    }

    activeDictionary() {
      return this.dictionary(this.activeDictionaryId);
    }

    async loadManifest(id = this.activeDictionaryId) {
      const dictionary = this.dictionary(id);
      if (this.manifests.has(id)) return this.manifests.get(id);
      const response = await fetch(dictionary.manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`无法读取词典清单（${response.status}）`);
      const manifest = await response.json();
      this.manifests.set(id, manifest);
      return manifest;
    }

    workerDictionary(id = this.activeDictionaryId) {
      const dictionary = this.dictionary(id);
      return {
        id: dictionary.id,
        languageId: dictionary.languageId,
        databaseName: dictionary.databaseName
      };
    }

    // Frequency ranks shipped beside a dictionary package (manifest `frequency`); the Worker imports them into the
    // installed database when their version changes. Dictionaries without ranks return null.
    async frequencyOptions(id = this.activeDictionaryId) {
      const dictionary = this.dictionary(id);
      const manifest = await this.loadManifest(id).catch(() => null);
      const frequency = manifest?.frequency;
      if (!frequency?.file || !frequency.version) return null;
      return {
        url: new URL(frequency.file, new URL(dictionary.manifestUrl, location.href)).href,
        version: String(frequency.version)
      };
    }

    async status(id = this.activeDictionaryId) {
      const [manifest, installed] = await Promise.all([
        this.loadManifest(id),
        this.call("status", { dictionary: this.workerDictionary(id) })
      ]);
      const currentVersion = installed.metadata?.dictionary_version;
      return {
        ...installed,
        manifest,
        package: this.dictionary(id),
        updateAvailable: Boolean(installed.installed && currentVersion && currentVersion !== manifest.version)
      };
    }

    async statuses() {
      const entries = await Promise.all(this.listPackages().map((dictionary) => (
        this.status(dictionary.id).catch((error) => ({ package: dictionary, error }))
      )));
      return entries;
    }

    async install(id = this.activeDictionaryId) {
      const dictionary = this.dictionary(id);
      const manifest = await this.loadManifest(id);
      const databaseUrl = new URL(manifest.file, new URL(dictionary.manifestUrl, location.href)).href;
      return this.call("install", {
        dictionary: this.workerDictionary(id),
        databaseUrl,
        totalBytes: manifest.downloadBytes || manifest.databaseBytes,
        compression: manifest.format === "sqlite+gzip" ? "gzip" : "none",
        schemaVersion: manifest.schemaVersion,
        version: manifest.version,
        dictionaryId: manifest.id || dictionary.id,
        frequency: await this.frequencyOptions(id)
      });
    }

    remove(id = this.activeDictionaryId) {
      return this.call("remove", { dictionary: this.workerDictionary(id) });
    }

    async query(word, id = this.activeDictionaryId) {
      return this.call("query", { dictionary: this.workerDictionary(id), frequency: await this.frequencyOptions(id), word: String(word || "").trim() });
    }

    async queryMany(words, id = this.activeDictionaryId) {
      return this.call("queryMany", { dictionary: this.workerDictionary(id), frequency: await this.frequencyOptions(id), words: Array.isArray(words) ? words : [] });
    }

    match(word, limit = 10, strip = false, id = this.activeDictionaryId) {
      return this.call("match", { dictionary: this.workerDictionary(id), word: String(word || "").trim(), limit, strip });
    }

    count(id = this.activeDictionaryId) {
      return this.call("count", { dictionary: this.workerDictionary(id) });
    }

    async list(options = {}, id = this.activeDictionaryId) {
      return this.call("list", { dictionary: this.workerDictionary(id), frequency: await this.frequencyOptions(id), options });
    }

    async studyList(options = {}, id = this.activeDictionaryId) {
      return this.call("studyList", { dictionary: this.workerDictionary(id), frequency: await this.frequencyOptions(id), options });
    }

    onProgress(listener) {
      this.progressListeners.add(listener);
      return () => this.progressListeners.delete(listener);
    }
  }

  window.langLSRWDictionary = new DictionaryService();
})();
