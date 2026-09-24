import sqlite3InitModule from "../vendor/sqlite-wasm/index.js";

const DATABASE_NAME = "/ecdict.sqlite";
let sqlite3;
let pool;
let database;
let manifest;

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
}

function openDatabase() {
  closeDatabase();
  database = new pool.OpfsSAHPoolDb(DATABASE_NAME);
  database.exec("PRAGMA query_only=ON");
}

function metadata() {
  if (!database) return null;
  const rows = database.selectArrays("SELECT key, value FROM dictionary_meta");
  return Object.fromEntries(rows);
}

async function status() {
  await initialize();
  const installed = pool.getFileNames().includes(DATABASE_NAME);
  if (installed && !database) openDatabase();
  return { installed, metadata: installed ? metadata() : null };
}

async function install(payload) {
  await initialize();
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
      self.postMessage({ type: "progress", received, total: payload.totalBytes || 0 });
      controller.enqueue(chunk);
    }
  });
  const downloadedBody = response.body.pipeThrough(progressStream);
  const databaseBody = payload.compression === "gzip"
    ? downloadedBody.pipeThrough(new DecompressionStream("gzip"))
    : downloadedBody;
  const reader = databaseBody.getReader();
  await pool.importDb(DATABASE_NAME, async () => {
    const { done, value } = await reader.read();
    if (done) return undefined;
    return value;
  });

  openDatabase();
  const dbMeta = metadata();
  if (String(dbMeta.schema_version) !== String(payload.schemaVersion)) {
    closeDatabase();
    pool.unlink(DATABASE_NAME);
    throw new Error("词典数据库版本不兼容");
  }
  const integrity = database.selectValue("PRAGMA quick_check");
  if (integrity !== "ok") {
    closeDatabase();
    pool.unlink(DATABASE_NAME);
    throw new Error(`词典完整性检查失败：${integrity}`);
  }
  manifest = payload;
  return { installed: true, metadata: dbMeta, received };
}

async function remove() {
  await initialize();
  closeDatabase();
  const removed = pool.unlink(DATABASE_NAME);
  manifest = undefined;
  return { removed };
}

function requireDatabase() {
  if (!database) throw new Error("本地词典尚未安装");
}

function query(word) {
  requireDatabase();
  const rows = [];
  database.exec({
    sql: "SELECT word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio FROM stardict WHERE word = ? COLLATE NOCASE LIMIT 1",
    bind: [word],
    rowMode: "object",
    callback: (row) => rows.push(row)
  });
  return rows[0] || null;
}

function match({ word, limit = 10, strip = false }) {
  requireDatabase();
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const key = strip ? String(word).replace(/[^\p{L}\p{N}]/gu, "").toLowerCase() : word;
  const field = strip ? "sw" : "word";
  return database.selectArrays(
    `SELECT id, word FROM stardict WHERE ${field} >= ? ORDER BY ${field}, word COLLATE NOCASE LIMIT ?`,
    [key, normalizedLimit]
  ).map(([id, entryWord]) => ({ id, word: entryWord }));
}

function count() {
  requireDatabase();
  return database.selectValue("SELECT count(*) FROM stardict");
}

const handlers = { status, install, remove, query, match, count };

self.addEventListener("message", async (event) => {
  const { id, method, payload } = event.data || {};
  if (!id || !handlers[method]) return;
  try {
    reply(id, await handlers[method](payload));
  } catch (error) {
    reply(id, undefined, error);
  }
});
