# 多语言分层架构

## 1. 已确定方向

langLSRW 采用统一的语言适配层，不为西班牙语、德语、法语分别复制页面或业务逻辑。

目标结构：

```text
听 / 说 / 读 / 写 / 复习（语言无关的产品层）
                    ↓
             语言能力统一接口
                    ↓
     英语包 / 西班牙语包 / 德语包 / 法语包
                    ↓
       词典、TTS、识别、翻译、AI 等服务
```

西班牙语作为第一个新增语言，用来验证这套架构；成功后德语和法语沿用同一接口。西班牙语特有规则和实施难点继续记录在 [`SPANISH.md`](SPANISH.md)。

## 2. 分层职责

### 第一层：产品与学习流程

这一层不应知道具体语言规则，负责：

- 听、说、读、写页面和导航
- 句库、材料和音频字幕工作流
- 练习会话、进度、收藏和复习池
- 本地用户、备份、同步和冲突状态
- 通用弹框、长文显示、录音和播放器
- 手动 AI 触发、缓存和结果展示框架

禁止在这一层新增 `if (language === "es")` 一类不断扩张的语言分支。语言差异必须由下层接口处理。

### 第二层：语言能力接口

提供稳定、可检测的通用接口：

```js
{
  identity,
  text,
  speech,
  translation,
  dictionary,
  morphology,
  grammar,
  curriculum
}
```

每项能力都声明可用状态。语言包尚未实现某项能力时，界面隐藏或禁用对应入口并说明原因，不能静默回退到英语实现。

### 第三层：语言包

每个语言包负责该语言的规则和默认值：

```text
src/languages/en/
src/languages/es/
src/languages/de/
src/languages/fr/
```

语言包包括：

- 语言名称、BCP 47 locale 和地区变体
- Unicode 文本规整
- 单词和句子切分
- 听写比较和错误反馈
- TTS 与语音识别参数
- 词典、词形和原形还原入口
- 语法分析 Skill 身份和缓存版本
- 分级词表与课程分类

### 第四层：数据与服务适配器

处理具体实现来源：

- 本地 SQLite/OPFS 词典
- 浏览器 TTS 和 SpeechRecognition
- 浏览器 Translator API
- AI 后端代理
- 本地存储和 Supabase
- 音频解码、字幕与波形工具

产品层只调用接口，不直接依赖服务的数据格式。

## 3. 建议目录

```text
src/
  core/
    language-registry.js
    material-service.js
    review-service.js
    storage-service.js
  languages/
    en/
      profile.js
      text.js
      speech.js
      morphology.js
      grammar.js
    es/
      profile.js
      text.js
      speech.js
      morphology.js
      grammar.js
    de/
    fr/
  services/
    dictionary/
    translation/
    speech/
    grammar/
```

当前项目仍在逐步离开单体 `src/app.js` 的阶段。迁移应按功能小步进行，不要求先完成整个目录重构再提供西班牙语。

## 4. 核心接口

### LanguageProfile

```js
{
  id: "es",
  label: "西班牙语",
  defaultLocale: "es-ES",
  locales: ["es-ES", "es-MX"],
  translationTarget: "zh-CN",
  capabilities: {
    dictionary: false,
    morphology: false,
    grammar: false,
    curriculum: false
  }
}
```

### TextAdapter

```js
{
  normalizeForIdentity(text),
  normalizeForAnswer(text, options),
  tokenizeWords(text),
  splitSentences(text),
  compareAnswer(expected, actual, options)
}
```

同一函数不能用英语正则处理全部拉丁字母语言。重音、连字符、省音符、复合词和大小写规则均由语言包决定。

### SpeechAdapter

```js
{
  resolveTtsLocale(material, settings),
  resolveRecognitionLocale(material, settings),
  listVoicePreferences(locale),
  normalizeRecognitionResult(text)
}
```

### DictionaryAdapter

```js
{
  status(),
  lookup(surfaceForm),
  findLemma(surfaceForm, context),
  listInflections(lemma),
  categories(),
  browse(query)
}
```

### GrammarAdapter

```js
{
  frameworkId,
  schemaVersion,
  conventionVersion,
  canAnalyze(material),
  buildRequest(sentence, translation),
  validateResult(result),
  renderResult(result)
}
```

英语、西班牙语、德语和法语必须使用独立语法规范与版本来源，不能共享一份提示词后只替换语言名称。

## 5. 数据身份

所有语言相关对象使用复合身份：

```text
languageId + locale（仅在语义相关时）+ normalized content
```

建议基础字段：

```js
{
  languageId: "es",
  locale: "es-ES",
  content: "...",
  dataVersion: 2
}
```

必须覆盖：

- 材料和句库
- 单词与句子收藏
- 掌握程度和复习计划
- 错句、录音和口语结果
- 翻译和语法缓存
- 词典条目引用
- 最后学习位置
- 备份、恢复和云同步

`locale` 不应无条件参与所有键。例如词典中的标准西班牙语 lemma 可以跨地区共享，但地区词义、语音和识别设置需要保留 locale。由对应适配器明确决定。

顶部品牌与 `听 / 说 / 读 / 写` 导航之间预留学习语言分段控件。当前显示 `英 / 西`：英语为完整启用状态；`西` 已作为早期入口启用，用于切换本地西语词典查词和词库浏览。尚未语言隔离的收藏、背词、材料、听说判分、语法分析、备份和同步不能跟随伪装成西语流程。

## 6. 能力降级

语言包可以分阶段提供能力：

| 能力 | 英语 | 西班牙语首阶段 | 德语/法语初始接入 |
|---|---|---|---|
| 文本/LRC 导入 | 可用 | 可用 | 可用 |
| 原声音频 | 可用 | 可用 | 可用 |
| TTS | 可用 | 可用 | 可用 |
| 语音识别 | 可用 | 可用 | 可用 |
| 中文翻译 | 可用 | 可用 | 可用 |
| 本地词典 | 可用 | 查词/词库浏览可用，收藏和背词未接入 | 后续 |
| 背单词 | 可用 | 后续 | 后续 |
| AI 语法分析 | 可用 | 后续 | 后续 |

能力不可用时：

- 不显示错误的英语数据。
- 不调用英语适配器兜底。
- 保留已有材料和记录。
- 显示普通中文说明，例如“西班牙语词典尚未安装/支持”。

## 7. 多语言差异示例

### 西班牙语

- 重音符号、`ñ`、倒问号和倒感叹号
- 大量动词人称、时态和语气变化
- 主语省略和附着代词
- `es-ES` 与拉美地区差异

### 德语

- 名词大写不能按普通大小写错误处理
- 四格、性数变化和冠词变化
- 可分动词与句框结构
- 复合词切分不能简单按空格完成
- `de-DE`、`de-AT`、`de-CH` 的词汇和拼写差异

### 法语

- 省音形式，如 `l'homme`、`j'aime`
- 连字符代词结构
- 性数配合和大量不发音词尾
- 书面形式与语音识别结果差异明显
- `fr-FR`、`fr-CA` 等地区差异

这些差异说明多语言支持不能只是更换 TTS locale。

## 8. 实施顺序

### 阶段 0：建立边界

- 增加 `LanguageProfile` 和语言注册表。
- 把现有英语行为注册为 `en`，功能不变。
- 新数据写入 `languageId`；旧数据一次性迁移为英语。
- 为语言能力增加可用性判断。

### 阶段 1：西班牙语基础听说

- 实现 `es` 的文本、TTS、语音识别和翻译适配器。
- 支持西班牙语材料、LRC、原声、全文朗读和长文显示。
- 隔离材料、历史、收藏、缓存和最后位置。
- 词典、背词和语法入口按能力状态关闭。

### 阶段 2：验证可扩展性

- 用一个最小德语或法语测试语言包接入文本和 TTS。
- 确认无需修改听说页面即可运行。
- 如果接入仍需要在产品层添加语言分支，先修正接口，再继续功能开发。

### 阶段 3：西班牙语完整能力

- 接入词典、词形、分级词表和背单词。
- 创建西班牙语语法分析 Skill。
- 完成备份和云同步覆盖。

### 阶段 4：德语与法语

- 分别实现语言规则和独立数据源。
- 复用已经验证的产品层与服务接口。
- 每种语言独立进行语音、词典、词形、语法和数据授权测试。

## 9. 架构验收条件

- 新增测试语言包不需要复制或重写听说页面。
- 产品层不存在不断增长的语言条件分支。
- 英语现有功能和数据升级后保持不变。
- 同形词在不同语言中不共享收藏、词典和掌握记录。
- 材料自己的语言优先于当前界面选择，不会被错误声音朗读。
- 每项能力可独立启用、禁用和报告状态。
- 每种语言使用独立的词典授权和语法规范版本。
- 备份与同步能够完整保留 `languageId`、必要的 `locale` 和数据版本。

## 10. 决策记录

已决定采用语言适配层方案。西班牙语是首个新增语言，但架构从一开始必须允许德语、法语及其他语言通过独立语言包接入。

尚待决定：

1. 西班牙语默认 locale。
2. 西班牙语第一阶段是否接受词典、背单词和语法分析暂不可用。
3. 各语言听写的严格/宽松判分设置如何呈现。
4. 德语和法语中哪一种作为第二个最小验证语言包。
