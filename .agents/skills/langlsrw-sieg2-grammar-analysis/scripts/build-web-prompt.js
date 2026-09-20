const fs = require("node:fs");
const path = require("node:path");

const skillRoot = path.resolve(__dirname, "..");

function normalizePrompt(source) {
  const prompt = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trimEnd();
  if (!prompt.trim()) throw new Error("Prompt source is empty.");
  return JSON.stringify(prompt).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function buildWebPrompt(source) {
  const literal = normalizePrompt(source);
  return [
    "// Generated from langlsrw-sieg2-grammar-analysis/references/grammar-prompt.txt.",
    "// Do not edit manually. Run the skill's build-web-prompt.js script.",
    `const GRAMMAR_ANALYSIS_INSTRUCTIONS = ${literal};`,
    "",
    "function buildGrammarPrompt(sentence, translation) {",
    '  const input = { sentence: String(sentence || "") };',
    "  if (translation) input.referenceTranslation = String(translation);",
    '  return GRAMMAR_ANALYSIS_INSTRUCTIONS + "\\n\\n输入数据（JSON）：\\n" + JSON.stringify(input);',
    "}",
    ""
  ].join("\n");
}

function run(args) {
  let check = false;
  let outputPath;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--check") check = true;
    else if (args[index] === "--output" && args[index + 1] && !args[index + 1].startsWith("--")) {
      outputPath = path.resolve(args[++index]);
    } else throw new Error("Usage: node build-web-prompt.js [--check] [--output path]");
  }
  if (!outputPath) throw new Error("SIEG2 skill is not enabled in the app; specify --output explicitly.");
  const source = fs.readFileSync(path.join(skillRoot, "references", "grammar-prompt.txt"), "utf8");
  const output = buildWebPrompt(source);
  if (check) {
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== output) throw new Error(`Generated prompt is stale: ${outputPath}`);
    console.log("Generated web prompt is up to date.");
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${outputPath}`);
}

if (require.main === module) {
  try {
    run(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { buildWebPrompt };
