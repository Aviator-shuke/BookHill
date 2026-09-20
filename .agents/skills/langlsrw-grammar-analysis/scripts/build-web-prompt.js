const fs = require("fs");
const path = require("path");

const skillRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(skillRoot, "..", "..", "..");
const sourcePath = path.join(skillRoot, "references", "grammar-prompt.txt");
const outputPath = path.join(projectRoot, "src", "generated", "grammar-prompt.js");

const prompt = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trimEnd();
const output = `// Generated from .agents/skills/langlsrw-grammar-analysis/references/grammar-prompt.txt.\n// Do not edit manually. Run the skill's build-web-prompt.js script.\nconst GRAMMAR_ANALYSIS_INSTRUCTIONS = ${JSON.stringify(prompt)};\n\nfunction buildGrammarPrompt(sentence, translation) {\n  const input = { sentence: String(sentence || "") };\n  if (translation) input.referenceTranslation = String(translation);\n  return \`${"${GRAMMAR_ANALYSIS_INSTRUCTIONS}"}\\n\\n输入数据（JSON）：\\n${"${JSON.stringify(input)}"}\`;\n}\n`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== output) {
    console.error(`Generated prompt is stale: ${outputPath}`);
    process.exit(1);
  }
  console.log("Generated web prompt is up to date.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, "utf8");
console.log(`Generated ${outputPath}`);
