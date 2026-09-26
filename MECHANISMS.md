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

## Build And Deployment

Source code is the maintained project; `dist/` is disposable output.

- `npm run build` generates `dist/` from the current source.
- Vercel builds from the source repository and publishes the generated output.
- Public Supabase configuration is injected from Vercel environment variables during production builds.
- Local testing uses `tools/start-langlsrw-server.bat` and `http://localhost:8848/`.
- A successful local build does not deploy anything.
- Pushing or deploying requires the owner's explicit action or request.
