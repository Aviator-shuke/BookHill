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
  assert.match(output, /traditional-school\/8/);
  assert.match(output, /实义动词用“中心语”/);
  assert.match(output, /parent 只表示结构包含关系和层级展示关系/);
  assert.match(output, /role 表示当前节点在其所在结构中的句法功能/);
  assert.match(output, /但不包含宾语、表语、补语或状语/);
  assert.match(output, /不得使用 role=从句/);
  assert.match(output, /不得使用 role=连接词/);
  assert.match(output, /role 必须严格取自允许枚举/);
  assert.match(output, /所有 parent=0 节点必须完整覆盖原句/);
  assert.match(output, /子节点 text 不得与父节点 text 完全相同/);
  assert.match(output, /type 中注明介词宾语/);
  assert.match(output, /pattern 是面向英语学习者的句子结构摘要/);
  assert.match(output, /不是 parent=0 节点 role 的机械复制/);
  assert.match(output, /必须区分过去将来语境与反事实条件语境/);
  assert.match(output, /parent 必须指向能够完整包含该节点 text 的最近上级结构节点/);
  assert.match(output, /不得创建 text="did decide"/);
  assert.match(output, /多个彼此独立的前置修饰成分必须分别分析/);
  assert.match(output, /表语必须作为独立成分与谓语同层表示/);
  assert.match(output, /不定式或动名词结构优先按宾语分析/);
  assert.doesNotMatch(output, /convention 固定为 "sieg2-cgel\/1"/);
});
