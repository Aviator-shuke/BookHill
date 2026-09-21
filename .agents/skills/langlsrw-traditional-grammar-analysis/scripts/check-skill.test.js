const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { buildWebPrompt } = require("./build-web-prompt.js");

const skillRoot = path.resolve(__dirname, "..");

test("traditional prompt is the generated runtime default", () => {
  const source = fs.readFileSync(path.join(skillRoot, "references", "grammar-prompt.txt"), "utf8");
  const convention = fs.readFileSync(path.join(skillRoot, "references", "grammar-convention.md"), "utf8");
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
  assert.ok(source.length < convention.length * 0.5, "Runtime prompt must stay materially smaller than the convention.");
  assert.match(convention, /traditional-school\/8/);
  assert.match(output, /traditional-school\/8/);
  assert.match(output, /role 只能取：主语、谓语、宾语、表语、补语、定语、状语、同位语、中心语、其他/);
  assert.match(output, /pattern 是面向学习者的主要结构摘要/);
  assert.match(output, /parent 只表示文本包含和展示层级/);
  assert.match(output, /最近上级节点/);
  assert.match(output, /所有 parent=0 节点按顺序连接后必须逐字还原完整原句/);
  assert.match(output, /谓语是连续的完整谓语动词结构/);
  assert.match(output, /系动词为谓语，表语必须同层独立/);
  assert.match(output, /type 注明介词宾语/);
  assert.match(output, /不定式或动名词结构优先作宾语/);
  assert.match(output, /would have \+ 过去分词须区分过去将来与反事实/);
  assert.match(output, /连续片段无法忠实表示倒装等结构时 status=partial/);
  assert.doesNotMatch(output, /convention 固定为 "sieg2-cgel\/1"/);
});
