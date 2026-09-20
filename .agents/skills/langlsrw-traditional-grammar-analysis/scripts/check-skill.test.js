const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { buildWebPrompt } = require("./build-web-prompt.js");

const skillRoot = path.resolve(__dirname, "..");

test("traditional prompt is the generated runtime default", () => {
  const source = fs.readFileSync(path.join(skillRoot, "references", "grammar-prompt.txt"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(buildWebPrompt(source), context);
  const sentence = "The experienced engineer fixed the problem.";
  const output = context.buildGrammarPrompt(sentence, "工程师解决了问题。");
  const divider = "\n\n输入数据（JSON）：\n";
  assert.equal(output.slice(0, output.indexOf(divider)), source.trimEnd());
  assert.deepEqual(JSON.parse(output.slice(output.indexOf(divider) + divider.length)), {
    sentence,
    referenceTranslation: "工程师解决了问题。"
  });
  assert.match(output, /traditional-school\/1/);
  assert.doesNotMatch(output, /convention 固定为 "sieg2-cgel\/1"/);
});
