# langLSRW 机制

最后更新：2026-09-28

本文档记录已实现产品行为的工作方式。它描述当前代码，而不是计划中的行为。每当触发条件、存储规则、身份边界、同步范围或部署机制发生变化时，都要更新本文档。

## 用户身份

langLSRW 有两种相互独立的身份模式：

- Google 账号由其不可变的 Supabase user ID 识别。
- 本地用户由明确创建的本地用户名识别。
- Google 账号绝不会被转换成以邮箱命名的本地用户。
- 退出登录会清除当前云端身份，并返回用户选择。
- 本地用户数据和云端账号数据使用不同的浏览器存储命名空间。

## 学习语言入口

页头在品牌和 `听 / 说 / 读 / 写` 导航之间放置一个紧凑的 `英 / 西` 学习语言控件。它选择正在学习的语言，而不是中文界面语言。该选择是身份设置 `learningLanguage`（新身份从英语开始，在该身份的数据打开前页面显示英语），每种语言由 `src/app.js` 中 `LEARNING_LANGUAGES` 的一个条目描述。当前页面不会被记住：每次访问都从 听 开始。

- 词典：英语使用 ECDICT，西语使用 Spanish Wiktionary 包（右键查词和 `词库` 浏览器）。
- 常用句库：每种语言一个 `commonLibraryManifestUrl` — `common-english-30150`（英文句子 + 中文翻译）和 `common-spanish-134910`（西语句子 + 英文翻译，来自 Tatoeba，经由 manythings.org `spa-eng`，CC BY 2.0 FR；见其 `LICENSE.md`）。切换语言会停止朗读、重置 `state.library`，并为新语言运行 `tryLoadDefaultLibrary()`。句库加载按语言跟踪，因此加载过程中发生切换时，仍会加载新的句库。
- 上次位置：按身份和学习语言保存为 `position` 记录 `last`（`src/user-data.js`，见 `USER_DATA.md`），因此每种语言会恢复自己的句库和句子。
- 口音和语音：口音选择框根据该语言的 `accents` 重建（`英音 / 美音`；西语区域为 `西班牙` es-ES、`墨西哥` es-MX、`美国` es-US、`阿根廷` es-AR、`哥伦比亚` es-CO、`智利` es-CL，默认 es-ES；选择框会为这些四字标签变宽），并在加载音频材料时保留 `原声`。`ttsAccent()` 回退到语言默认值；TTS 语音、语音识别和语音回退都使用该语言区域；材料、记录和缓存目前还不按地区区分。已保存的英语口音/语音（`accent`、`voiceURI`）绝不会被西语选择覆盖，西语选择使用 `accent_es` / `voiceURI_es`。
- 收藏按语言限定范围：收藏、单词复习进度、语法结果和上次位置都是学习语言范围内的个人数据记录（`languageScope()`；见下方“个人数据”）。西语启用 `collectionEnabled`（查词和 `词库` 详情中的单词星级）以及 `sentenceFavoritesEnabled`（句子星级、`收藏` 句子标签、`用户收藏` 句库选项）。`applyLearningLanguageFavoriteOptions()`（由 `applyLearningLanguageLibraryOptions()` 调用）会把 `词库` 和 `收藏` 的分类/排序选项替换为当前语言的列表：英语保留其 ECDICT 等级以及 BNC / 当代语料 / 柯林斯排序，而西语使用字幕词频分层，并省略不支持的英语专用排序。当 `wordStudyEnabled` 关闭时，它还会隐藏 `背单词` 入口、行状态图标和状态分隔线（`is-without-review-status`）；切换语言会重新渲染已打开的 `收藏` 对话框。收藏按字母排序时使用学习语言的排序规则。西语保持关闭 `grammarAnalysisEnabled`（`Ai语法分析` 禁用并带说明性提示）。
- 按语言的单词复习：西语启用 `wordStudyEnabled`（`收藏` 的 `背单词` 入口、行状态图标、手动掌握和掌握卡片），而 `dictionaryStudyDeckEnabled` 单独控制 `词库` 分类词组（英语：ECDICT 标签；西语：字幕词频分层）。语言条目还带有 `wordLabel` / `meaningLabel`（英语为 英文 / 中文，西语为 西语 / 英文），用于方法文本和空释义提示，并带有 `reviewDistractorCategory`（英语为 `oxford`，西语为 `top3000`）。`loadReviewFallbackWords()` 从该分类提供额外的 识义 干扰项，否则从学习语言词典的随机一页 60 个词中提供（`langLSRWDictionary.list`，每个词典的页数会缓存）。复习查询（干扰项用 `queryMany`，词表项目用 `query`）使用 `currentDictionaryId()`。`wordReviewPatternHtml()` 通过语言规则 `isLetterChar()` 隐藏字母（`en/text.js` 中为 `[A-Za-z]`，`es/text.js` 中为 `[\p{L}\p{M}]`），因此带重音字母会变成空格。答案只进行大小写比较，因此重音严格匹配。
- 分词和听写比较按语言分开。每个语言包提供自己的文本规则（`src/languages/en/text.js`、`src/languages/es/text.js`，在 `app.js` 前加载并注册到 `window.langLSRWLanguages`），`src/app.js` 中的 `languageText()` 会把当前学习语言的规则返回给 `getTargetWordPieces()`、`getWordMatches()`、`alignInputWords()`、`isCheckChar()`、`getCheckChars()`、`getTargetWordEndingAt()` 和 `mergeTimedFragments()`。英语保留其 ASCII 单词规则。西语使用 Unicode 字母（`[\p{L}\p{M}\p{N}]`，`u` 标志），把 `¿ ¡` 视为标点，并且只做大小写折叠比较，因此重音会严格评分（所有者决定，2026-09-28），`ñ` 绝不会等同于 `n`。规则正则表达式每次调用时创建，因此共享的 `/g` 对象不会泄漏 `lastIndex`。翻译缓存目前还未按语言限定范围。

相关实现：`index.html` 中的 `.language-nav`；`src/app.js` 中的 `setLearningLanguage()`、`renderAccentOptions()`、`applyLearningLanguageLibraryOptions()` 和 `loadCommonLibrary()`。

## 个人数据

此机制的完整设计、数据列表和历史记录以中文维护在 [`USER_DATA.md`](USER_DATA.md)；两处要保持同步。

- `src/user-data.js`（`window.langLSRWUserData`）把学习者的每一项数据作为记录 `{ identity, id, scope, collection, key, value, updatedAt, deleted }` 存入 IndexedDB 数据库 `langlsrw-userdata`（对象仓库 `records`，主键 `[identity, id]`，索引 `identity`）。已打开身份的记录会镜像到内存中，因此页面可以同步读取（`get`、`entries`）；`put`、`remove` 和 `append` 会立即更新内存，并在 300 ms 后用一个事务刷入数据库，在 `pagehide` 或页面隐藏时也会立即刷入。没有 IndexedDB 时，存储只在页面内存中工作。
- 身份包括 `local:<name>`、`cloud:<Supabase user ID>` 和 `guest`（`userDataIdentity()`）；作用域为 `global` 或学习语言 ID。`openUserData()` 会在启动、本地登录、云端登录、退出登录和删除用户时打开身份，然后应用其设置；调用方随后通过 `tryLoadDefaultLibrary()` 恢复其位置。
- 注册表 `COLLECTIONS` 是读取、导出、导入、删除和同步共同使用的唯一列表：`settings`（全局）；每种语言的 `position`、`favoriteWord`、`favoriteSentence`、`wordProgress`、`grammarResult`，以及预留的 `sentenceProgress` 和 `customLibrary`；还有事件集合 `practiceEvent` 和 `reviewEvent`，它们标记为 `enabled: false`（目前没有任何代码读取它们，因此在有功能需要之前，它们既不会被写入、加载、导出，也不会被导入）。打开身份时，未注册或已禁用集合中的记录会被忽略。
- 设置只按身份保存（`persistSetting()`、`applyIdentitySettings()`）：`learningLanguage`、`theme`、`shortcuts`、`speech`、`fonts`、`grammarColors`、`dictionaryAutoSpeak`、`practice`（每组新单词 / 句子数量）和 `ai`（AI 基础 URL 和模型）。除最后显示主题的缓存外，没有任何内容复制到 localStorage（`langLSRWBootTheme`，由 `applyTheme()` 写入，并由 `<body>` 顶部的内联脚本在渲染前应用）。`index.html` 也以 `html.is-booting` 开始，它会隐藏页面内容，直到启动流程应用了该身份的设置（或经过 1.5 s），因此不会闪现默认外观。`applyIdentitySettings()` 先切换到该身份的学习语言（不加载其句库，调用方接下来通过 `tryLoadDefaultLibrary()` 加载），用默认值补齐缺失设置（`defaultSettingValue()`），再应用其余设置；`恢复默认设置` 只重置当前身份。AI API 密钥按身份保存，但只保存在本设备：`localSecrets` 集合标记为 `exportable: false`，因此绝不会被导出、导入或同步。
- `设置` 工具栏按钮打开 `#settingsModal`，这是一个居中的对话框，使用与 `词库` 相同的三列布局（`openSettings()` / `closeSettings()`；关闭、Esc 或点击背景会关闭它，打开期间学习快捷键会暂停）。左列列出分类（`data-settings-tab`：字体、快捷键、练习、AI 接口、本地词典、翻译缓存、句子成分颜色、设置管理）；`selectSettingsTab()` 在中列显示匹配的 `data-settings-panel`。中列每一行都是固定宽度名称加控件，因此控件和控件按钮会对齐；快捷键和语法颜色使用两列。右列（`renderSettingsDetail()`）显示分类标题和它的 `data-settings-intro`，以及指针下或聚焦中的控件的 `title`。面板淡入并滑入（`settings-panel-in`），行在悬停时获得浅色底色。所有控件 ID 都保持不变，因此保存和加载照旧工作。
- 内置句库句子只引用，绝不复制：`librarySentenceRef()` 给出 `{ lib, id, lf }`，其中 `lf` 是 `loadCommonLibrary()` 用 53-bit `textFingerprint()` 从所有 `id + text` 行计算出的句库指纹。当句库 id 或指纹不同时，`resolveLibrarySentence()` 会把引用视为无效；逐句指纹字段 `fp` 已预留（`SENTENCE_REVIEW.md`）。`tryLoadDefaultLibrary()` 会在重建 `用户收藏` 前加载常用句库，因为收藏需要通过它解析。
- 导出（`exportData()`）会把已打开身份的记录下载为紧凑 JSON `{ format: "langlsrw-userdata", version: 2, identity, global, languages }`，每条记录为 `key: [value, updatedAt]`（墓碑为 `[null, updatedAt, 1]`），与当前打开页面或句库无关。导入（`restoreBackupData()`）只接受此格式，先试运行并统计新增和更新记录，请求确认，然后按键合并并保留较新的 `updatedAt`；退出登录状态下导入本地用户文件时，会先以该用户登录。删除本地用户（`clearCurrentUser()`）会移除该身份的所有记录。
- 不属于个人数据且绝不导出：已知本地用户和当前本地用户、翻译缓存、已安装词典以及 中译 结果；当前页面完全不存储。重构前的键（`langLSRWUserWords:*`、`langLSRWUserSentences:*`、`langLSRWWordReviews:*`、`langLSRWWordManualMastery:*`、`langLSRWHistory:*`、`langLSRWLearnedCount:*`、`langLSRWLastPosition:*`、`langLSRWGrammarCache`）不再读取；调试阶段不迁移旧数据。
- 清除浏览器网站数据会移除个人数据数据库和本地安装的词典；可替换的词典数据库绝不会存储用户创建的数据。

## 云同步

Supabase 为每个 Google 账号存储一行同步状态。

- 该行的数据内容与备份导出的个人数据文档相同（`collectCloudPayload()`）。
- 登录（`activateCloudUser()`）会打开 `cloud:<id>` 身份，读取该行一次，并像导入一样合并（较新的记录胜出）；重构前的数据内容（`schemaVersion: 1`）会被忽略。
- 自动云端写入目前由 `AUTO_CLOUD_SYNC_ENABLED = false` 禁用；保留的自动路径使用 1.2 秒防抖，但在该标志禁用期间什么也不做。
- `手动同步` 操作会用当前文档替换该账号的云端行。
- 文档不包含内置句库、词典、录音、其他身份的数据和 AI API 密钥。
- Supabase Row Level Security 必须保证每个账号只能访问自己的行。

相关实现：`src/user-data.js`、`src/app.js`、`src/auth/supabase-auth-service.js` 和 `supabase/schema.sql`。

### 正式发布方向

正式发布版的账号体验计划以云端优先，但这是产品方向，不是当前已实现行为。

- 对于已登录账号，云端存储将成为跨设备记录的权威来源。
- 浏览器存储将成为离线缓存和性能层，而不是唯一的工作事实来源。
- 本地用户模式将继续明确保持仅本地，并独立于账号数据。
- 切换到云端优先需要完整的同步覆盖、排队的离线写入、确定性的冲突解决、架构和数据迁移、重试和恢复行为，以及可见的同步状态。
- 当前的整行手动上传和已禁用的 1.2 秒自动路径是开发阶段机制，不能简单启用后当作正式的云端优先实现。

## 句子计数器

已学数量已移除（2026-09-28）；前进到另一个句子不会计数或记录。工具栏显示可编辑的当前/总句子位置。`counterIndexInput` 会随当前数字字符串的渲染宽度增长，而相邻的自定义上/下按钮保持固定宽度；`/ total` 是该框架外的普通文本。输入框接受数字和 Enter 导航，单击或聚焦时把光标放到末尾，双击时选中整个数字，按钮会立即移动一个句子；输入框聚焦时，全局快捷键 `keydown` 和 `keyup` 处理器都会立即返回，因此快捷键分配不会在序号输入期间触发。主页听写（`finishCurrent()`）会显示句子的结果，但不写入记录；计划由句子复习替代。

## 用户单词收藏

右键词典结果可以加入当前身份在学习语言下的单词收藏（`favoriteWord` 记录，以小写后的单词为键）。
一个收藏项存储 `{ w, r, t, f, s | st/sx }`：单词、1-5 星级、以秒为单位的保存时间、来自词典条目的若干筛选字段（`f`：非空的 `tag`、`oxford`、`collins`、`bnc`、`frq`），以及它的来源句子 — 能引用内置句库时为 `s`，否则为音频字幕或自定义材料的文本和翻译（`st`、`sx`）。释义、音标和词形不会存储：`收藏` 单词详情和收藏复习卡会在学习语言的词典中查询它们（`renderUserWordDetail()`、`startWordReviewCard()`），并且在缺少词典或没有条目时只显示单词、星级和提示。

收藏等级使用五颗星。点击某个等级会存储该整数；再次点击当前等级会移除该单词。

收藏支持基于已保存筛选字段的分类筛选，并支持按保存时间、字母和该语言的频率字段排序。它包含在备份导出和云同步中。

可见的产品名称是 `收藏`。它的单词视图与词典窗口共用可调整大小的布局、固定高度行、自适应客户端页大小、紧凑分页控件，以及 Up/Down 选词和 Left/Right 翻页导航。与完整词典不同，它已在本地的收藏会在浏览器内存中筛选、排序和分页。

相关实现：`src/app.js` 中的 `loadUserWords()`、`toggleDictionaryFavorite()` 和 `renderUserPhrases()`。

## 单词复习（背词）

此机制的完整中文规范维护在 [`WORD_REVIEW.md`](WORD_REVIEW.md)；行为变化时要保持两处同步。

收藏复习和完整词表学习各显示一行紧凑入口：`背单词：识义(n) 听写(n) 默写(n)`。每个 `n` 是所选分类下该维度已经掌握的单词数，不是分类总数，也不是当前轮次大小。只有当某个维度的记录有至少 21 天的间隔、至少 3 次成功重复，并且来自未辅助答对的 `lastGrade="good"` 时，该维度才算掌握。`again`（包括任何使用提示的答案）会重置间隔和重复次数，并立即取消掌握。收藏计数也会执行各模式的星级资格限制，但有意忽略搜索框；词表计数把所选分类的单词与共享记录取交集，并且也忽略词典搜索。每个入口都会打开自己的模式专属对话框，没有标签页或会话内模式切换；该对话框只包含自己的题目、控件、键盘行为、进度、完成状态和清除记忆操作。三个界面共享词典查询、音频、队列构建和排程辅助函数。词表入口支持 Oxford 3000 / 中考 / 高考 / CET4 / CET6 / 考研 / IELTS / TOEFL / GRE；`全部` 会禁用全部三个入口，因为它是完整词典，不是有意义的学习词组。所选词典排序控制新词顺序。专用的 `studyList` Worker 请求用一次 SQLite 查询加载所选分类的全部词名，并为浏览器会话缓存该分类/排序词组；完整条目详情仍然只为当前卡片查询。三个对话框中任意一个打开时，全局学习快捷键会暂停（`isTopMenuOpen()` 检测 `.word-review-modal:not([hidden])`），Esc 会先关闭它。

每个单词详情界面都以 `当前单词掌握程度` 结尾，显示独立的 `识义 / 听写 / 默写` 状态。只要已开始的记录到期，状态就是 `已到期`（和列表图标一样优先）；没有记录时是 `未学习`；练习后但尚未满足掌握条件时是 `学习中`；现有记录满足 21 天 / 3 次重复 / 最近一次未辅助答对条件时是 `已掌握`。每个维度还显示当前复习间隔、下次计划复习时间、间隔系数（两位小数；`间隔扩大系数` 的短标签）和 连续答对 次数；过期记录显示 `现在（已到期）`，未练习记录显示 `—`。词典、`收藏` 和右键菜单详情都读取该规范化单词同一条按身份区分的记录。

- `识义`：使用紧凑页头，包含单词、较大的音标、发音按钮和可编辑的五星收藏控件，后面跟五个答案。前三个是本地词典释义候选；正确释义随机 75% 的时间包含、25% 的时间省略。第四个答案是 `以上都不是`，第五个是 `不认识`。选中正确候选或正确选择 `以上都不是` 会记录 `good`；答错或选择 `不认识` 会记录 `again`。数字键 1-5 会立即选择并确认；初始没有高亮选项，第一次 Down 高亮选项 1（Up 高亮选项 5），Enter 确认高亮选项（没有高亮时忽略）。干扰项优先来自当前练习范围，并回退到 Oxford 3000，通过一次批量 Worker 请求加载，不使用 AI。
- `听写`：显示整词遮罩（不显示字母数量）和声音按钮，并朗读单词；释义只在答题后显示。它的对话框宽 520px（其他为 600px）。拼对的一瞬间自动作答（`updateWordReviewMask()` 调用 `answerWordReview()`），提示把字母全部补完时 `hintWordReview()` 调用 `answerWordReview(true)`；用过提示后作答的主按钮渲染成红色 `下一个`。遮罩里已露出的字母 `user-select: text` 可复制，`.word-review-pattern` 是 `display: block` 而不是 flex，避免复制时每个字母换行。
- 单词练习（`review.source === "single"`）：`dictionaryPracticeButtons(word)` 在词库详情、收藏详情、查词弹窗和英语词典子框的星级左边放一个 `练习` 按钮（`data-dictionary-practice`），点击调用 `openSingleWordPractice()`：先关闭查词弹窗和英语子框，再用 `{ source: "single", sourceLabel: "单词", word }` 打开听写对话框。这个来源的队列只有这一个词，`free` 恒为真（不保存排程），`nextWordReview()` 不推进 `index` 而是重新开始同一个词，`gradeWordReview()` 不把答错的词追加到队尾。`renderWordReview()` 给对话框加 `.is-single-word`：宽度 `fit-content`（最小 520px、最大 760px）、释义字号变小，且不显示右侧结果面板；卡片在遮罩下方渲染释义（`wordReviewMeaningsHtml()`）和 `wordSpeakHtml()`，答完后在遮罩后显示可点击的音标。
- 单词练习的按住说话：`startWordSpeak()` / `stopWordSpeak()` / `abortWordSpeak()` 使用独立的 `SpeechRecognition`（`maxAlternatives = 5`，语言取 `ttsAccent()`），与 `说` 页的 `state.speaking` 互不影响。按下按钮（`data-word-speak` 的 `pointerdown`）或按住 `holdSpeaking` 快捷键（在 `handleGlobalShortcut()` / `handleGlobalShortcutKeyup()` 里处理，先于 `isTopMenuOpen()` 检查）时，若卡片已作答或输入框有内容，先重置作答状态（`answered`、`correct`、`revealed`、`hints`、`input`）并重新渲染，再开始识别；松开后延迟 300 ms 停止。结果在 `onresult` 里用 `clean()` 去掉标点并转小写，写入输入框并调用 `updateWordReviewMask()`；`wordSpeakRecognition !== recognition` 的过期回调会被忽略。识别结果保存在 `review.speech`，不写入任何个人数据。
- `默写`：只显示释义、词性和遮罩；答题前没有音频（声音按钮隐藏，`speakSentence` 快捷键会被忽略），因此声音不会泄露拼写。输入拼对的瞬间会朗读单词（`updateWordReviewMask()`，每张卡通过 `review.spokenIndex` 只触发一次）。遮罩行最小高度为 32px，因此稍后出现的声音按钮不会移动布局。
- 两种拼写卡都有两个按钮：`提示`（与 Tab 相同，露出下一个字母）和主按钮（`wordReviewMainButtonHtml()`）：空白或错误时为 `不会`，使用任何提示后为红色 `不会`，未用提示拼对时为 `下一个`（`acceptWordReview()`），答题后也是 `下一个`。Enter 始终执行主按钮。输入时会实时揭开遮罩中正确输入的开头字母；答题后，与输入不同的字母显示为红色。评分自动且严格：未用提示的精确匹配（忽略大小写/空白）为 `good`；任何提示、不匹配或揭示都是 `again`，使用提示后拼对会显示 `拼对了，但用了提示，算答错`。不再产生 `hard` 等级。复习卡中的所有音标都是朗读该单词的按钮。
- 每个模式都有自己的 `{ interval, e, reps, lapses, due, lastReviewedAt, lastGrade }` 排程，保存在该单词 `wordProgress` 记录的 `r` 部分（按身份和学习语言区分，以规范化单词为键）；分类和 `收藏` 只选择练习范围。`e` 是间隔因子，即 间隔扩大系数，以百分之一为单位存为整数（250 = 2.5），因此步进不会累积浮点误差；只有计算间隔和显示时才除以 100。它从 2.5 开始，是答对后下次间隔增长的倍数，在单词忘记或只能困难回忆时下降，并在每次 `good` 后以 0.05 慢慢恢复到最高 2.5，因此较低的值意味着该单词复习更频繁。它描述间隔增长速度，而不是单词是否已掌握。三个模式保持独立（没有解锁阶梯，也没有跨模式抵扣）。
- 在收藏复习中，收藏的星级会累积决定单词进入哪些模式：1 星进入 `识义`；2 星还进入 `听写`；3 星及以上还进入 `默写`。4 星和 5 星目前表现得像 3 星；它们表示“非常重要”，并预留给之后的优先级功能。没有评分的单词按 1 星计算。完整词表词组让每个单词都可用于全部三个模式，并且不使用收藏星级。
- `buildWordReviewQueue(mode)` 读取当前来源，把该模式的到期单词排序（最早到期优先），然后加入最多 `practiceGroupSize("word")` 个（设置 `练习` → `单词练习每组 n 个`，默认 20，按身份）该模式没有记录的单词，随机选择（`shuffledWordReviewItems()`）。收藏复习先应用当前分类/搜索/排序和星级资格；词表学习使用完整加载的分类。`again` 单词会追加到当前会话末尾。队列记录其到期/新词段大小，进度行显示 `到期复习 · 第 n / D 个`、`新词学习 · 第 g 组 · 第 n / F 个` 或 `忘了再练 · 第 n / R 个`；新词每 20 个组成一组，`g` 是轮次开始时该模式和范围内已学习单词数除以 20、向下取整、再加 1。
- 自由练习（`自由练习`）从轮次结束卡或入口按钮的右键菜单打开。`buildFreeWordReviewQueue(mode)` 会打乱当前范围内已有该模式记录的单词，不考虑到期时间，并取最多 20 个。它使用普通卡片、评分和结果面板，但 `gradeWordReview` 会跳过 `saveWordReviewGrade`，因此自由练习绝不会改变间隔、间隔系数、到期时间或掌握状态。进度行显示 `自由练习 · 第 n / N 个 · 不计入记忆`，结束卡提供 `再来一轮`。
- `scheduleWordReview()` 是简化版 SM-2：`good` 给 1 天，然后 3 天，然后 `round(interval × e / 100)`；`again` 重置重复次数，计一次遗忘，把 `e` 降低 20（0.2，下限 130 = 1.3），并使该单词在 10 分钟后再次到期。`good` 用当前因子计算间隔，然后把 `e` 提高 5（0.05），上限 250（2.5），因此早期遗忘过的单词在足够多次干净回忆后会恢复正常增长率（从 1.3 下限开始需要 24 次）。与原始 SM-2 的差异（自动评分、1/3 天初始间隔、Anki 风格 −0.2/−0.15 惩罚、1.3 下限、2.5 上限和间隔系数恢复）及其理由、与 Anki、FSRS 和其他产品的比较，说明在 `WORD_REVIEW.md` §7。
- 答题后，判定、正确答案、释义和 `下一个` 会出现在从对话框右侧弹出的结果侧栏中，因此对话框保持原高度和居中位置；视口宽度低于 1260px 时，该面板覆盖在对话框右侧。任意复习对话框打开时，方向键不会传递给下方的 `收藏` 或 `词库` 列表导航。
- 悬停 `识义` / `听写` / `默写` 入口会临时把 `收藏` 或 `词库` 的单词详情窗格替换为该模式的记忆规则，分为六个编号部分（`练习范围`、`练习方式`、`练习组题`、`复习时间怎么定`、`掌握`、`其他`）：练习范围及 未学习 / 学习中📕 / 已掌握✅ / 已到期🕗 单词的实时计数；一行练习方式，不含按键或评分规则；轮次组成和顺序；用白话说明的间隔规则（`下次间隔天数 = 上次间隔天数 × 间隔扩大系数`、最初的 1/3 天步骤、答错重置、间隔扩大系数范围和 1.3 下限，以及连续答对次数只用于掌握）；两个面向用户的掌握条件（间隔 ≥ 21 天且连续答对 ≥ 3 次）；以及其他说明（独立且共享的记录、右键操作）。每项都是 12px 的 ● 项目符号，标题贴近窗格顶部，因此帮助通常无需滚动即可容纳。入口本身没有 `title` 提示。指针离开后帮助仍然保留，方便滚动；悬停列表单词会替换为该单词的详情，按下入口会恢复之前的详情 HTML、滚动位置和查词条目。延迟返回的统计数据绝不会覆盖已经替换该帮助的详情。
- `收藏` 和 `词库` 中的单词行以三个固定宽度状态槽开始，对应 识义 / 听写 / 默写：🕗 到期、📕 学习中、✅ 已掌握，未接触时为空白（仍保留宽度以便单词对齐）。到期优先。`refreshWordReviewStatusIcons()` 会在复习关闭或记忆清除后原地更新可见行。点击状态槽会打开菜单，按模式（或全部三个）设置或取消 **手动掌握**。手动掌握是一个单独标记，存储在该单词 `wordProgress` 记录的 `m` 部分（`{ mode: isoTime }`），绝不会改变间隔重复排程：标记的模式显示 🟢（优先于其他图标）、在入口计数和帮助统计中算作已掌握（不算学习中或到期）、会被 `buildWordReviewQueue` 跳过，并在掌握卡中显示 `手动掌握🟢`，所有排程字段显示为 `—`（取消后会重新显示已存值）。清除某个模式的记忆也会清除范围内该模式的手动标记。状态槽后的连续分隔线绘制为每行边框盒内 x = 61px 处的 1px 行背景，因此在悬停行和当前行上也保持不中断。范围统计框和掌握卡共享状态颜色：未学习灰色（`is-new`）、学习中橙色、已掌握绿色、已到期蓝色（`is-due`）。掌握卡也显示 间隔系数 和 连续答对，未接触模式显示 `—`。
- 清除操作不在练习对话框内：右键点击 `收藏` 或 `词库` 中的 `识义` / `听写` / `默写` 入口按钮，会打开包含该模式 `清除识义记忆` / `清除听写记忆` / `清除默写记忆` 的右键菜单。从 `收藏` 触发时，会从该身份的每个收藏词中清除该模式；从 `词库` 触发时，只从所选分类词组中清除该模式（`全部` 时禁用）。其他模式、收藏星级和其他词表分类不受影响。
- 单词复习进度和手动掌握（`wordProgress`）包含在备份导出和云同步中。每次答案也可以记录为 `reviewEvent`（`gradeWordReview()`），但该集合目前在注册表中禁用。

## 用户句子收藏

听力页的英文原文行有一个五星句子收藏控件（`sentenceFavoriteButton`），使用与单词收藏相同的交互：点击某个等级设置为 1-5，再次点击当前等级则移除。句子匹配忽略大小写和空白（`sentenceFavoriteKey`），因此再次收藏同一句子会更新现有条目，而不是重复创建。

- 句子收藏是学习语言范围内的 `favoriteSentence` 记录。内置句库句子存为引用 `{ lib, id, lf, fp: null, r, t }`，键为 `lib#id`；其他句子（音频字幕、自定义材料）保留 `{ text, tr, fp: null, r, t }`，键为 `t:` + 规范化文本。`loadUserSentences()` 通过已加载的常用句库解析引用，并省略无效引用（句库已更改），返回 `{ sentence, translation, sourceId, libraryId, rating, savedAt, recordKey }`。
- `收藏` 对话框的 "句子" 标签用单行行展示收藏（原文 + 星级，两者始终可见）；翻译和来源隐藏到该行被悬停或聚焦时，随后在下方自己的换行行中显示。
- 句子收藏包含在备份导出和云同步中。

相关实现：`src/app.js` 中的 `loadUserSentences()`、`sentenceFavoriteButton()`、`toggleSentenceFavorite()`。

## 本地词典

运行时词典以生成的压缩 SQLite 包分发。
设置面板按词典 ID 管理它们：

- `ecdict`：英语 ECDICT，在当前学习语言为英语时使用，
  并且仍由现有收藏详情和单词复习使用。
- `spanish-wiktionary`：Spanish Wiktionary / Kaikki，可作为单独本地包安装，
  也可进行测试查询。当前学习语言为西语时，
  右键查词和 `词库` 浏览使用此包；
  收藏星级、掌握卡和单词复习使用按语言隔离的
  西语记录。

每个包都有自己的清单文件和 OPFS SQLite 文件名。共享 Worker
按 ID 打开请求的包，在安装时验证表结构和词典身份，
并在安装后保持数据库只读。Worker 请求会串行执行，
因为同一个 SQLite 文件的 OPFS 同步访问句柄无法并行打开；
因此状态检查、安装、移除和查询都会在词典 Worker 内一次运行一个。

查词弹窗以及 `词库` 和 `收藏` 单词详情页头都会在收藏星级前显示同一个 `自动发音` 复选框；更改任意一个复选框会更新所有可见副本，并把共享选择存入 `localStorage` 键 `langLSRWDictionaryAutoSpeak`。它默认开启。启用时，`autoSpeakLookedUpWord()` 会在每次右键/快捷键查词后、切换到屈折形式后，以及新选中的词典词或收藏词渲染到右侧详情窗格时，用 TTS 朗读该单词。打开它会朗读当前显示的单词；收藏变化不会触发朗读。已经显示同一详情的行会忽略第二次焦点激活，防止先悬停后点击导致朗读两次。页头操作居中对齐，标签文本上移 1.5px，同时复选框下移 1.5px，让它们的视觉中心与星级匹配。弹窗最小宽度为三个 145px 掌握卡片加间隙、内边距和边框（471px，受视口限制），因此 识义 / 听写 / 默写 始终能放在一行；卡片自身的尺寸规则不变。其最大宽度为 800px，最大高度为 640px（两者都受视口限制）：释义和定义行会换行而不是撑宽弹窗，只显示前五条英文定义，直到点击 `展开全部（共 n 条）`，剩余溢出内容在弹窗内部滚动。`positionDictionaryLookup()` 应用该 640px 限制（它根据测量内容设置内联 `max-height`，因此没有该限制时长弹窗没有滚动条），并复用 `state.dictionaryLookupAnchor` 中存储的最后锚点。`展开全部` 会保持弹窗当前高度，并让额外定义在内部滚动；同一按钮随后显示 `收起`，再次折叠并重新运行定位以恢复自然高度。弹窗中的三个掌握卡保持固定 145px 宽（`repeat(3, 145px)`），而不是随弹窗拉伸。

- 只有在用户安装某个词典时，浏览器才下载该包。
- SQLite WASM 在 Worker 中运行，并把数据库存储在浏览器 OPFS 中。
- 查询是本地的，不调用 AI 或远程词典服务。
- 数据库是只读的，可以独立于用户数据移除或替换。
- `DictionaryService` 是稳定的、感知包的接口，因此未来服务端/MySQL 适配器可以替换本地适配器，而不必重写 UI。
- 精确 ECDICT 查询通常原样返回 ECDICT 的 `exchange` 字段。如果某个单 `l` 美式 `-ling`、`-led` 或 `-ler` 条目的该字段为空，Worker 会检查对应的双 `l` 拼写，并且只从该记录复制显式 `0:` 原形。除非替代条目及其原形都存在，否则不会应用回退。这个 ECDICT 专属回退不应用于 `spanish-wiktionary`。
- 词形（`exchange`）由各语言独立的词典规则读取：`src/languages/en/dictionary.js` 和 `src/languages/es/dictionary.js` 各自在 `window.langLSRWLanguages` 上注册 `exchanges(value)`（返回 `{ type, label, form, isBase }`）和 `exchangeGroups`，`src/app.js` 中的 `languageDictionary()` 会把当前学习语言的规则返回给 `dictionaryExchanges()` 和 `dictionaryExchangeHtml()`，后者只负责渲染。英语读取 ECDICT 中用 `/` 连接的 `type:form` 项，使用中文标签和 原形 / 名词 / 时态 / 分词 / 比较 分组。西语读取每行一个 `tags:form` 项（`0:<lemma>` 是原形；词形可以包含 `/`），在 原形 下显示原形，并把其他词形按其 Wiktionary 标签放在 其他 下。每个词形，包括原形，都是自己的可点击 `[data-dictionary-form]` 链接。
- 英语参考查词：当学习语言不是英语时，右键点击英文单词会在第二个弹窗中从 ECDICT 打开它（`#englishLookupPopover`，z-index 高于 `#dictionaryLookupPopover`）。学习英语时，在 `词库` / `收藏` 详情或查词弹窗的英文释义（`.dictionary-meanings` / `.dictionary-definitions`）里右键单词，同样打开这个英语子框，原来的查词弹窗保持不动。英语子框可以叠加：在子框里再右键会在它上面新建一个 `.english-lookup-popover`（`englishLookupPopoverFor()`），每个子框各自保存 `lookupAnchor`、`lookupEntry` 和词；栈由 `englishLookupStack` 管理，`closeEnglishLookup(from)` 关闭某个子框及其上层的所有子框；点击某个子框会关掉它上面的子框，点击所有子框之外的地方全部关闭，`Esc` 每次关闭最上面一个，朗读快捷键读最上面一个子框的词。子框的页头只有收藏星和 `×`（没有 `英语词典` 文字标签）。来源由 `englishReferenceSource()` 选择：查词弹窗的 `.dictionary-meanings` / `.dictionary-definitions`、`收藏` 详情、`词库` 详情、英语弹窗自身，以及练习区显示的英文句子翻译（`.translation-prompt > span`，遮罩或编辑中不算；包含长文行）。当点击位置在选择范围内时，`englishWordAtPoint()` 取所选英文短语（最多 60 个字符），否则通过 `caretPositionFromPoint` / `caretRangeFromPoint` 取指针下的单词，并用英语 `typedWordRegex()` 匹配。弹窗复用 `dictionaryLookupBodyHtml(result, window.langLSRWLanguages.en.dictionary)` 以及共享的 `placeLookupPopover()` / `toggleDictionaryDefinitions()`；它的词形链接和嵌套右键会在原地重新查询 ECDICT。发音使用 `englishReferenceSpeechOptions()`（保存的英语口音和语音，而不是西语的），并遵循 `自动发音`。它的五星保存到英语收藏：`dictionaryFavoriteButton(word, animate, "en")` 用 `data-favorite-language` 标记按钮，`toggleDictionaryFavorite()` 读取并写入该语言的 `userWordsStorageKey(languageId)`，使用 `state.englishLookupEntry` 作为条目且没有来源句子。不显示掌握卡。外部指针按下、`×` 或 `Esc` 只关闭此弹窗；关闭单词弹窗、`收藏` 或 `词库` 也会关闭它。
- `中译` / `英译`（非英语学习语言）：翻译操作在 `编辑` 左侧带有一个 `[data-translation-action="language"]` 按钮。它只是当前句子的一次性切换：`中译` 存储 `state.translationChinese = { index, key, text }`，并用浏览器 Translator 把该句的英文翻译译成中文（`en` → `zh`，复用一个翻译器实例；英语是 Translator 的中转语言，因此这比直接翻译西语更忠实），`displayedTranslation()` 在中文文本到达后显示它；`英译` 清除它。一旦当前序号或英文翻译变化，`chineseTranslationActive()` 就清除状态，因此移动到另一个句子、更换句库或编辑都会回到英文。不会缓存任何内容：中文文本不会写入 `langLSRWTranslationCache` 或其他任何地方，下次 `中译` 时会重新翻译。`编辑` 和已保存收藏继续使用英文翻译。`.has-language-toggle` 缩窄两个按钮的水平内边距，使它们适配 75px 星级列。
- `词库` 视图每次只从当前词典包请求一页 100 个条目。英语模式下，ECDICT 分类和排序控件可用。西语模式下，分类是字幕词频分层，排序是 字母 A-Z / 字幕词频（见下方频率项目），行显示西语复习状态槽，分类词组按英语相同方式工作。每行末尾都有来自 `dictionaryFavoriteButton()` 的当前学习语言五星可编辑收藏；页面每次渲染读取一次该语言已保存单词，并为所有行复用该数组。点击未收藏行的星级时，会先从当前词典查询完整条目再保存；点击已有评分时，可以不再次查询而更新或移除。任何变化后，`syncDictionaryFavoriteButtons()` 会替换当前渲染的同一规范化单词和语言的每个收藏星级组，因此列表和详情窗格会立即互相更新。英语 Collins 星级在词典详情中仍然可见，但不作为列表尾部评分使用。条目类型分类互斥且基于文本：开头 `-` 表示后缀；否则第一个字符不属于该语言字母（`A-Z`/`a-z`；西语还包括 `ÁÉÍÓÚÜÑáéíóúüñ`）表示特殊；剩余条目中包含内部 ASCII 空格的是短语；其余是单词。类型/分类筛选、总数统计、排序、限制和偏移都在 SQLite 内运行；浏览器绝不会把所有条目加载到 DOM 或应用内存。
- 从 `单词` 切换到 `后缀`、`短语` 或 `特殊` 时，会记住当前学习语言的当前单词分类，并把分类改为 `全部`。分类选择框保持启用，因此学习者随后可以把任何可用分类应用到该条目类型。回到 `单词` 时，会恢复该语言记住的单词分类。英语和西语在会话内保持各自独立的记忆值；这个临时 UI 状态不会写入浏览器存储。
- 词典频率排名和语言列表配置：词典清单可以带有 `frequency`（`file`、`version`、`entryCount`、`source`、`license`）；西语附带 `frequency.tsv`（`rank`、`word`、`count`；来自 `tools/build-spanish-frequency.py` 的 17,458 个词元）。`DictionaryService.frequencyOptions()` 会把其 URL 和版本随 `install`、`query`、`queryMany`、`list` 和 `studyList` 一起传递。Worker 的 `ensureFrequency()` 比较版本和 `dictionary_meta.frequency_version`；当二者不同时，它获取 TSV，并在一次事务内临时关闭 `query_only`，重建 `langlsrw_frequency`（`word` 为带 NOCASE 的主键、`frequency_rank` 建索引、`occurrences`）并记录版本，因此 70 MB 包永远不会因为排名变化而重建。失败的导入会被记住，并且只由需要排名的查询报告。Worker 中的 `LIST_PROFILES` 让每种语言的规则保持分离：英语分类和排序使用 ECDICT 字段；西语分类 `top500`…`top10000` 是 `frequency_rank <= N`，排序 `frq` 按排名排序，只在需要时连接频率表（`listSource()`），并按频率列表的拼写显示词元（`a`，不是合并后的 `A`）。`selectEntry()` 从表中填充 `frq`，因此查词和新收藏会带有排名。在页面中，`src/languages/<id>/dictionary.js` 提供 `frequencyLabels`（英语 `BNC` / `当代语料`，西语 `字幕`）、用于 `收藏` 筛选的 `matchesCategory()`，以及西语的 `词库` / `收藏` 分类和排序选项列表；`applyLanguageSelectOptions()` 在语言变化时替换这些列表，并恢复从 `index.html` 保存的英语选项。
- 当词典或收藏单词视图打开时，Up/Down 在当前页内选择单词，Left/Right 翻页。当输入框、选择框或文本框聚焦时，这些快捷键会暂停。按方向键会给当前列表添加 `.is-keyboard-navigation`，抑制静止指针的悬停框，因此只有单个 `.is-current` 行被高亮。指针第一次真实移动到某行上时，会让仍在该列表内的任何键盘聚焦元素失焦，移除键盘导航模式，并激活指针下的行。因此旧行不能保留列表选择边框或浏览器较粗的焦点轮廓。
- 词典对话框可由用户调整大小。`ResizeObserver` 根据列表可用高度和固定的 26 像素行高推导页大小，然后在保留先前第一个可见全局位置的同时重新查询 SQLite。列表本身没有垂直滚动条。
- `词库` 和 `收藏` 共享相同的浏览控件和交互模式，包括计数/搜索行、自适应分页、调整大小/重置行为和方向键导航。除非数据源需要明确差异，否则对这些通用交互的更改应同时应用到两个视图。词典搜索经过防抖后在 SQLite 内执行；收藏搜索在已保存到本地的数组上运行。

相关实现：`src/dictionary/dictionary-service.js`、`src/dictionary/dictionary-worker.js`、`tools/build-ecdict.py` 和 `tools/build-spanish-dictionary.py`。


## 句库

内置常用句库是一个带版本的静态包，包含稳定的来源 ID 和紧凑的 TSV 内容。

- 加载后，搜索和分页在本地运行。
- 预览每页渲染 50 行。
- 选择该包会把全部 30,150 条目提供给听力和口语练习。
- 导入的自定义材料仍然是用户数据，并且独立于内置包。
- `句库` 对话框中的每个预览行都有自己的 `▶` 按钮（`data-load-library-sentence`，由 `loadLibrarySentenceIntoPractice()` 处理），与收藏句子行上的按钮一致：它会加载整个常用句库，通过匹配稳定的来源 ID 直接跳到该行的句子，关闭对话框，并切换到听力页。这与 `使用此句库` 分开，后者始终从第一句开始。
- `用户收藏` 不会作为可选条目出现在 `句库` 对话框的侧边栏中（该对话框只列出内置常用句库和自定义导入/粘贴）。它仍然可以从工具栏的 `currentLibrarySelect` 快速切换下拉框中选择，后者通过 `useFavoritesLibrary()` 加载它，并走与常用句库相同的 `setCurrentLibrary()` 路径。它也可以通过 `收藏` 的 `句子` 标签中某一行的 `▶` 按钮触发 `loadFavoriteSentenceIntoPractice()`，成为当前练习来源；该函数会把每个收藏的 `sentence`/`translation`/`sourceId`/`libraryId` 映射为普通句子形状，直接跳到该句，并切换到听力页。
- 在练习来源中，`.target-english > .sentence-rating` 会把收藏星级与第一行对齐（`margin-top: max(0px, calc((1lh - 24px) / 2))`）。翻译行用右侧内边距预留星级列（75px + 12px 间距），使翻译及其隐藏遮罩在英文文本结束处结束；`编辑` 按钮定位在该列内。
- 听力工具栏中持久化的显示模式选择框（`#displayModeSelect`，位于 `显示原文` 前）提供 `单句显示`（单句）、`长文显示` 和 `长文聚焦`；旧的 `longText: true` 设置会映射到 `长文显示`。在两种长文模式中，`renderLongTextTarget()` 会用一个更大的可滚动上下文视图替换单句来源卡片，最多包含附近 15 个句子；每个句子都使用与当前句子相同的标记渲染（英文 18px，翻译 13px；听写输入通过 `.typing-shell.is-long-text` 切换到 18px，因此仍然像来源文本一样换行）：先是带五星收藏控件的英文行，再是带自己的 `编辑` 按钮的翻译行（非英语学习语言还带 `中译`），所以无论句子是否被选中，换行都完全相同。非当前行上的翻译按钮会先让该句成为当前句（`resetCurrent(true)`），然后编辑或翻译它，与 🌈 一样。相邻行上的星级会收藏该行自己的句子，并保留其翻译和来源 ID。当前句通过共享的 `placeTargetContent()`，在其高亮行内保留完整的单句听写视图（已输入单词状态、隐藏原文时被遮盖的单词、收藏星级、行内翻译编辑器和语法分析），而 `getActiveTargetWordEl()` 只搜索该行，因此单词重放和偷看永远不会选到相邻句子。点击非当前行（不在星级上，且没有选中文本时）会像按编号跳转一样让该句成为当前句：它不会计入已学，也不会触碰随机历史栈。在两种长文模式中，每次渲染都会围绕当前句构建窗口，并把当前行滚动到中央（先恢复之前的滚动位置，因此打字时重新渲染不会闪烁）。`长文聚焦` 还会淡化其他行（`.long-text-target.is-focus`：opacity 0.3 并带 0.5px 模糊，悬停时恢复到 0.75 且无模糊），并用 `visibility: hidden` 隐藏它们的收藏星级和翻译按钮，因此宽度和换行不会变化。有限的上下文窗口防止 30,150 句的常用句库创建巨大的 DOM，并且听写输入根据已输入文本自身定尺寸（一行，换行时增长），而不是根据放大的面板定尺寸；输入外壳用 `.typing-main`（预览 + 文本框）和右侧占位列 `#typingSide` 镜像一个来源行，该列预留给未来的输入控件；`alignTypingWidthWithSource()` 通过测量来确定该列尺寸（来源位于内边距不同的盒子里，长文视图还带滚动条），使已输入文本宽度等于当前来源文本宽度，并在同一个单词处换行。

## 音频 + LRC 材料

真实听力录音可以和它的定时字幕文件一起导入，因此练习会播放原声，而不是 TTS。完整的中文用户和开发者指南维护在 [`AUDIO_LRC.md`](AUDIO_LRC.md)；行为变化时要保持两处同步。

- `句库` 对话框有一个专门的 `音频字幕` 视图（`audioLibraryTabBtn` / `#audioLibraryPanel`，由 `setLibraryView()` 处理的三个视图之一）。它列出来自 `AUDIO_LIBRARY_MATERIALS` 的内置材料（默认 `assets/audio/Audio_Example.m4a` + `.lrc`），高亮正在使用的材料，并提供需要两个文件同时存在的音频 + `.lrc` 导入。`loadAudioLibraryMaterial()` 会获取字幕文本，并把整段音频作为 Blob 获取（本地 Python 服务器不支持 HTTP Range 请求，因此普通 URL 无法跳转定位到每个句子），然后调用共享的 `applyTimedMaterial()`；该函数会在 `音频字幕` 标签下切换句库，使工具栏的 `currentLibrarySelect` 显示 `音频字幕` 而不是 `自定义句库`。该下拉框始终提供 `音频字幕`（`value="audio"`）；选择它会在不离开当前页面的情况下加载默认材料 `AUDIO_LIBRARY_DEFAULT_ID`（`Audio_Example`），加载失败时恢复之前的选择。`tools/build-web.mjs` 会把 `assets/audio/` 复制到 `dist`，因此文件提交后，内置材料也能在已部署站点上工作；放在这里的所有内容都可被公开下载。
- 通过 `音频字幕` 面板导入两个文件，或把两个文件都拖放到听力页。`自定义句库` 面板的 `#fileInput` 接受单个 `.txt` / `.lrc`，并且只导入文本（`importSentenceFile()`）。`importSentenceFiles()` 会选出一个文本文件（`.txt` / `.lrc`）和一个音频文件（`audio/*` 或 `.m4a/.mp3/.wav/.ogg/.aac/.flac/.webm/.opus`）。只有文本文件时保留旧的纯文本导入；只有音频文件时会拒绝。
- `parseTimedLrc()` 保留每一行的时间戳（`[mm:ss]`、`[mm:ss.xx]`、`[mm:ss:xx]`、一行多个时间戳，以及 `[offset:±ms]`）。行按时间排序。纯中文行会成为前一个英文行的翻译，无论它共享同一时间戳还是位于其后。`splitInlineTranslation()` 只在左侧没有 CJK 时才把 `English <separator> 中文` 当作行内成对内容，因此包含冒号的中文翻译不会被拆成假句子。每个英文行保留 `{ text, translation, start, end, boundaryEnd }`：`boundaryEnd` 是下一个英文行的真实时间戳，而独立行的播放 `end` 仍然位于它前方 `TIMED_SEGMENT_END_MARGIN_SECONDS`（0.3 s）（至少保留 0.5 s）；翻译行永远不会截短句子。与文本导入不同，定时导入不会移除重复行。`capTimedSegments()` 把每行限制为 `2.5 s + 0.6 s × words`。当一行没有句末标点且以 `, ; :` 或破折号结尾，或下一行以小写字母开头时，`mergeTimedFragments()` 会把它并入下一行，最多 4 行。合并后的句子从第一个片段的开始时间播放到最后一个片段的真实 `boundaryEnd`，而不是再次应用独立行的 0.3 秒边距；这会保留时间很紧的续接行的最后几个单词。所有者的 BBC 样例从 39 行变为 28 个句子。
- `normalizeSentenceItem()` 会带着 `start` / `end` 继续传递，因为语法缓存、翻译编辑和 AI 分析会重写当前句子对象；没有这一点，片段会在第一次渲染时丢失，播放会静默回退到 TTS。
- `setAudioMaterial()` 只把文件作为内存中的对象 URL 保存在 `state.audioMaterial`；不会写入任何存储，因此重新加载后必须再次导入两个文件。`setCurrentLibrary()` 会调用 `clearAudioMaterial()`，所以切换到任何其他句库都会释放音频。
- 当存在片段时，`speakSentence()` / `speakSentenceAndWait()` 会通过 `playSentenceAudioAndWait()` 播放当前句子的 `[start, end)`；否则回退到 TTS。加载音频材料期间，口音选择框会获得一个 `原声` 选项（`value="original"`）：`setAudioMaterial()` 添加并选择它，`clearAudioMaterial()` 移除它并恢复已保存的口音。`currentSentenceAudioSegment()` 只有在选中 `原声` 时才返回片段，因此选择 英音 / 美音 会把同一批句子切换到 TTS。`原声` 永远不会保存：`saveSpeechSettings()`、语音、TTS `lang` 和语音识别读取 `ttsAccent()`（已保存的英语口音），并且语音选择框在 `原声` 激活时禁用。这些辅助函数驱动自动朗读、重放、慢速/正常/当前速度重放、口语页的 `speakModel` 快捷键，以及 `原声对比`。重放速度映射到 `playbackRate`。播放起点和字幕边界保持不变。一个懒创建的 Web Audio 增益节点会在播放实际开始后，立即针对剩余的 `[currentTime, end)` 时长安排静音，因此可听见的截断使用音频渲染时钟，而不是可变的 20 ms 轮询阶段。计时器只保留用于暂停已经静音的媒体元素并完成 Promise。显式停止会立即静音，清除材料会关闭上下文。

## 免费翻译

`自定义句库` 和 `音频字幕` 面板中的 `免费翻译当前句库` 按钮（`[data-free-translate]`）会调用 `translateCurrentLibraryForFree()`。它只对这两个句库运行，会检测浏览器内置的端侧 `Translator` API（桌面 Chrome/Edge 138+），检查 `Translator.availability({ sourceLanguage: "en", targetLanguage: "zh" })`，创建翻译器（首次使用时显示模型下载进度），并且只逐句翻译没有翻译的句子，同时在 `[data-free-translate-status]` 中报告进度。已有翻译，包括双语字幕行，永远不会被覆盖。结果按规范化英文文本存储在 `localStorage` 键 `langLSRWTranslationCache` 中；`fillTranslationsFromCache()` 会在每次自定义导入、粘贴和音频材料加载时填充匹配句子，因此每个句子在每个浏览器中只翻译一次。该缓存是浏览器本地的，不属于备份或云同步；设置菜单中的 `清除翻译缓存`（`clearTranslationCache()`）会在显示条目数并确认后移除它，不会触碰学习记录或字幕文件。不涉及付费 API 或密钥。

西语句库准备使用一个单独的本地辅助页面：
`../third-party/Spanish/spa-eng/03_translate_spanish_zh.html`。它读取带编号的
西语 TSV，并使用浏览器 `Translator API` 写入第四个中文翻译列，翻译人工英文列
（`sourceLanguage: "en"`，`targetLanguage: "zh"`）；只有英文列为空的行才回退到
西语句子（`es -> zh`）。所有者决定
2026-09-28：机器翻译经由英语中转，因此当英文足够准确时，它是更好的来源。当 `en -> zh`
不可用时，该页面会明确失败。

`音频字幕` 面板的 `翻译字幕` 按钮（`[data-subtitle-translate]`）会调用 `translateSubtitleFile()`，它可以处理任何定时 `.lrc`，不需要加载它或任何音频。在点击处理内部，它启动 `createFreeTranslator(canReport)`（首次使用的模型下载需要用户手势；下载消息只在 `Translator.availability()` 不是 `available` 时显示，因为 Chrome 对已安装模型也会报告进度），打开 `showOpenFilePicker()`（或一个隐藏文件输入控件，该控件在 `cancel` 时也会完成）；取消或选择不可用文件会停止进度报告、清除状态，并销毁待处理的翻译器；随后用 `parseTimedLrc()` 解析文件，填充缓存翻译，并通过 `translateSentencesForFree(pending, translator)` 翻译剩余内容。双语文本保存在 `pendingSubtitleWrite` 中，并显示 `写入原文件` 按钮（`[data-subtitle-write]`）；`writePendingSubtitle()` 随后会在同一个句柄上请求 `readwrite` 权限并写入，这需要第二次点击带来的用户激活。`另存字幕文件` 按钮（`[data-subtitle-save-as]`，`savePendingSubtitleAs()`）则会把同一文本写入来自 `showSaveFilePicker()` 的新文件（建议文件名 `<name>_双语.lrc`），不改动原文件。没有 File System Access API 时，第二个按钮会下载同名文件，另存按钮保持隐藏。`buildBilingualLrc()` 保留每个原始行，并在每个句子开始处的英文行之后插入 `[same stamp]中文`，因此合并句子会在其第一个片段之后得到一行，`parseTimedLrc()` 会把它重新附加到整个句子；开始时间已经有中文行的句子会跳过。对 `Audio_Example.lrc`（136 句）做一次 Node 往返处理会插入每条翻译，重新解析后句子和时间完全相同，第二次处理不会再插入任何内容。

## 口语循环播放

`原声对比` 是一个独立于下方音高/声学分析实验的、始终启用的功能。`toggleLoopCompare()` 要求已有录音，然后反复调用 `speakSentenceAndWait()`（音频 + LRC 材料使用原始音频片段，否则使用 TTS 朗读）和 `playRecordedAudioAndWait()`（现有的 `#speakingAudio` 元素播放 `state.speaking.recordedAudioUrl`），两者依次等待，中间有短暂停顿，并持续循环，直到再次点击按钮。它不需要 `getDisplayMedia` 权限，不进行捕获，也不生成图表，它只是交替播放，让学习者用耳朵比较。每次运行都会收到一个单调递增的 `loopCompareRunId`，待处理的录音 Promise 会暴露 `cancelLoopCompareAudio`；停止会立即完成该 Promise 并使运行 ID 失效，因此快速停止/重启不会留下旧循环等待，也不会创建重叠播放。`resetSpeakingResult()` 和离开 `listenPage` 都会调用 `stopLoopCompare()`，所以循环永远不会针对过期句子或在后台继续运行。

## 口语声音对比

`跟原声对比` 目前是一个实验性禁用功能。它的实现被保留，但入口按钮在 `index.html` 中隐藏，普通用户无法开始对比。在它的准确性、交互和浏览器兼容性成熟到足够日常使用之前，必须保持禁用。

为继续开发而启用时，它只使用本地信号处理，把学习者自己的录音与 TTS 范读进行比较；不会上传任何内容，也不会产生分数。一次分析运行会对每段音频解码一次，然后在四个紧凑标签中复用采样数据：`语调`、`重音`、`节奏` 和 `发音对比`。

- 学习者录音后，该操作才可用。第一次对比时，浏览器会打开系统共享对话框；学习者选择当前标签页并启用系统/标签页音频。之后的对比会复用实时共享音轨，因此在四个结果标签之间切换永远不会再次请求权限或再次录制 TTS。
- `getSharedTtsAudioStream()` 有意使用最小的 `getDisplayMedia({video:true, audio:true})` 请求；已知它会为此功能触发 Edge 的正常标签页音频选择器。学习者选择目标标签页并启用音频。授权后，视频轨道会立即停止且永远不会被录制；纯音频流缓存在 `state.speaking.ttsShareStream` 中并复用，直到其音频轨道结束。
- `captureTtsPlayback()` 会在调用 `speakTextAndWait()`（围绕 `speakText()` 的 Promise 包装器，会在语音的 `onend` 时完成）时录制该共享音频流，在语音开始前约 150ms 启动录制器，并在语音结束后约 150ms 停止，因此句子的开头/结尾不会被截掉。
- `getOrCaptureTtsAudio()` 按 `ttsCacheKey()`（句子文本 + 口音 + 语音 + 重放速度）把捕获到的参考音频缓存在 `state.speaking.ttsAudioCache` 中，这是一个不会持久化的内存 `Map`，完整页面重新加载会清除它（需要重新捕获，但不需要重新请求权限，因为只要标签页仍在共享，共享音频流本身可能仍可复用）。
- 如果捕获的参考音频不包含可用的有声音帧，已缓存的 Blob 会被删除，`clearSharedTtsAudioStream()` 会停止并丢弃当前共享。因此下一次点击会执行真正全新的捕获，而不是反复分析同一个无效录音。
- `decodeAudioForAnalysis()` 对每段录音解码、混合为单声道、峰值归一化，并一次性重采样到 16 kHz。随后 `extractPitchContour()` 在 1024 个采样的窗口上以 10ms 步长运行宽容的 YIN 式检测器，并把有界归一化自相关作为捕获到的 TTS 帧被 YIN 拒绝时的回退。`stabilizePitchContour()` 校正孤立的八度选择，拒绝不合理的短跳变，并应用五帧中值平滑器；只对最长 60ms 的空隙进行插值。
- `normalizePitchContour()` 把每条音高曲线转换为 `{tPct, semitone}`，即时间表示为该段音频自身时长的百分比，音高表示为相对于该段音频自身有声音中位频率的半音数，因此两个绝对音高范围和说话速度不同的说话者仍然可以按轮廓形状比较。
- `extractEnergyAnalysis()` 为 `重音` 视图构建平滑的相对 RMS 包络，并为 `节奏` 视图推导紧凑的有声/静音片段和停顿次数。数值在每个说话者自己的音频内归一化，因此图表比较的是强调形状，而不是麦克风响度。
- `extractMfccFrames()` 从 20 个梅尔滤波器计算 12 个本地归一化 MFCC 系数。`compareAcousticFeatures()` 用受限动态时间规整对齐参考帧和学习者帧，然后渲染一个 80 格冷暖色差异条。这会在容忍说话速度不等的同时，让宽泛的声音形状差异可见；它不会识别音素错误，也不会测量发音准确度。
- `renderPitchCompareChart()` 在四个缓存结果视图之间切换。音高图会把两条归一化曲线作为内联 SVG 绘制（`范读` vs `我的录音`），并对照 `+12 / 0 / -12` 半音参考线；插值空隙保持使用其来源曲线颜色的虚线，而不会表现成误导性的第三条序列。每个视图都保留两行紧凑时间，显示两段录音各自的开始、中点和结束时间。状态行始终说明这些是本地视觉对比，不是发音分数。
- 对比结果和捕获的 TTS 音频只是会话内存。制作新的学习者录音会重置显示结果；重新加载页面会清除对比和参考缓存。录音及其派生特征数据都不会进入浏览器持久化、备份导出或云同步。
- 本地声学视图可以显示两段录音大致在哪里不同，但不能说明哪个音素或单词错了。音素对齐、感知口音的正确性判断和站得住脚的发音分数需要专门的语音评估模型或外部服务，目前未实现。

## 全文朗读模式

`全文`（`modeSelect` 值 `fulltext`）位于 `随机` 之后。`speakCurrentSentence()`（`朗读` 按钮、它的快捷键，以及句子变化时的自动朗读）会启动 `startFullTextReading()`，而不是只读一个句子；再次按 `朗读` 会停止它。使用原始音频（`原声`）时，它会调用 `playFullTextAudio()`：从当前句子的开始时间到最后一句的结束时间连续播放，不按句子跳转、截断或暂停；一个 50 ms 计时器跟随音频时钟，并在播放到下一句开始时间时让下一句成为当前句（`advanceFullTextSentence()` → `resetCurrent(false)`，并设置 `state.fullTextAdvancing`，从而跳过停止音频）。使用 TTS 时，循环会等待每个 `speakTextAndWait()`，然后立即开始下一句，不增加停顿。它会在句库最后一句之后停止。`stopFullTextReading()` 会从 `resetCurrent()`（任何其他导航）、`switchSpeakingSentence()`、`stopSpeech()`、`speakText()` 中断（例如单词重放）、`setCurrentLibrary()` 和模式变化中运行。运行期间，朗读按钮显示 `停止 ⏹`。`全文` 中的导航键行为类似顺序模式（`pickSentenceIndex()` 落入序号计算），前进不会计入已学数量。

## 随机模式导航历史

在 `随机` 练习模式中，`pickSentenceIndex()` 保留两个会话内栈，每个最多 10 条记录，因此 `state.sentences` 的大小不会限制学习者能后退多远：

- `state.randomHistory`（后退栈）：每次向前移动时离开的句子（新的随机选择，或重做）都会压入这里。
- `state.randomForwardStack`（前进栈）：通过 "上一句"/◀ 离开的句子会压入这里。
- "上一句"/◀ 会从 `randomHistory` 弹出；如果它为空，该操作无效果（停留在当前句子），而不是随机选择。
- "下一句"/▶ 会先在 `state.randomForwardStack` 有记录时清空它（重做），因此后退再前进会返回离开的那个句子，而不是立即把它重新随机掉。只有前进栈为空后，才会发生新的随机选择。
- 两个栈都会在 `setCurrentLibrary()` 中重置，也就是每当当前材料改变时重置，因为旧序号不再指向正确句子。
- 顺序和错题模式不受影响；它们使用直接的序号计算，而不是这些栈。
- 默认按键：Left / Right 运行上方的 上一句 / 下一句（依赖模式），而 Up / Down 运行单独的 `previousSentenceInOrder` / `nextSentenceInOrder` 快捷键，由 `goSentenceInOrder()` 处理：在每个模式中都按句库顺序移动到相邻序号，不触碰随机栈。向前移动会像 `goNextSentence()` 一样计入已学。
- `speakSentence` 快捷键（`朗读当前词/句`）会经过 `speakCurrentWordOrSentence()`：它朗读打开的查词弹窗、单词复习卡（不是未作答的 默写 卡）、`收藏` 或 `词库` 详情中的单词，否则朗读 `听` / `说` 上的当前句子。`speakCurrentWord` 快捷键现在标注为 `长文默写时手动发音下一个词`。
- `updateSentenceNavigationTitles()` 会让练习顺序选择框和 ◀ / ▶ 按钮上的悬停提示与当前模式和已配置按键保持同步（模式变化时以及每次快捷键设置渲染时刷新）。

## 语法节点渲染

`renderGrammarNodes()` 会根据每个节点自己的 `role`/`type`/`text` 构建该节点卡片，与它在树中的位置无关。

- 当节点的 `text` 匹配 `/^[\p{P}\s]+$/u` 时，该节点会被视为纯标点（完全隐藏标签）——这里检查的是来源文本本身，而不是 AI 返回的标签措辞，因此不依赖模型说的是 "标点"、"标点符号" 还是别的内容。
- `.grammar-node-content` 使用 `flex-wrap: nowrap` 和 `align-items: baseline`；角色/类型徽标（`.grammar-role`）是 `flex-shrink: 0; white-space: nowrap`，因此它永远不会缩小或内部换行，而句子文本（`.grammar-text`）是 `flex: 1 1 auto; min-width: 0`，因此它会在自己的盒子内换行，而不是整个文本项掉到新行。使用基线（不是盒子居中）对齐，是因为中文字体标签和英文字体文本在匹配行高下没有相同的视觉中心。
- 顶层节点卡片没有固定像素宽度上限（只有 `max-width: 100%`，受该行自身的 `flex-wrap` 限制），因此长从句会使用其所在行实际剩余的空间，而不是因任意限制过早换行。
- 当节点的 `type` 包含 `从句` 时，该节点会被标记为 `is-clause`。嵌套从句节点无论展开/折叠状态如何，始终渲染按角色着色的上边框；其他嵌套节点只有在带子节点且已折叠时才获得着色边框（`has-children:not(.is-expanded)`）。
- 展开已折叠节点（点击 `data-grammar-toggle`）时，会先收集该节点所有后代 ID（`collectGrammarDescendantIds()`），并在把该节点自己的 ID 加回之前，从 `state.grammarExpandedNodeIds` 中移除它们。因此节点始终只打开到一层子节点，永远不会恢复会话前面残留的更深展开状态。

## 语法分析缓存

语法分析由手动触发，在普通练习中永远不会自动运行。

- 结果会缓存并复用，而不是为同一条已存结果再次请求 AI。
- 缓存结果会保留数据架构和分析规范来源。
- 分析规范变化不会静默地重新标注、删除或重新生成旧分析。
- 重新分析始终是显式用户操作。
- 已经有分析的句子（在句子项上，或在传统框架的语法缓存中）会在其翻译行中、`编辑` 左侧显示一个 🌈 按钮（`[data-grammar-toggle]`）；`编辑` 和 🌈 共用定位在星级列中的 `.translation-actions` 组。在当前句上，它会切换 `state.grammarVisible`；在相邻长文行上，它会切换到该句并显示其分析。长文行会检查每次渲染构建一次的 `grammarCacheKeySet()`。
- 请求运行期间，`analyzeCurrentGrammar()` 会固定被分析的句子（`state.grammarLoadingIndex` / `state.grammarLoadingSentences`）：`正在分析语法...` 占位文本只显示在该句上，因此它不再跟随学习者或 `全文` 朗读移动到其他句子，结果也会写入该句，而不是写入当时当前的任意句子。分析成功时，它会停止 `全文` 朗读；如果视图已经移走，则返回被分析的句子（仅限同一句库），并显示结果。

## 控件提示

每个交互控件都通过悬停提示说明自己。控件在普通 `title` 属性中声明文本（静态标记，或动态文本使用 `element.title = ...`）。第一次 `pointerover` 时，`app.js` 中的共享处理器会把 `title` 移入 `data-tooltip`，使浏览器原生提示永远不会出现，然后在悬停 300 ms 后显示 `#controlTooltip`。提示位于指针正下方（靠近视口底部时位于上方），支持 `\n` / `&#10;` 换行，宽度等于最长行（除非视口更窄，否则只在这些换行处断行），并在指针离开、指针按下、按键、滚动或窗口失焦时隐藏。触控输入不会触发它。之后当代码重写 `title` 时，下一次悬停会读取新文本。提示文本应说明控件做什么，并提到快捷键或右键菜单等非显而易见的交互。例外：`背单词` 启动器（`识义` / `听写` / `默写`）不带 `title`，因为悬停它们时已经会在单词详情窗格中显示完整的记忆机制说明，包括右键操作。

## 构建和部署

源代码是维护中的项目；`dist/` 是可丢弃的输出。

- `npm run build` 从当前源码生成 `dist/`。
- Vercel 从源码仓库构建，并发布生成的输出。
- 公开 Supabase 配置会在生产构建期间从 Vercel 环境变量注入。
- 本地测试使用 `tools/start-langlsrw-server.bat` 和 `http://localhost:8848/`。
- 成功的本地构建不会部署任何内容。
- 推送或部署需要所有者的显式操作或请求。
