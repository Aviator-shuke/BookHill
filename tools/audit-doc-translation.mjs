import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const pairs = [
  ["PROJECT_STATUS", path.join(os.tmpdir(), "old-project-status.md"), "docs/PROJECT_STATUS.md"],
  ["MECHANISMS", path.join(os.tmpdir(), "old-mechanisms.md"), "docs/MECHANISMS.md"]
];

function collect(text, regex) {
  return [...text.matchAll(regex)].map((match) => match[1] ?? match[0]);
}

function proseOnly(text) {
  let fenced = false;
  return text.split(/\r?\n/).map((line) => {
    if (line.trim().startsWith("```")) {
      fenced = !fenced;
      return "";
    }
    return fenced ? "" : line;
  }).join("\n");
}

function multisetDifference(before, after) {
  const counts = new Map();
  before.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  after.forEach((value) => counts.set(value, (counts.get(value) || 0) - 1));
  return [...counts].filter(([, count]) => count).map(([value, count]) => ({ value, count }));
}

for (const [name, oldPath, newPath] of pairs) {
  const before = fs.readFileSync(oldPath, "utf8");
  const after = fs.readFileSync(newPath, "utf8");
  const beforeProse = proseOnly(before);
  const afterProse = proseOnly(after);
  console.log(`\n## ${name}`);
  for (const [label, regex] of [
    ["backticks", /`([^`]+)`/g],
    ["links", /\]\(([^)]+)\)/g],
    ["numbers", /(?<![A-Za-z])\d+(?:[.,]\d+)*(?:\s*(?:px|ms|s|MB|MiB|KB|kHz|Hz|%))?/g]
  ]) {
    const difference = multisetDifference(collect(beforeProse, regex), collect(afterProse, regex));
    console.log(`${label}: ${difference.length}`);
    if (difference.length) console.log(difference);
  }
}
