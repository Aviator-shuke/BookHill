import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules", "@sqlite.org", "sqlite-wasm");
const target = resolve(root, "src", "vendor", "sqlite-wasm");

await mkdir(target, { recursive: true });
await Promise.all([
  copyFile(resolve(source, "dist", "index.mjs"), resolve(target, "index.js")),
  copyFile(resolve(source, "dist", "sqlite3.wasm"), resolve(target, "sqlite3.wasm"))
]);

const packageJson = JSON.parse(await readFile(resolve(source, "package.json"), "utf8"));
await writeFile(
  resolve(target, "VERSION.json"),
  `${JSON.stringify({ name: packageJson.name, version: packageJson.version, license: packageJson.license }, null, 2)}\n`,
  "utf8"
);
await writeFile(
  resolve(target, "NOTICE.md"),
  `# SQLite WASM vendor notice\n\n- Package: ${packageJson.name}\n- Version: ${packageJson.version}\n- License: ${packageJson.license}\n- Source: https://github.com/sqlite/sqlite-wasm\n\nThe vendored runtime is copied without source modification from the pinned npm dependency.\n`,
  "utf8"
);

console.log(`Vendored ${packageJson.name} ${packageJson.version}`);
