const fs = require("node:fs");

const roles = new Set([
  "主语", "谓语", "中心语", "宾语", "述语补足语", "补足语", "修饰语",
  "附加语", "限定语", "标记语", "并列项", "补充语", "未定"
]);
const topFields = ["schemaVersion", "convention", "status", "pattern", "nodes", "explanation"];
const nodeFields = ["id", "text", "role", "type", "parent", "note"];
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function validateAnalysis(sentence, analysis) {
  const errors = [];
  if (typeof sentence !== "string" || !sentence.trim()) return ["Input sentence must be a non-empty string."];
  if (!isObject(analysis)) return ["Analysis must be an object."];
  const checkFields = (value, fields, label) => {
    if (fields.some((field) => !Object.hasOwn(value, field)) || Object.keys(value).some((field) => !fields.includes(field))) {
      errors.push(`${label}: unexpected or missing fields.`);
    }
  };
  checkFields(analysis, topFields, "Analysis");
  if (analysis.schemaVersion !== 2) errors.push("Expected schemaVersion 2.");
  if (analysis.convention !== "sieg2-cgel/1") errors.push("Unknown convention.");
  if (!["complete", "partial"].includes(analysis.status)) errors.push("Invalid status.");
  if (typeof analysis.pattern !== "string" || !analysis.pattern.trim()) errors.push("Missing pattern.");
  if (!Array.isArray(analysis.explanation) || analysis.explanation.length > 4 ||
      analysis.explanation.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push("Explanation must contain 0-4 non-empty strings.");
  }
  if (analysis.status === "partial" && !analysis.explanation?.length) errors.push("Partial analysis needs an explanation.");
  if (!Array.isArray(analysis.nodes) || !analysis.nodes.length) return [...errors, "Nodes must be a non-empty array."];

  const byId = new Map();
  const byParent = new Map();
  for (const node of analysis.nodes) {
    if (!isObject(node)) {
      errors.push("Node must be an object.");
      continue;
    }
    checkFields(node, nodeFields, `Node ${node.id}`);
    if (!Number.isInteger(node.id) || node.id <= 0 || byId.has(node.id)) errors.push("Node IDs must be unique positive integers.");
    if (!Number.isInteger(node.parent) || node.parent < 0 || (node.parent !== 0 && !byId.has(node.parent))) {
      errors.push(`Node ${node.id}: parent must be 0 or an earlier node.`);
    }
    if (["text", "role", "type"].some((field) => typeof node[field] !== "string" || !node[field].trim()) || typeof node.note !== "string") {
      errors.push(`Node ${node.id}: invalid string field.`);
    }
    if (!roles.has(node.role)) errors.push(`Node ${node.id}: unsupported role.`);
    if (node.role === "未定" && analysis.status !== "partial") errors.push("Unresolved nodes require partial status.");
    byId.set(node.id, node);
    if (!byParent.has(node.parent)) byParent.set(node.parent, []);
    byParent.get(node.parent).push(node);
  }
  if (errors.length) return errors;
  if (!byParent.has(0)) return ["No root nodes."];

  // Match within each parent's actual occurrence, not the first match in the sentence.
  const pending = [{ parent: 0, text: sentence }];
  while (pending.length) {
    const { parent, text } = pending.pop();
    let cursor = 0;
    for (const node of byParent.get(parent) || []) {
      const start = text.indexOf(node.text, cursor);
      if (start < 0) {
        errors.push(`Node ${node.id}: substring missing, out of order, or overlapping a sibling.`);
        continue;
      }
      if (parent === 0 && text.slice(cursor, start).trim()) errors.push(`Uncovered source before root ${node.id}.`);
      cursor = start + node.text.length;
      pending.push({ parent: node.id, text: node.text });
    }
    if (parent === 0 && text.slice(cursor).trim()) errors.push("Root nodes do not cover the entire source.");
  }
  return errors;
}

if (require.main === module) {
  try {
    const [inputPath, analysisPath, ...rest] = process.argv.slice(2);
    if (!inputPath || !analysisPath || rest.length) throw new Error("Usage: node validate-result.js input.json analysis.json");
    const input = JSON.parse(fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, ""));
    const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8").replace(/^\uFEFF/, ""));
    const errors = validateAnalysis(input.sentence, analysis);
    if (errors.length) throw new Error(errors.join("\n"));
    console.log("Structure and source coverage are valid; linguistic accuracy requires review.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateAnalysis };
