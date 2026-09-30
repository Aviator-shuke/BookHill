import sqlite3InitModule from "../vendor/sqlite-wasm/index.js";

const DEFAULT_DICTIONARY = {
  id: "ecdict",
  languageId: "en",
  databaseName: "/ecdict.sqlite"
};

let sqlite3;
let pool;
let database;
let currentDictionary;
let operationQueue = Promise.resolve();

// Spanish word-list categories and frequency sorting come from frequency ranks that ship as a small TSV beside the
// dictionary package (manifest `frequency`). The first time a dictionary is used with a new frequency version, the
// ranks are imported into a separate table of the installed database, so the dictionary package itself never has to
// be rebuilt or downloaded again when the ranks change.
const FREQUENCY_TABLE = "langlsrw_frequency";
const frequencyVersions = new Map();
const frequencyTables = new Map();
const frequencyErrors = new Map();

function frequencyTiers(limits) {
  return Object.fromEntries(limits.map((limit) => [`top${limit}`, `frequency.frequency_rank <= ${limit}`]));
}

// Word-list rules per dictionary language. English categories come from ECDICT columns (oxford, collins, tag);
// Spanish categories come from the imported frequency ranks. `firstLetter` decides which entries count as words.
const LIST_PROFILES = {
  en: {
    firstLetter: "[A-Za-z]",
    categories: {
      all: "1=1",
      oxford: "oxford > 0",
      collins: "collins > 0",
      zk: "instr(' ' || lower(tag) || ' ', ' zk ') > 0",
      gk: "instr(' ' || lower(tag) || ' ', ' gk ') > 0",
      ky: "instr(' ' || lower(tag) || ' ', ' ky ') > 0",
      cet4: "instr(' ' || lower(tag) || ' ', ' cet4 ') > 0",
      cet6: "instr(' ' || lower(tag) || ' ', ' cet6 ') > 0",
      ielts: "instr(' ' || lower(tag) || ' ', ' ielts ') > 0",
      toefl: "instr(' ' || lower(tag) || ' ', ' toefl ') > 0",
      gre: "instr(' ' || lower(tag) || ' ', ' gre ') > 0"
    },
    orderBy: {
      alphabetical: "stardict.word COLLATE NOCASE, stardict.id",
      bnc: "CASE WHEN bnc > 0 THEN 0 ELSE 1 END, bnc, stardict.word COLLATE NOCASE",
      frq: "CASE WHEN frq > 0 THEN 0 ELSE 1 END, frq, stardict.word COLLATE NOCASE",
      collins: "collins DESC, stardict.word COLLATE NOCASE"
    },
    frequencyCategories: [],
    frequencySorts: []
  },
  es: {
    firstLetter: "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]",
    categories: {
      all: "1=1",
      ...frequencyTiers([500, 1000, 2000, 3000, 5000, 10000])
    },
    orderBy: {
      alphabetical: "stardict.word COLLATE NOCASE, stardict.id",
      frq: "CASE WHEN frequency.frequency_rank IS NULL THEN 1 ELSE 0 END, frequency.frequency_rank, stardict.word COLLATE NOCASE"
    },
    frequencyCategories: ["top500", "top1000", "top2000", "top3000", "top5000", "top10000"],
    frequencySorts: ["frq"]
  }
};

function listProfile(dictionary) {
  return LIST_PROFILES[dictionary.languageId] || LIST_PROFILES.en;
}

// FROM clause for a word-list query; the frequency table is joined only when the category or sort needs it.
function listSource(dictionary, profile, category, sort) {
  const needsFrequency = profile.frequencyCategories.includes(category) || profile.frequencySorts.includes(sort);
  if (!needsFrequency) return "stardict";
  if (!hasFrequencyTable(dictionary)) {
    throw new Error(frequencyErrors.get(dictionary.databaseName) || "词频数据尚未就绪，请稍后再试");
  }
  return `stardict LEFT JOIN ${FREQUENCY_TABLE} AS frequency ON frequency.word = stardict.word`;
}

// With frequency ranks joined, show the lemma as the frequency list spells it (the dictionary merges spellings
// that differ only in case, e.g. its entry for the preposition "a" is stored as "A").
function listWordColumn(source) {
  return source === "stardict" ? "stardict.word" : "COALESCE(frequency.word, stardict.word)";
}

function hasFrequencyTable(dictionary) {
  if (!frequencyTables.has(dictionary.databaseName)) {
    frequencyTables.set(dictionary.databaseName, Boolean(database.selectValue(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
      [FREQUENCY_TABLE]
    )));
  }
  return frequencyTables.get(dictionary.databaseName);
}

function forgetFrequency(dictionary) {
  frequencyVersions.delete(dictionary.databaseName);
  frequencyTables.delete(dictionary.databaseName);
  frequencyErrors.delete(dictionary.databaseName);
}

// Imports the manifest's frequency TSV (rank, word, count) into FREQUENCY_TABLE when the installed version differs.
// A failure is remembered and reported only by queries that need the ranks; lookups and plain browsing keep working.
async function ensureFrequency(payload, dictionary) {
  const frequency = payload?.frequency;
  if (!frequency?.url || !frequency.version) return;
  if (frequencyVersions.get(dictionary.databaseName) === frequency.version) return;
  const installedVersion = database.selectValue("SELECT value FROM dictionary_meta WHERE key = 'frequency_version'");
  if (installedVersion === frequency.version && hasFrequencyTable(dictionary)) {
    frequencyVersions.set(dictionary.databaseName, frequency.version);
    return;
  }
  try {
    const response = await fetch(frequency.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`词频数据下载失败（${response.status}）`);
    const rows = (await response.text()).split(/\r?\n/).slice(1).map((line) => line.split("\t"))
      .filter(([rank, word]) => Number(rank) > 0 && word);
    database.exec("PRAGMA query_only=OFF");
    try {
      database.transaction((db) => {
        db.exec(`DROP TABLE IF EXISTS ${FREQUENCY_TABLE}`);
        db.exec(`CREATE TABLE ${FREQUENCY_TABLE} (word TEXT PRIMARY KEY COLLATE NOCASE, frequency_rank INTEGER NOT NULL, occurrences INTEGER NOT NULL DEFAULT 0)`);
        const statement = db.prepare(`INSERT OR IGNORE INTO ${FREQUENCY_TABLE} (word, frequency_rank, occurrences) VALUES (?, ?, ?)`);
        try {
          rows.forEach(([rank, word, occurrences]) => {
            statement.bind([word, Number(rank), Number(occurrences) || 0]).stepReset();
          });
        } finally {
          statement.finalize();
        }
        db.exec(`CREATE INDEX ${FREQUENCY_TABLE}_rank ON ${FREQUENCY_TABLE} (frequency_rank)`);
        db.exec({
          sql: "INSERT OR REPLACE INTO dictionary_meta (key, value) VALUES ('frequency_version', ?)",
          bind: [String(frequency.version)]
        });
      });
    } finally {
      database.exec("PRAGMA query_only=ON");
    }
    frequencyTables.set(dictionary.databaseName, true);
    frequencyErrors.delete(dictionary.databaseName);
    frequencyVersions.set(dictionary.databaseName, frequency.version);
  } catch (error) {
    frequencyTables.delete(dictionary.databaseName);
    frequencyErrors.set(dictionary.databaseName, `词频数据导入失败：${error.message || error}`);
  }
}

function reply(id, result, error) {
  self.postMessage({ id, result, error: error ? String(error.message || error) : undefined });
}

async function initialize() {
  if (sqlite3) return;
  sqlite3 = await sqlite3InitModule({
    locateFile: (file) => new URL(`../vendor/sqlite-wasm/${file}`, import.meta.url).href
  });
  pool = await sqlite3.installOpfsSAHPoolVfs({
    name: "langlsrw-dictionary",
    directory: ".langlsrw-dictionary",
    initialCapacity: 4
  });
  // Room for both dictionaries plus the journal of the frequency import.
  await pool.reserveMinimumCapacity(6);
}

function closeDatabase() {
  if (database) database.close();
  database = undefined;
  currentDictionary = undefined;
}

function normalizeDictionary(payload = {}) {
  const dictionary = payload.dictionary || payload;
  const id = String(dictionary.id || DEFAULT_DICTIONARY.id);
  const databaseName = String(dictionary.databaseName || DEFAULT_DICTIONARY.databaseName);
  const languageId = String(dictionary.languageId || (id === "spanish-wiktionary" ? "es" : "en"));
  if (!databaseName.startsWith("/") || databaseName.includes("..")) {
    throw new Error("词典数据库文件名无效");
  }
  return { id, languageId, databaseName };
}

function openDatabase(dictionary = DEFAULT_DICTIONARY) {
  closeDatabase();
  database = new pool.OpfsSAHPoolDb(dictionary.databaseName);
  database.exec("PRAGMA query_only=ON");
  currentDictionary = dictionary;
}

function metadata() {
  if (!database) return null;
  const rows = database.selectArrays("SELECT key, value FROM dictionary_meta");
  return Object.fromEntries(rows);
}

async function status(payload = {}) {
  await initialize();
  const dictionary = normalizeDictionary(payload);
  const installed = pool.getFileNames().includes(dictionary.databaseName);
  if (installed && (!database || currentDictionary?.databaseName !== dictionary.databaseName)) openDatabase(dictionary);
  return { installed, metadata: installed ? metadata() : null };
}

async function install(payload) {
  await initialize();
  const dictionary = normalizeDictionary(payload);
  closeDatabase();
  forgetFrequency(dictionary);
  const response = await fetch(payload.databaseUrl, { cache: "no-store" });
  if (!response.ok || !response.body) {
    throw new Error(`词典下载失败（${response.status}）`);
  }

  let received = 0;
  if (payload.compression === "gzip" && typeof DecompressionStream === "undefined") {
    throw new Error("当前浏览器不支持安装压缩词典");
  }
  const progressStream = new TransformStream({
    transform(chunk, controller) {
      received += chunk.byteLength;
      self.postMessage({ type: "progress", dictionaryId: dictionary.id, received, total: payload.totalBytes || 0 });
      controller.enqueue(chunk);
    }
  });
  const downloadedBody = response.body.pipeThrough(progressStream);
  const databaseBody = payload.compression === "gzip"
    ? downloadedBody.pipeThrough(new DecompressionStream("gzip"))
    : downloadedBody;
  const reader = databaseBody.getReader();
  await pool.importDb(dictionary.databaseName, async () => {
    const { done, value } = await reader.read();
    if (done) return undefined;
    return value;
  });

  openDatabase(dictionary);
  const dbMeta = metadata();
  if (String(dbMeta.schema_version) !== String(payload.schemaVersion)) {
    closeDatabase();
    pool.unlink(dictionary.databaseName);
    throw new Error("词典数据库版本不兼容");
  }
  if (payload.dictionaryId && dbMeta.dictionary_id && String(dbMeta.dictionary_id) !== String(payload.dictionaryId)) {
    closeDatabase();
    pool.unlink(dictionary.databaseName);
    throw new Error("词典数据库身份不匹配");
  }
  const integrity = database.selectValue("PRAGMA quick_check");
  if (integrity !== "ok") {
    closeDatabase();
    pool.unlink(dictionary.databaseName);
    throw new Error(`词典完整性检查失败：${integrity}`);
  }
  await ensureFrequency(payload, dictionary);
  return { installed: true, metadata: dbMeta, received };
}

async function remove(payload = {}) {
  await initialize();
  const dictionary = normalizeDictionary(payload);
  if (currentDictionary?.databaseName === dictionary.databaseName) closeDatabase();
  forgetFrequency(dictionary);
  const removed = pool.unlink(dictionary.databaseName);
  return { removed };
}

function requireDatabase(payload = {}) {
  const dictionary = normalizeDictionary(payload);
  if (!pool.getFileNames().includes(dictionary.databaseName)) throw new Error("本地词典尚未安装");
  if (!database || currentDictionary?.databaseName !== dictionary.databaseName) openDatabase(dictionary);
  return dictionary;
}

function selectEntry(word, dictionary = currentDictionary) {
  const rows = [];
  const frq = dictionary && hasFrequencyTable(dictionary)
    ? `COALESCE(frq, (SELECT frequency_rank FROM ${FREQUENCY_TABLE} WHERE ${FREQUENCY_TABLE}.word = stardict.word)) AS frq`
    : "frq";
  database.exec({
    sql: `SELECT word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, ${frq}, exchange, detail, audio FROM stardict WHERE word = ? COLLATE NOCASE LIMIT 1`,
    bind: [word],
    rowMode: "object",
    callback: (row) => rows.push(row)
  });
  return rows[0] || null;
}

async function query(payload) {
  const dictionary = requireDatabase(payload);
  await ensureFrequency(payload, dictionary);
  const word = typeof payload === "string" ? payload : payload?.word;
  const result = selectEntry(word);
  if (!result || dictionary.id !== "ecdict" || String(result.exchange || "").trim()) return result;

  const doubledLVariant = String(result.word || word).replace(/l(ing|ed|er)$/i, "ll$1");
  if (doubledLVariant.toLowerCase() === String(result.word || word).toLowerCase()) return result;
  const variant = selectEntry(doubledLVariant);
  const lemma = String(variant?.exchange || "")
    .split("/")
    .find((item) => item.trim().startsWith("0:"));
  if (lemma) result.exchange = lemma.trim();
  return result;
}

async function queryMany(payload) {
  requireDatabase(payload);
  const words = Array.isArray(payload) ? payload : payload?.words;
  const uniqueWords = [...new Set((Array.isArray(words) ? words : []).map((word) => String(word || "").trim()).filter(Boolean))];
  const results = [];
  for (const word of uniqueWords) results.push(await query({ ...payload, word }));
  return results.filter(Boolean);
}

function match(payload = {}) {
  requireDatabase(payload);
  const { word, limit = 10, strip = false } = payload;
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const key = strip ? String(word).replace(/[^\p{L}\p{N}]/gu, "").toLowerCase() : word;
  const field = strip ? "sw" : "word";
  return database.selectArrays(
    `SELECT id, word FROM stardict WHERE ${field} >= ? ORDER BY ${field}, word COLLATE NOCASE LIMIT ?`,
    [key, normalizedLimit]
  ).map(([id, entryWord]) => ({ id, word: entryWord }));
}

function count(payload = {}) {
  requireDatabase(payload);
  return database.selectValue("SELECT count(*) FROM stardict");
}

async function list(payload = {}) {
  const dictionary = requireDatabase(payload);
  await ensureFrequency(payload, dictionary);
  const profile = listProfile(dictionary);
  const { entryType = "words", category = "all", sort = "alphabetical", query = "", page = 1, pageSize = 100, excludeWords = [] } = payload.options || payload;
  const categoryWhere = profile.categories[category] || profile.categories.all;
  const letter = profile.firstLetter;
  const typeWhere = entryType === "suffixes"
    ? "stardict.word LIKE '-%'"
    : entryType === "special"
      ? `stardict.word NOT LIKE '-%' AND stardict.word NOT GLOB '${letter}*'`
    : entryType === "phrases"
      ? `stardict.word GLOB '${letter}*' AND instr(trim(stardict.word), ' ') > 0`
      : `stardict.word GLOB '${letter}*' AND instr(trim(stardict.word), ' ') = 0`;
  const normalizedQuery = String(query || "").trim();
  const escapedQuery = normalizedQuery.replace(/([%_\\])/g, "\\$1");
  const searchWhere = normalizedQuery ? "stardict.word LIKE ? ESCAPE '\\' COLLATE NOCASE" : "1=1";
  const normalizedExcludeWords = [...new Set((Array.isArray(excludeWords) ? excludeWords : [])
    .map((word) => String(word || "").trim().toLowerCase())
    .filter(Boolean))];
  const excludeWhere = normalizedExcludeWords.length
    ? `lower(stardict.word) NOT IN (${normalizedExcludeWords.map(() => "?").join(",")})`
    : "1=1";
  const bindings = [...(normalizedQuery ? [`%${escapedQuery}%`] : []), ...normalizedExcludeWords];
  const source = listSource(dictionary, profile, profile.categories[category] ? category : "all", sort);
  const where = `(${typeWhere}) AND (${categoryWhere}) AND (${searchWhere}) AND (${excludeWhere})`;
  const normalizedPageSize = Math.max(20, Math.min(Number(pageSize) || 100, 200));
  const countSql = `SELECT count(*) FROM ${source} WHERE ${where}`;
  const total = Number(bindings.length ? database.selectValue(countSql, bindings) : database.selectValue(countSql)) || 0;
  const pageCount = Math.max(1, Math.ceil(total / normalizedPageSize));
  const normalizedPage = Math.max(1, Math.min(Number(page) || 1, pageCount));
  const rows = database.selectArrays(
    `SELECT stardict.id, ${listWordColumn(source)}, collins FROM ${source} WHERE ${where} ORDER BY ${profile.orderBy[sort] || profile.orderBy.alphabetical} LIMIT ? OFFSET ?`,
    [...bindings, normalizedPageSize, (normalizedPage - 1) * normalizedPageSize]
  ).map(([id, word, collins]) => ({ id, word, collins: Number(collins) || 0 }));
  return { rows, total, page: normalizedPage, pageSize: normalizedPageSize, pageCount };
}

async function studyList(payload = {}) {
  const dictionary = requireDatabase(payload);
  await ensureFrequency(payload, dictionary);
  const profile = listProfile(dictionary);
  const { category = "all", sort = "alphabetical", excludeWords = [] } = payload.options || payload;
  const categoryWhere = profile.categories[category];
  if (!categoryWhere) throw new Error("请选择具体词表");
  const normalizedExcludeWords = [...new Set((Array.isArray(excludeWords) ? excludeWords : [])
    .map((word) => String(word || "").trim().toLowerCase())
    .filter(Boolean))];
  const excludeWhere = normalizedExcludeWords.length
    ? `AND lower(stardict.word) NOT IN (${normalizedExcludeWords.map(() => "?").join(",")})`
    : "";
  const source = listSource(dictionary, profile, category, sort);
  return database.selectArrays(
    `SELECT stardict.id, ${listWordColumn(source)}, collins FROM ${source} WHERE stardict.word GLOB '${profile.firstLetter}*' AND instr(trim(stardict.word), ' ') = 0 AND (${categoryWhere}) ${excludeWhere} ORDER BY ${profile.orderBy[sort] || profile.orderBy.alphabetical}`,
    normalizedExcludeWords
  ).map(([id, word, collins]) => ({ id, word, collins: Number(collins) || 0 }));
}

const handlers = { status, install, remove, query, queryMany, match, count, list, studyList };

self.addEventListener("message", async (event) => {
  const { id, method, payload } = event.data || {};
  if (!id || !handlers[method]) return;
  operationQueue = operationQueue
    .then(async () => {
      try {
        reply(id, await handlers[method](payload));
      } catch (error) {
        reply(id, undefined, error);
      }
    })
    .catch((error) => {
      reply(id, undefined, error);
    });
});
