import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

const runtimePaths = [
  "index.html",
  "src",
  "assets/materials",
  "assets/libraries",
  "assets/dictionaries/runtime"
];

async function copyRuntimePath(relativePath) {
  const source = path.join(ROOT, relativePath);
  const target = path.join(DIST, relativePath);
  await cp(source, target, {
    recursive: true,
    filter: (candidate) => !candidate.toLowerCase().endsWith(".sqlite")
  });
}

function readCloudConfig() {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const supabasePublishableKey = String(
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
  ).trim();

  if (Boolean(supabaseUrl) !== Boolean(supabasePublishableKey)) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured together.");
  }
  if (supabaseUrl) {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== "https:") {
      throw new Error("SUPABASE_URL must use HTTPS for a deployment build.");
    }
  }

  return { supabaseUrl, supabasePublishableKey };
}

async function directorySize(directory) {
  let bytes = 0;
  let files = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const child = await directorySize(entryPath);
      bytes += child.bytes;
      files += child.files;
    } else if (entry.isFile()) {
      bytes += (await stat(entryPath)).size;
      files += 1;
    }
  }
  return { bytes, files };
}

async function build() {
  const cloud = readCloudConfig();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  for (const relativePath of runtimePaths) {
    await copyRuntimePath(relativePath);
  }

  const generatedConfig = `window.langLSRWCloudConfig = ${JSON.stringify({
    supabaseUrl: cloud.supabaseUrl,
    supabaseAnonKey: cloud.supabasePublishableKey
  }, null, 2)};\n`;
  await writeFile(path.join(DIST, "src", "cloud-config.js"), generatedConfig, "utf8");

  const output = await directorySize(DIST);
  console.log(`Built ${output.files} files (${(output.bytes / 1024 / 1024).toFixed(2)} MiB) in ${DIST}`);
  console.log(`Supabase cloud login: ${cloud.supabaseUrl ? "configured" : "not configured"}`);
}

await build();
