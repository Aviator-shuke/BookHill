# langLSRW Mechanisms

Last updated: 2026-09-26

This document records how implemented product behavior works. It describes the current code, not planned behavior. Update it whenever a trigger, storage rule, identity boundary, synchronization scope, or deployment mechanism changes.

## User Identity

langLSRW has two independent identity modes:

- A Google account is identified by its immutable Supabase user ID.
- A local user is identified by an explicitly created local username.
- A Google account is never converted into an email-named local user.
- Signing out clears the active cloud identity and returns to user selection.
- Local-user data and cloud-account data use separate browser-storage namespaces.

## Local Persistence

The currently implemented development-stage application is local-first. Settings, practice records, learned count, imported material, cached analysis, and user collections are stored in browser storage unless a mechanism below says otherwise.

- Local users can export and import their data as JSON.
- Google-account browser data acts as the working local copy for that account.
- Clearing browser site data removes local copies and locally installed dictionary data.
- The replaceable ECDICT database never stores user-created data.
- The learner's current position (`{ libraryLabel, index }`) is saved per identity under `langLSRWLastPosition:*` every time `resetCurrent()` or `switchSpeakingSentence()` runs — both are called whenever the active sentence changes (dictation flow and the shared ◀/▶ navigation respectively), and each must independently save the position since they don't call each other. On boot, `tryLoadDefaultLibrary()` reloads that same library — `用户收藏` (rebuilt from `loadUserSentences()`) if that was last active and still has entries, otherwise the built-in common library — and restores the saved index if it's still in range, defaulting to 0 otherwise. Imported custom material is not reloaded on boot (its content isn't persisted outside cloud sync), so a saved position pointing at a custom library is simply unused until that material is reselected in that session.

## Cloud Synchronization

Supabase stores one synchronized state row per Google account.

- Login reads the cloud row once and restores its supported data.
- Automatic cloud writes are currently disabled by `AUTO_CLOUD_SYNC_ENABLED = false`.
- The retained automatic path uses a 1.2-second debounce but does nothing while that flag is disabled.
- The `手动同步` action replaces the account's cloud row with the current supported state.
- The synchronized payload includes settings, learned count, up to 80 recent practice records, and the complete active custom sentence library.
- It excludes the built-in sentence library, ECDICT database, recordings, local-user data, AI API keys, and user word/sentence collections.
- Supabase Row Level Security must keep every account limited to its own row.

Relevant implementation: `src/app.js`, `src/auth/supabase-auth-service.js`, and `supabase/schema.sql`.

### Formal-release direction

The formal-release account experience is intended to be cloud-first, but this is a product direction rather than current implemented behavior.

- For a signed-in account, cloud storage will become the authoritative cross-device record.
- Browser storage will become an offline cache and performance layer rather than the sole working source of truth.
- Local-user mode will remain explicitly local-only and independent from account data.
- Switching to cloud-first requires complete synchronization coverage, queued offline writes, deterministic conflict resolution, schema/data migrations, retry and recovery behavior, and visible synchronization status.
- The current whole-row manual upload and disabled 1.2-second automatic path are development-stage mechanisms and must not simply be enabled as the formal cloud-first implementation.

## Learned Count

The learned count measures sentence advances, not unique sentences.

- It increments whenever the learner executes the next-sentence action.
- Button, shortcut, and completion-driven advances use the same mechanism.
- Repeating or randomly revisiting a sentence increments it again.
- Previous-sentence navigation and passive rendering do not increment it.
- The value is stored per user and is included in local backup and supported cloud synchronization.

Relevant implementation: `incrementLearnedCount()` in `src/app.js`.

## User Word Collection

Right-click dictionary results can be added to the current identity's local word collection.

Each saved word is a complete snapshot containing:

- `word`
- `phonetic`
- `definition`
- `translation`
- `pos`
- `collins`
- `oxford`
- `tag`
- `bnc`
- `frq`
- `exchange`
- `sourceSentence`
- `sourceTranslation`
- `rating` (1-5)
- `savedAt`

The source sentence and translation are saved as complete text, not as a sentence number or library reference. This preserves the example even if the active library, sentence order, or source material later changes. Saving several words from one sentence intentionally duplicates that small text snapshot.

Collection level uses five stars. Clicking a level stores that integer; clicking the active level again removes the word. Existing records without `rating` are interpreted as level 1 without requiring a destructive migration.

Storage namespaces:

- Google account: `langLSRWUserWords:cloud:<Supabase user ID>`
- Local user: `langLSRWUserWords:<local username>`

The collection supports category filtering from the saved ECDICT metadata and sorting by saved time, alphabet, BNC rank, contemporary-corpus rank, or Collins stars. It is not currently synchronized to Supabase.

The visible product name is `收藏`. Its word view shares the dictionary window's resizable layout, fixed-height rows, adaptive client-side page size, compact page controls, and Up/Down word plus Left/Right page navigation. Unlike the complete dictionary, its already-local collection is filtered, sorted, and paginated in browser memory.

Relevant implementation: `userWordsStorageKey()`, `toggleDictionaryFavorite()`, and `renderUserPhrases()` in `src/app.js`.

## Word Review (背词)

The full Chinese specification of this mechanism is maintained in [`WORD_REVIEW.md`](WORD_REVIEW.md); keep both in sync when the behavior changes.

Collection review and complete word-list study each show one compact launcher row: `背单词：识义(n) 听写(n) 默写(n)`. Each `n` is the number of words already mastered in that dimension under the selected category, not the category total or the current round size. A dimension is mastered only when its record has an interval of at least 21 days, at least 3 successful repetitions, and `lastGrade="good"` from an unassisted correct answer. `again` (including any hinted answer) resets the interval and repetitions and immediately removes mastery. Collection counts also enforce each mode's star eligibility but deliberately ignore the search field; word-list counts intersect the selected category's words with the shared records and also ignore dictionary search. Each entry opens its own mode-specific dialog, with no tabs or in-session mode switching; that dialog contains only its own prompt, controls, keyboard behavior, progress, completion state, and clear-memory action. The three interfaces share dictionary lookup, audio, queue construction, and scheduling helpers. Word-list entries support Oxford 3000 / 中考 / 高考 / CET4 / CET6 / 考研 / IELTS / TOEFL / GRE; `全部` disables all three because it is the complete dictionary rather than a meaningful study deck. The selected dictionary sort controls new-word order. A dedicated `studyList` Worker request loads all word names for the selected category with one SQLite query and caches that category/sort deck for the browser session; full entry details are still queried only for the current card. While any of the three dialogs is open, global learning shortcuts are suspended (`isTopMenuOpen()` detects `.word-review-modal:not([hidden])`) and Esc closes it first.

Every word detail surface ends with `当前单词掌握程度`, showing independent `识义 / 听写 / 默写` states. A state is `已到期` whenever a started record is due (taking precedence, like the list icons), `未学习` without a record, `学习中` after practice but before the mastery predicate is met, and `已掌握` when the existing 21-day / 3-repetition / latest-unassisted-good predicate passes. Each dimension also shows its current review interval, next scheduled review time, 间隔系数 (ease, two decimals; the short label for 间隔扩大系数), and 连续答对 count; overdue records say `现在（已到期）`, while untouched records show `—`. Dictionary, 收藏, and context-menu details all read the same identity-specific record for that normalized word.

- `识义` (recognize): uses a compact header with word, larger phonetic, pronunciation button, and an editable five-star collection control, followed by five answers. The first three are local-dictionary meaning candidates; the correct meaning is randomly included 75% of the time and omitted 25% of the time. The fourth answer is `以上都不是`, and the fifth is `不认识`. A correct candidate or correctly choosing `以上都不是` records `good`; a wrong answer or `不认识` records `again`. Number keys 1-5 select and confirm immediately; no choice is highlighted initially, the first Down highlights choice 1 (Up highlights choice 5), and Enter confirms the highlighted choice (ignored when none is highlighted). Distractors prefer the active practice scope and fall back to Oxford 3000, loaded through one batched Worker request without AI.
- `听写` (listen): shows only a `_`-pattern with the letter count and speaks the word; the meaning is shown only after answering.
- `默写` (spell): shows only the meaning and part of speech with the `_`-pattern; no audio before answering, so the sound does not give away the spelling.
- In both spelling modes Enter submits, Tab reveals the next letter, `不会，看答案` reveals the word. Grading is automatic and strict: an exact match (case/whitespace-insensitive) without hints is `good`; any hint, a mismatch, or a reveal is `again`, and a hinted correct spelling shows `拼对了，但用了提示，算答错`. The `hard` grade is no longer produced. Wrong answers show a letter-by-letter diff.
- Each mode has its own `{ interval, ease, reps, lapses, due, lastReviewedAt, lastGrade }` schedule. All entries and categories use one identity-specific record per normalized word under `langLSRWWordReviews:*`; categories and 收藏 only select practice scope. The app does not read, merge, or migrate the former category-specific or favorite-embedded review structures. `ease` is called 间隔扩大系数 in Chinese: it starts at 2.5, is the factor by which the next interval grows after a correct answer, drops when the word is forgotten or only recalled with difficulty, and slowly recovers by 0.05 per `good` up to 2.5, so a lower value means the word is reviewed more often. It describes how fast the interval grows, not whether the word is mastered. The three modes remain independent (no unlocking ladder, no cross-mode credit).
- In collection review, the favorite's star rating sets which modes a word enters, cumulatively: 1 star `识义`; 2 stars also `听写`; 3 stars and above also `默写`. 4 and 5 stars currently behave like 3 stars; they mean "very important" and are reserved for later priority features. A word with no rating counts as 1 star. Complete word-list decks make every word available in all three modes and do not use collection stars.
- `buildWordReviewQueue(mode)` reads the active source, orders that mode's due words (earliest first), then adds up to 20 words with no record in that mode. Collection review first applies its current category/search/sort and star eligibility; word-list study uses the complete loaded category. `again` words are appended to the end of the current session. The queue records its due/new segment sizes, and the progress line reads `到期复习 · 第 n / D 个`, `新词学习 · 第 g 组 · 第 n / F 个`, or `忘了再练 · 第 n / R 个`; new words form groups of 20, and `g` is the number of words already learned in that mode and scope at round start divided by 20, rounded down, plus 1.
- Free practice (`自由练习`) is opened from the round-end card or from a launcher button's right-click menu. `buildFreeWordReviewQueue(mode)` shuffles the active scope's words that already have a record in that mode, regardless of due time, and takes up to 20. It uses the normal cards, grading, and result panel, but `gradeWordReview` skips `saveWordReviewGrade`, so free practice never changes intervals, ease, due times, or mastery. The progress line shows `自由练习 · 第 n / N 个 · 不计入记忆`, and the end card offers `再来一轮`.
- `scheduleWordReview()` is a simplified SM-2: `good` gives 1 day, then 3 days, then `interval × ease`; `again` resets repetitions, counts a lapse, lowers ease by 0.2 (floor 1.3) and makes the word due again in 10 minutes. `good` computes the interval with the current ease and then raises ease by 0.05, capped at 2.5, so a word with early lapses regains the normal growth rate after enough clean recalls (24 from the 1.3 floor). Differences from original SM-2 (automatic grading, 1/3-day first intervals, Anki-style −0.2/−0.15 penalties, the 1.3 floor, the 2.5 cap, and ease recovery) are explained with their rationale and comparisons to Anki, FSRS, and other products in `WORD_REVIEW.md` §7.
- After an answer, the verdict, correct answer, meanings, and `下一个` appear in a result side panel that pops out to the right of the dialog, so the dialog keeps its height and centered position; below 1220px viewport width the panel overlays the dialog's right side. While any review dialog is open, arrow keys are not passed to the 收藏 or 词库 list navigation underneath.
- Hovering a `识义` / `听写` / `默写` launcher temporarily replaces the 收藏 or 词库 word detail pane with that mode's memory rules in six numbered parts (`练习范围`, `练习方式`, `练习组题`, `复习时间怎么定`, `掌握`, `其他`): practice scope with live counts of 未学习 / 学习中📕 / 已掌握✅ / 已到期🕗 words; a one-line practice method without keys or grading rules; round composition and order; the interval rule in plain words (`下次间隔天数 = 上次间隔天数 × 间隔扩大系数`, the 1/3-day first steps, reset on a wrong answer, the 间隔扩大系数 range and 1.3 floor, and that the consecutive-correct count only feeds mastery); the two user-facing mastery conditions (interval ≥ 21 days and ≥ 3 consecutive correct answers); and other notes (independent and shared records, right-click actions). Every item is a ● bullet at 12px, and the title sits close to the pane top so the help usually fits without scrolling. The launchers themselves have no `title` tooltip. The help stays after the pointer leaves so it can be scrolled; hovering a list word replaces it with that word's detail, and pressing a launcher restores the previous detail HTML, scroll position, and lookup entry. Late statistics never overwrite a detail that has already replaced the help.
- Word rows in 收藏 and 词库 start with three fixed-width status slots for 识义 / 听写 / 默写: 🕗 due, 📕 learning, ✅ mastered, blank when untouched (still reserving width so words align). Due takes precedence. `refreshWordReviewStatusIcons()` updates visible rows in place after a review closes or memory is cleared. Clicking the status slots opens a menu to set or cancel **manual mastery** per mode (or for all three). Manual mastery is a separate mark stored in `langLSRWWordManualMastery:*` (`{ version: 1, words: { word: { mode: isoTime } } }`) and never changes the spaced-repetition record: marked modes show 🟢 (taking precedence over other icons), count as mastered in launcher counts and help statistics (not as learning or due), are skipped by `buildWordReviewQueue`, and show `手动掌握🟢` in mastery cards with every schedule field shown as `—` (the stored values reappear after cancelling). Clearing a mode's memory also clears its manual marks in scope. `migrateLegacyManualMastery()` converts records written by an earlier build that stored manual mastery inside the review record. A continuous divider after the slots is painted as a 1px row background at x = 61px across each row's border box, so it stays unbroken on hovered and current rows. Scope statistic boxes and mastery cards share state colors: 未学习 gray (`is-new`), 学习中 orange, 已掌握 green, 已到期 blue (`is-due`). Mastery cards also show 间隔系数 (ease) and 连续答对, with `—` for untouched modes.
- Clearing is not inside the practice dialogs: right-clicking a `识义` / `听写` / `默写` launcher button in 收藏 or 词库 opens a context menu with that mode's `清除识义记忆` / `清除听写记忆` / `清除默写记忆`. From 收藏 it clears that mode from every favorite of the identity; from 词库 it clears that mode only from the selected category deck (disabled for `全部`). Other modes, collection stars, and other word-list categories are untouched.
- Neither collection-review records nor word-list study records are yet included in backup export or cloud sync.

## User Sentence Collection

The listening page's English source line has a five-star sentence-favorite control (`sentenceFavoriteButton`), using the same interaction as word favorites: click a level to set it 1-5, click the current level again to remove it. Sentences are matched case- and whitespace-insensitively (`sentenceFavoriteKey`), so re-favoriting the same sentence updates the existing entry instead of duplicating it.

- Google account: `langLSRWUserSentences:cloud:<Supabase user ID>`
- Local user: `langLSRWUserSentences:<local username>`
- Each stored entry is `{ sentence, translation, sourceId, libraryId, libraryLabel, rating, savedAt }`. `sourceId`/`libraryId`/`libraryLabel` are only captured when the favorited sentence is the currently active one; they are empty for sentences favorited another way (e.g. re-rating from the 收藏 dialog).
- The 收藏 dialog's "句子" tab lists favorites in a single-line row (original text + star rating, both always visible); translation and source are hidden until the row is hovered or focused, then appear on their own wrapped line below.
- Sentence collections are not currently synchronized to Supabase, and are not yet included in `导出数据`/`导入数据` backups.

Relevant implementation: `userSentencesStorageKey()`, `loadUserSentences()`, `sentenceFavoriteButton()`, `toggleSentenceFavorite()` in `src/app.js`.

## Local Dictionary

ECDICT is distributed as a generated compressed SQLite package.

- The browser downloads the package only when the user installs the dictionary.
- SQLite WASM runs in a Worker and stores the database in browser OPFS.
- Queries are local and do not call AI or a remote dictionary service.
- The database is read-only and can be removed or replaced independently of user data.
- `DictionaryService` is the stable interface so a future server/MySQL adapter can replace the local adapter without rewriting the UI.
- Exact lookup normally returns ECDICT's `exchange` field unchanged. If a single-`l` American `-ling`, `-led`, or `-ler` entry has an empty field, the Worker checks the corresponding double-`l` spelling and copies only an explicit `0:` lemma from that record. No fallback is applied unless both the alternate entry and its lemma exist.
- The `词库` view requests only one 100-entry page at a time. ECDICT has no dedicated entry-type column, so classification is mutually exclusive and text-based: a leading `-` means suffix; otherwise a first character outside `A-Z`/`a-z` means special; remaining entries with an internal ASCII space are phrases; and the rest are words. This means multiword proper names beginning with a letter appear under phrases, while entries such as `'hood`, `.45-caliber`, and `'s Gravenhage` appear under special. Type/category filtering, total counting, sorting, limits, and offsets run inside SQLite; the browser never loads all entries into the DOM or application memory.
- While the dictionary view is open, Up/Down selects words within the current page and Left/Right changes pages. These shortcuts are suspended while an input, select, or textarea has focus.
- The dictionary dialog is user-resizable. A `ResizeObserver` derives page size from the list's available height and the fixed 26-pixel row height, then re-queries SQLite while preserving the previous first-visible global position. The list itself has no vertical scrollbar.
- `词库` and `收藏` share the same browsing controls and interaction pattern, including the count/search row, adaptive pagination, resize/reset behavior, and arrow-key navigation. Changes to these common interactions should be applied to both views unless their data source requires an explicit difference. Dictionary search is debounced and executed inside SQLite; collection search runs against the already-local saved array.

Relevant implementation: `src/dictionary/dictionary-service.js`, `src/dictionary/dictionary-worker.js`, and `tools/build-ecdict.py`.

## Sentence Libraries

The built-in common library is a versioned static package with stable source IDs and compact TSV content.

- Search and pagination run locally after loading.
- Preview renders 50 rows per page.
- Selecting the package exposes all 30,150 entries to listening and speaking practice.
- Imported custom material remains user data and is independent of the built-in package.
- Each preview row in the `句库` dialog has its own `▶` button (`data-load-library-sentence`, handled by `loadLibrarySentenceIntoPractice()`), matching the one on favorite-sentence rows: it loads the whole common library, jumps straight to that row's sentence by matching its stable source ID, closes the dialog, and switches to the listening page. This is separate from `使用此句库`, which always starts at the first sentence.
- `用户收藏` is not offered as a selectable entry in the `句库` dialog's sidebar (that dialog only lists the built-in common library and custom import/paste). It remains selectable from the toolbar's `currentLibrarySelect` quick-switch dropdown, which loads it via `useFavoritesLibrary()` following the same `setCurrentLibrary()` path as the common library. It can also become the active practice source via `loadFavoriteSentenceIntoPractice()`, triggered by the `▶` button on a row in `收藏`'s `句子` tab, which maps each favorite's `sentence`/`translation`/`sourceId`/`libraryId` into the normal sentence shape, jumps straight to that sentence, and switches to the listening page.

## Speaking Loop Playback

`原声对比` is a separate, always-enabled feature from the pitch/acoustic-analysis experiment below. `toggleLoopCompare()` requires an existing recording, then repeatedly calls `speakTextAndWait()` (TTS reading) and `playRecordedAudioAndWait()` (the existing `#speakingAudio` element playing `state.speaking.recordedAudioUrl`), each awaited in turn with short pauses between, looping until the button is clicked again. It needs no `getDisplayMedia` permission, no capture, and produces no chart — it is just alternating playback for the learner to compare by ear. Each run receives a monotonically increasing `loopCompareRunId`, and the pending recording Promise exposes `cancelLoopCompareAudio`; stopping resolves that Promise immediately and invalidates the run ID, so a rapid stop/restart cannot leave an old loop waiting or create overlapping playback. `resetSpeakingResult()` and leaving `listenPage` both call `stopLoopCompare()` so a loop never keeps running against a stale sentence or in the background.

## Speaking Voice Comparison

`跟原声对比` is currently an experimental, disabled feature. Its implementation is retained, but the entry button is hidden in `index.html` and ordinary users cannot start the comparison. It must remain disabled until its accuracy, interaction, and browser compatibility are mature enough for daily use.

When enabled for continued development, it compares the learner's own recording against the TTS model reading using only local signal processing; nothing is uploaded and no score is produced. One analysis run decodes each clip once, then reuses the samples across four compact tabs: `语调`, `重音`, `节奏`, and `发音对比`.

- The action is available after the learner has made a recording. On the first comparison, the browser opens its system sharing dialog; the learner selects the current tab and enables system/tab audio. Later comparisons reuse the live shared audio track, so changing among the four result tabs never requests permission or records the TTS again.
- `getSharedTtsAudioStream()` deliberately uses the minimal `getDisplayMedia({video:true, audio:true})` request that is known to produce Edge's normal tab-audio picker for this feature. The learner selects the desired tab and enables audio. Once granted, the video track is stopped immediately and never recorded; an audio-only stream is cached in `state.speaking.ttsShareStream` and reused until its audio track ends.
- `captureTtsPlayback()` records that shared stream while calling `speakTextAndWait()` (a promise-based wrapper around `speakText()` that resolves on the utterance's `onend`), starting the recorder ~150ms before speech begins and stopping it ~150ms after speech ends, so the start/end of the sentence isn't clipped.
- `getOrCaptureTtsAudio()` caches the captured reference clip per `ttsCacheKey()` (sentence text + accent + voice + replay rate) in `state.speaking.ttsAudioCache`, an in-memory `Map` that is not persisted — a full page reload clears it (a fresh capture, not a fresh permission prompt, since the shared stream itself may still be reusable if the tab is still being shared).
- If the captured reference contains no usable voiced frames, the cached blob is deleted and `clearSharedTtsAudioStream()` stops and discards the current share. The next click therefore performs a genuinely fresh capture instead of repeatedly analyzing the same invalid recording.
- `decodeAudioForAnalysis()` decodes, downmixes, peak-normalizes, and resamples each recording to 16 kHz once. `extractPitchContour()` then runs a tolerant YIN-style detector over 1024-sample windows at a 10ms hop, with bounded normalized autocorrelation as a fallback for captured TTS frames that YIN rejects. `stabilizePitchContour()` corrects isolated octave choices, rejects implausible short jumps, and applies a five-frame median smoother; only gaps up to 60ms are interpolated.
- `normalizePitchContour()` converts each contour to `{tPct, semitone}` — time as a percentage of that clip's own duration, and pitch as semitones relative to that clip's own median voiced frequency — so two speakers with different absolute pitch ranges and different speaking rates can still be compared by contour shape.
- `extractEnergyAnalysis()` builds smoothed relative-RMS envelopes for the `重音` view, and derives compact voiced/silent segments plus pause counts for the `节奏` view. Values are normalized within each speaker's own clip, so the chart compares emphasis shape rather than microphone loudness.
- `extractMfccFrames()` calculates 12 locally normalized MFCC coefficients from 20 mel filters. `compareAcousticFeatures()` aligns the reference and learner frames with constrained dynamic time warping, then renders an 80-bin cool-to-warm difference strip. This makes broad sound-shape differences visible while tolerating unequal speaking speed; it does not identify phoneme errors or measure pronunciation accuracy.
- `renderPitchCompareChart()` switches among the four cached result views. The pitch plot draws both normalized contours as an inline SVG (`范读` vs `我的录音`) against `+12 / 0 / -12` semitone guides; interpolated gaps stay dashed in their source curve's color instead of appearing as a misleading third series. Each view retains two compact time rows showing the recordings' own start, midpoint, and end times. The status line always states that these are local visual comparisons, not a pronunciation score.
- The comparison result and captured TTS clips are session-only memory. Making a new learner recording resets the displayed result; reloading the page clears the comparison and reference cache. Neither recording nor derived feature data enters browser persistence, backup export, or cloud synchronization.
- The local acoustic view can reveal where two recordings differ broadly, but it cannot say which phoneme or word is wrong. Phoneme alignment, accent-aware correctness judgments, and defensible pronunciation scores require a dedicated speech-assessment model or external service and are not implemented.

## Random-Mode Navigation History

In 随机 (random) practice mode, `pickSentenceIndex()` keeps two per-session stacks, capped at 10 entries each, so `state.sentences`'s size does not bound how far the learner can step back:

- `state.randomHistory` (back stack): the sentence left behind on every forward move (a new random pick, or a redo) is pushed here.
- `state.randomForwardStack` (forward stack): the sentence left behind by "上一句"/◀ is pushed here.
- "上一句"/◀ pops `randomHistory`; if it is empty, the action is a no-op (stays on the current sentence) rather than picking randomly.
- "下一句"/▶ first drains `randomForwardStack` (redo) if it has entries, so stepping back and then forward returns to the sentence that was left, instead of immediately re-randomizing it away. Only once the forward stack is empty does a fresh random pick happen.
- Both stacks are reset in `setCurrentLibrary()`, i.e. whenever the active material changes, since old indices would no longer point at the right sentences.
- Ordered and mistakes modes are unaffected; they use direct index arithmetic, not these stacks.

## Grammar Node Rendering

`renderGrammarNodes()` builds each node's card from its own `role`/`type`/`text`, independent of its position in the tree.

- A node is treated as pure punctuation (label suppressed entirely) when its `text` matches `/^[\p{P}\s]+$/u` — this checks the source text itself, not the AI-returned label wording, so it doesn't depend on the model saying "标点" vs "标点符号" vs anything else.
- `.grammar-node-content` uses `flex-wrap: nowrap` with `align-items: baseline`; the role/type badge (`.grammar-role`) is `flex-shrink: 0; white-space: nowrap` so it never shrinks or wraps internally, while the sentence text (`.grammar-text`) is `flex: 1 1 auto; min-width: 0` so it wraps within its own box instead of the whole text item dropping to a new line. Baseline (not box-center) alignment is used because the Chinese-font label and English-font text don't share an optical center at matched line-heights.
- Top-level node cards have no fixed pixel width cap (`max-width: 100%` only, bounded by the row's own flex-wrap), so a long clause uses whatever space is actually left in its row instead of wrapping early against an arbitrary limit.
- A node is flagged `is-clause` when its `type` contains `从句`. Nested clause nodes always render a role-colored top border regardless of expand/collapse state; other nested nodes only get a colored border when collapsed with children (`has-children:not(.is-expanded)`).
- Expanding a collapsed node (`data-grammar-toggle` click) first collects all of that node's descendant ids (`collectGrammarDescendantIds()`) and removes them from `state.grammarExpandedNodeIds` before adding the node's own id back — so a node always opens to exactly one level of children, never restoring a deeper expansion state left over from earlier in the session.

## Grammar Analysis Cache

Grammar analysis is manually triggered and never runs automatically during ordinary practice.

- Results are cached and reused instead of requesting AI again for the same stored result.
- Cached results retain schema and convention provenance.
- A convention change does not silently relabel, delete, or regenerate older analysis.
- Reanalysis is always an explicit user action.

## Control Tooltips

Every interactive control explains itself through a hover tooltip. Controls declare the text in the ordinary `title` attribute (static markup or `element.title = ...` for dynamic text). On the first `pointerover`, the shared handler in `app.js` moves `title` into `data-tooltip` so the browser's native tooltip never appears, then shows `#controlTooltip` after 300 ms of hovering. The tooltip sits just below the pointer (above it near the viewport bottom), supports `\n` / `&#10;` line breaks, and hides on pointer leave, pointer down, key press, scroll, or window blur. Touch input does not trigger it. When code later rewrites `title`, the next hover picks up the new text. Tooltip text should say what the control does and mention non-obvious interactions such as shortcuts or right-click menus. Exception: the `背单词` launchers (`识义` / `听写` / `默写`) carry no `title`, because hovering them already shows the full memory-mechanism explanation, including the right-click actions, in the word detail pane.

## Build And Deployment

Source code is the maintained project; `dist/` is disposable output.

- `npm run build` generates `dist/` from the current source.
- Vercel builds from the source repository and publishes the generated output.
- Public Supabase configuration is injected from Vercel environment variables during production builds.
- Local testing uses `tools/start-langlsrw-server.bat` and `http://localhost:8848/`.
- A successful local build does not deploy anything.
- Pushing or deploying requires the owner's explicit action or request.
