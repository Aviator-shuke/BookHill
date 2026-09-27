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
  return { installed: true, metadata: dbMeta, received };
}

async function remove(payload = {}) {
  await initialize();
  const dictionary = normalizeDictionary(payload);
  if (currentDictionary?.databaseName === dictionary.databaseName) closeDatabase();
  const removed = pool.unlink(dictionary.databaseName);
  return { removed };
}

function requireDatabase(payload = {}) {
  const dictionary = normalizeDictionary(payload);
  if (!pool.getFileNames().includes(dictionary.databaseName)) throw new Error("本地词典尚未安装");
  if (!database || currentDictionary?.databaseName !== dictionary.databaseName) openDatabase(dictionary);
  return dictionary;
}

function selectEntry(word) {
  const rows = [];
  database.exec({
    sql: "SELECT word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio FROM stardict WHERE word = ? COLLATE NOCASE LIMIT 1",
    bind: [word],
    rowMode: "object",
    callback: (row) => rows.push(row)
  });
  return rows[0] || null;
}

function query(payload) {
  const dictionary = requireDatabase(payload);
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

function queryMany(payload) {
  requireDatabase(payload);
  const words = Array.isArray(payload) ? payload : payload?.words;
  const uniqueWords = [...new Set((Array.isArray(words) ? words : []).map((word) => String(word || "").trim()).filter(Boolean))];
  return uniqueWords.map((word) => query({ ...payload, word })).filter(Boolean);
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

function list(payload = {}) {
  requireDatabase(payload);
  const { entryType = "words", category = "all", sort = "alphabetical", query = "", page = 1, pageSize = 100 } = payload.options || payload;
  const categories = {
    all: ["1=1", []],
    oxford: ["oxford > 0", []],
    collins: ["collins > 0", []],
    zk: ["instr(' ' || lower(tag) || ' ', ' zk ') > 0", []],
    gk: ["instr(' ' || lower(tag) || ' ', ' gk ') > 0", []],
    ky: ["instr(' ' || lower(tag) || ' ', ' ky ') > 0", []],
    cet4: ["instr(' ' || lower(tag) || ' ', ' cet4 ') > 0", []],
    cet6: ["instr(' ' || lower(tag) || ' ', ' cet6 ') > 0", []],
    ielts: ["instr(' ' || lower(tag) || ' ', ' ielts ') > 0", []],
    toefl: ["instr(' ' || lower(tag) || ' ', ' toefl ') > 0", []],
    gre: ["instr(' ' || lower(tag) || ' ', ' gre ') > 0", []]
  };
  const orderBy = {
    alphabetical: "word COLLATE NOCASE, id",
    bnc: "CASE WHEN bnc > 0 THEN 0 ELSE 1 END, bnc, word COLLATE NOCASE",
    frq: "CASE WHEN frq > 0 THEN 0 ELSE 1 END, frq, word COLLATE NOCASE",
    collins: "collins DESC, word COLLATE NOCASE"
  };
  const [categoryWhere] = categories[category] || categories.all;
  const typeWhere = entryType === "suffixes"
    ? "word LIKE '-%'"
    : entryType === "special"
      ? "word NOT LIKE '-%' AND word NOT GLOB '[A-Za-z]*'"
    : entryType === "phrases"
      ? "word GLOB '[A-Za-z]*' AND instr(trim(word), ' ') > 0"
      : "word GLOB '[A-Za-z]*' AND instr(trim(word), ' ') = 0";
  const normalizedQuery = String(query || "").trim();
  const escapedQuery = normalizedQuery.replace(/([%_\\])/g, "\\$1");
  const searchWhere = normalizedQuery ? "word LIKE ? ESCAPE '\\' COLLATE NOCASE" : "1=1";
  const bindings = normalizedQuery ? [`%${escapedQuery}%`] : [];
  const where = `(${typeWhere}) AND (${categoryWhere}) AND (${searchWhere})`;
  const normalizedPageSize = Math.max(20, Math.min(Number(pageSize) || 100, 200));
  const countSql = `SELECT count(*) FROM stardict WHERE ${where}`;
  const total = Number(bindings.length ? database.selectValue(countSql, bindings) : database.selectValue(countSql)) || 0;
  const pageCount = Math.max(1, Math.ceil(total / normalizedPageSize));
  const normalizedPage = Math.max(1, Math.min(Number(page) || 1, pageCount));
  const rows = database.selectArrays(
    `SELECT id, word, collins FROM stardict WHERE ${where} ORDER BY ${orderBy[sort] || orderBy.alphabetical} LIMIT ? OFFSET ?`,
    [...bindings, normalizedPageSize, (normalizedPage - 1) * normalizedPageSize]
  ).map(([id, word, collins]) => ({ id, word, collins: Number(collins) || 0 }));
  return { rows, total, page: normalizedPage, pageSize: normalizedPageSize, pageCount };
}

function studyList(payload = {}) {
  requireDatabase(payload);
  const { category = "all", sort = "alphabetical" } = payload.options || payload;
  const categories = {
    oxford: "oxford > 0",
    zk: "instr(' ' || lower(tag) || ' ', ' zk ') > 0",
    gk: "instr(' ' || lower(tag) || ' ', ' gk ') > 0",
    ky: "instr(' ' || lower(tag) || ' ', ' ky ') > 0",
    cet4: "instr(' ' || lower(tag) || ' ', ' cet4 ') > 0",
    cet6: "instr(' ' || lower(tag) || ' ', ' cet6 ') > 0",
    ielts: "instr(' ' || lower(tag) || ' ', ' ielts ') > 0",
    toefl: "instr(' ' || lower(tag) || ' ', ' toefl ') > 0",
    gre: "instr(' ' || lower(tag) || ' ', ' gre ') > 0"
  };
  const orderBy = {
    alphabetical: "word COLLATE NOCASE, id",
    bnc: "CASE WHEN bnc > 0 THEN 0 ELSE 1 END, bnc, word COLLATE NOCASE",
    frq: "CASE WHEN frq > 0 THEN 0 ELSE 1 END, frq, word COLLATE NOCASE",
    collins: "collins DESC, word COLLATE NOCASE"
  };
  const categoryWhere = categories[category];
  if (!categoryWhere) throw new Error("请选择具体词表");
  return database.selectArrays(
    `SELECT id, word, collins FROM stardict WHERE word GLOB '[A-Za-z]*' AND instr(trim(word), ' ') = 0 AND (${categoryWhere}) ORDER BY ${orderBy[sort] || orderBy.alphabetical}`
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
