# langLSRW Project Status

Last updated: 2026-09-26

Detailed behavior, storage, synchronization, and build rules are maintained in [`MECHANISMS.md`](MECHANISMS.md).

## Current Stage

langLSRW is currently a personal language-learning prototype in a local-first development stage. The listening and speaking workflow is usable for daily local testing. Reading, writing, broader review pools, and article generation are still future work. The production deployment is connected to Supabase, and Google login has been verified on the deployed site. The formal-release direction is cloud-first for signed-in accounts, with the cloud as authoritative cross-device storage and browser data serving as an offline cache; explicit local-user mode will remain local-only.

Local testing remains the default development workflow. Run `tools/start-langlsrw-server.bat`, then open `http://localhost:8848/`. The source repository is connected to Vercel and the first production deployment completed successfully on 2026-09-24. Vercel hosts the frontend, while Supabase now provides Google authentication and the existing initial-sync backend. Cross-device synchronization still requires explicit end-to-end verification. Future deployments and external service changes still require the owner's explicit request.

## Implemented

### Shared application

- Four-part navigation: `听说 -> 读 -> 写`; reading and writing currently remain placeholders.
- Local users, browser storage, user switching, JSON import/export, and settings reset.
- Four themes, cycled in this order: eye-care (default), light, gray, black.
- Separate English-content and Chinese UI/translation font settings.
- Configurable colors for all grammar roles, with a color picker, editable HEX value, common color palette, local persistence, and reset defaults.
- The listening toolbar keeps the read-aloud action beside the accent selector and provides a compact `0.5x-2.0x` speech-rate stepper in `0.1x` increments, shared by sentence, automatic, and word playback.
- Installable local ECDICT foundation using SQLite WASM in a dedicated Worker and browser OPFS persistence. The page accesses it through a storage-independent dictionary service rather than issuing SQL from UI code.
- Dictionary, collection, and inline lookup details pronounce the current word from either the phonetic transcription or its adjacent sound control, using the active accent, voice, and speech-rate settings.
- Inline right-click dictionary details size to their content without an internal scrollbar and are positioned above or below the source text according to available viewport space.
- Dictionary inflections are grouped compactly by noun, tense, participle, comparison, base-form, and fallback categories; empty categories are omitted without dropping stored forms.
- Inflected forms in dictionary details are navigable: selecting a form loads that form's dictionary detail in the active detail context, or opens the full dictionary detail from an inline lookup.
- Supabase Google authentication and first-stage cross-device sync are implemented. The Supabase SDK is pinned locally, localhost reads the project's bundled public configuration, production public configuration is supplied by Vercel environment variables, and deployed Google sign-in has been verified. The obsolete user-editable Supabase configuration UI and browser-storage override have been removed. During the current debugging stage, login performs one cloud read but all automatic writes are disabled; the signed-in account menu provides an explicit manual-sync action.
- `npm run build` creates a disposable `dist/` containing only browser runtime files and injects public Supabase configuration from Vercel build environment variables.
- Top controls for theme, library, settings, and users. Shortcut configuration lives inside Settings, and learning shortcuts are suspended while Settings, the user menu, or the library dialog is open.
- The top-level `收藏` view's `单词` tab uses the same resizable, adaptive-page three-column interaction as `词库`: word categories on the left, the selected collection in the middle, and item details on the right. The word list displays word forms with directly editable collection levels, supports compact English-word search, pagination, and arrow-key navigation without a scrollbar, and derives page size from available height. Its right-side rating shows editable yellow collection stars normally, but switches to read-only purple Collins stars when Collins sorting is active. Hovering or selecting a word renders its full dictionary information in the right detail pane. Category filters use the fixed sequence `Oxford 3000, 中考, 高考, CET4, CET6, 考研, IELTS, TOEFL, GRE` without a Collins category; sorting still supports Collins stars. Collection-level and Collins-level sorting use descending stars with alphabetical order inside each level, matching the complete dictionary's Collins ordering. Detail badges use default text color with red, orange, yellow, yellow-green, green, teal-green, cyan, cyan-blue, and blue outlines respectively across that sequence. The Collins label also uses default text color, with a purple outline and purple stars. The `句子` tab drops the right-hand detail pane (two columns instead of three) — see the sentence-collection bullet below.
- The top-level `词库` view browses the complete installed ECDICT through database-backed pagination. Its resizable dialog derives page size from the available list height, keeps word rows fixed and compact, and therefore needs no list scrollbar. Every word row with a Collins level shows only its actual read-only purple stars in a vertically centered, left-aligned rating column on the right; zero-rated words show no stars. Category filtering defaults to Oxford 3000, follows the fixed learning-level sequence, and places `全部` last. Its left column separates ordinary words, hyphen-prefixed suffixes, space-containing phrases, and special entries whose first character is not an English letter; all use the compact list/detail presentation, dictionary categories, and alphabet, BNC, contemporary-corpus, or Collins sorting. It deliberately has no collection-time sort.
- Dictionary lookup and detail views use a five-star collection level. Clicking a star sets levels 1-5; clicking the current level again removes the collection. Right-click lookup stays near the selected word but positions the dictionary popover immediately below the English source line when space permits, or above that line otherwise, so it never covers the original sentence without being pushed below the whole practice panel. Legacy collected words without a level are read as one star, and the collection can be sorted by level. Favorites are separated by cloud-account ID or local-user name and stored locally with the dictionary entry plus its source sentence and translation. They are not yet included in cloud synchronization.
- The listening page's English source line ends with a five-star sentence collection control using the same interaction as word stars; the original sentence wraps onto multiple lines instead of truncating, and the star rating stays fixed at the far right. Sentence favorites are stored per identity under `langLSRWUserSentences:*` with the sentence, translation, source ID, library ID and library label, and are deduplicated by case- and whitespace-insensitive text. They are the sentence part of the review pool, not another sentence library, and are not yet included in backup export or cloud sync.
- The `收藏` dialog's `句子` tab shows each favorite as a single compact row (original text plus stars); the translation appears only on hover/focus, wrapping instead of truncating. A `▶` button to the left of the stars loads that favorite's whole `用户收藏` set into practice, jumped directly to that sentence. The list is paginated by actually measuring rendered row heights per page (sentence rows vary in height when they wrap), not by a fixed row-height estimate the way the uniform-height word list is.
- The toolbar above the listening practice area has a `句库` quick-switch dropdown (常用句库 / 用户收藏) as its first control, so switching between those two no longer requires opening the library dialog; it also shows a temporary, non-selectable entry for whatever other custom source is active. The sentence counter next to it is an editable jump-to-sentence input rather than plain text.
- The learner's last position — active library plus sentence index — is restored on page load, including when `用户收藏` was the last-used library (rebuilt from current favorites) and not only the built-in common library.
- Random practice mode keeps a 10-entry back/forward history so `上一句`/`◀` steps back through recently shown random sentences instead of re-randomizing, and `下一句`/`▶` redoes forward through that history before picking a fresh random sentence again.
- The user menu is identity-specific: a Google session shows only account status and sign-out, while a local session shows only local-user switching, JSON import/export, and deletion. Local backup controls no longer appear in global Settings or in cloud-account mode. Global reset remains under Settings.
- The streamlined login screen centers the `langLSRW` name above `登录账号·云端同步` and `本机用户·离线保存`, presented as two distinct choices separated by a prominent `or`. Opening the screen moves focus to the neutral login container so browser-restored input focus cannot preselect either choice. Once the user hovers or focuses a choice, it gains a restrained lift and strongly softens the inactive choice; pointer hover takes precedence over retained input focus. Google login, local practice, and user import use the same outlined hover, keyboard-focus, and pressed feedback. Narrow screens stack the choices vertically.
- Independent sentence-library dialog with library categories, search, paginated preview, and a direct practice action. Each row in the preview also has its own `▶` load button (same interaction as the one in `收藏`'s `句子` tab) that loads the whole common library and jumps straight to that row's sentence, instead of always starting from the first sentence.
- Local static server launcher that resolves the project directory from the BAT file location and only stops a Python `http.server` occupying port 8848.

### Sentence libraries

- The first built-in package is `常用英语句库`, containing 30,150 English-Chinese pairs with stable source IDs.
- The built-in common library is loaded as the default practice source at startup; fallback examples remain available only if that package cannot be read.
- The package uses a small versioned `manifest.json` plus compact TSV content; it does not spend AI tokens classifying every sentence.
- English, Chinese, and ID search run locally after the package is loaded.
- Preview renders 50 records per page instead of creating 30,150 DOM rows.
- Selecting the package makes all 30,150 records available to the existing listening and speaking workflow.
- Scenario, grammar, level, and phrase library categories are reserved in the UI but remain disabled until content is added.

### Local dictionary

- ECDICT's basic `ecdict.csv` is the fixed source for the initial dictionary build; the larger `stardict.7z` data is not used by the runtime build.
- The untouched ECDICT upstream source is kept outside the web repository at `../third-party/ECDICT-master/`; `ECDICT_SOURCE_DIR` can override that maintenance-time path.
- `tools/build-ecdict.py` generates the ECDICT-compatible SQLite table and indexes, validates the database, creates a deterministic gzip package, and writes a versioned manifest with entry count, sizes, and hashes.
- The current basic build contains 770,611 entries. Its SQLite database is about 170.4 MB and its gzip download package is about 67.8 MB.
- `DictionaryService` exposes stable `status`, `install`, `remove`, `query`, `match`, and `count` operations. A Worker-backed SQLite adapter currently implements those operations; a future server API/MySQL adapter can implement the same contract.
- The Settings panel displays installation state and sizes, installs the compressed package into browser OPFS, supports removal, and provides an explicit test query.
- Words in the listening source can be queried from the installed local dictionary by right-clicking; a configurable keyboard shortcut queries the current word. Results expose available pronunciation, bilingual definitions, part of speech, Collins rating, Oxford 3000 membership, study tags, corpus ranks, and parsed inflections without calling AI. When an ECDICT entry for a single-`l` American `-ling`, `-led`, or `-ler` form has no inflection data, lookup checks the corresponding double-`l` entry and reuses only its explicit `0:` lemma, which covers gaps such as `traveling -> travelling -> travel` without guessing an unverified root.
- The base dictionary is opened read-only. User vocabulary, notes, overrides, history, and review state must remain outside the replaceable ECDICT database.
- SQLite WASM is pinned through npm and copied into static vendor assets by `tools/vendor-sqlite-wasm.mjs`; website users do not install SQLite, Python, or Node.

### Listening and dictation

- Import `.txt` and `.lrc`, paste sentence lists, or use the built-in common sentence library.
- English source above Chinese translation, with independent source and translation visibility.
- Ordered, random, and mistake practice modes, with random practice as the default.
- Source-file import and pasted sentence input are grouped under Library > Custom Library; current-sentence translations are edited directly in the practice translation area, and AI provider settings are grouped under the global Settings menu.
- The practice toolbar always shows the active sentence-library type (`常用句库`, `自定义句库`, or a restored backup label), and backup files retain that provenance.
- Previous/next sentence navigation, British English as the default accent, voice selection, normal and slower replay, word replay, and automatic reading.
- Per-user learned count increments whenever the learner advances to the next sentence, including the next button, listening or speaking shortcuts, and completion-driven advancement. Repeated or randomly revisited sentences count again; previous-sentence navigation and passive sentence changes do not count. The value persists locally and participates in backup/restore and Supabase sync.
- Dictation input with accuracy, speed, pause, fluency, and error statistics plus recent records.
- The typing box's height tracks the rendered source-sentence box's height exactly (line count included), recalculated on every sentence change and on window resize, so a longer or wrapped source sentence gives a taller typing area instead of a fixed size.
- Configurable keyboard shortcuts.
- Google cloud accounts and local-only users are separate identity types. Cloud caches are keyed by the immutable Supabase user ID and are never registered as email-named local users. Signing out clears the active identity and returns to user selection; choosing a local user is always explicit. Initial cloud persistence covers settings, the signed-in user's practice history, learned count, and a current custom sentence library; the built-in common library and AI API key are excluded.
- Cloud writes are manual during the debugging stage to control traffic. Login reads the cloud record once; learning actions, setting changes, first login, sign-out, and switching to a local user do not write automatically. `手动同步` replaces the account's single Supabase row with the current settings, up to 80 recent practice records, learned count, and the complete active custom library. The built-in common library, ECDICT database, recordings, local-user data, and AI API key are excluded. The retained 1.2-second debounced auto-sync path is guarded by `AUTO_CLOUD_SYNC_ENABLED = false` for later reactivation.

### Speaking

- Hold-to-speak workflow with speech recognition and recording.
- Live bar-style volume indication and active-listening border feedback.
- Similarity, omitted-word, wrong-word, extra-word, and volume feedback.
- Recording playback and model-sentence comparison controls.

### AI grammar analysis

- Manual AI trigger; sentence switching and ordinary practice never trigger paid requests.
- Personal local API settings stored in browser storage for the current private-use stage.
- Traditional English teaching grammar is the only enabled runtime framework.
- Hierarchical grammar JSON rendering with main, first-level, and all-node views.
- Role-specific colors, expandable nodes, notes, child indicators, and explanations. A node's role/type label is baseline-aligned with its text (not box-centered, since the label's Chinese font and the text's English font have different optical centers at the same line-height) and never wraps internally; a pure-punctuation node (matched by a Unicode-punctuation regex on its text, not by its label wording) shows no label at all. A node's own colored border is never capped by an unrelated fixed pixel width, and any clause-type node (`type` containing `从句`) always shows its role-colored top border regardless of expand state. Expanding a collapsed node always reveals exactly one level of children; any deeper descendants left expanded from an earlier interaction are collapsed first, so re-expanding a node never restores stale multi-level state.
- Cached analysis reuse for the same sentence; reanalysis is an explicit context-menu action.
- View and copy the exact AI prompt and raw/formatted AI response.
- The compact toolbar exposes only `Ai语法分析`; its context menu contains the active grammar framework, prompt/response viewing, and explicit reanalysis.
- Prompt source is maintained in the traditional grammar Skill and generated into `src/generated/grammar-prompt.js`.
- SIEG2 remains a separate Skill and appears disabled in the UI; it is not included in the active runtime prompt.

## Current Architecture

```text
langLSRW/
  index.html
  src/
    app.js
    library.js
    dictionary/
      dictionary-service.js
      dictionary-worker.js
    vendor/sqlite-wasm/
    styles.css
    generated/grammar-prompt.js
  assets/materials/default-bilingual.lrc
  assets/libraries/common-english-30150/
    manifest.json
    sentences.tsv
  assets/dictionaries/runtime/ecdict/  # generated manifest, package, and license
  tools/build-web.mjs
  tools/build-ecdict.py
  tools/test-ecdict-build.py
  tools/vendor-sqlite-wasm.mjs
  tools/start-langlsrw-server.bat
  package.json
  vercel.json
  .agents/skills/
    langlsrw-traditional-grammar-analysis/
    langlsrw-sieg2-grammar-analysis/
```

The local-only upstream dictionary source used by the build tool lives at `../third-party/ECDICT-master/`, outside the `langLSRW` repository and its deployment boundary.

The HTML, CSS, bundled material, generated prompt, and launcher are separated. Most application behavior is still concentrated in `src/app.js`; splitting listening, speaking, storage, settings, and grammar rendering into modules remains architectural work, not a completed migration.

## Known Boundaries

- Reading and writing pages are not implemented yet.
- AI article generation, writing review, and review-material generation are not implemented yet.
- The `句库` picker (the dialog opened from the `句库` button) offers only the built-in common library and custom import/paste; `用户收藏` was removed from that dialog specifically. It remains reachable as `常用句库`'s sibling option in the toolbar's quick-switch dropdown, and via the `▶` button on each row in `收藏`'s `句子` tab. The other placeholder categories (情景/语法/等级/短语句库) still have no data.
- Supabase authentication, schema, and first-stage sync code are connected to the production project. Google sign-in works; cross-device state synchronization has not yet completed a two-browser or two-device verification pass. Local browser storage remains the primary offline data layer.
- Manual synchronization still uploads the complete cloud payload rather than field-level changes; large custom libraries can therefore consume substantial traffic per click. Incremental synchronization remains future work.
- The planned cloud-first account model is not implemented yet. Before formal release it still needs complete data coverage, an offline queue/cache policy, deterministic conflict handling, schema migration, retry and recovery behavior, and explicit user-visible sync status. The current whole-row manual-sync implementation must not be treated as that final architecture.
- The API key is stored in browser local storage and is acceptable only for private local use.
- Before public AI access, requests must move behind a backend proxy with quotas and cost controls.
- Speech recognition and recording depend on browser support and microphone permission.
- The native system color-picker dialog cannot be customized by the webpage; HEX editing is provided in the settings panel.
- The uncompressed generated SQLite file is intentionally discarded after packaging. The versioned gzip package is the runtime asset; raw CSV sources and development tools must not enter the website deployment.
- Browser dictionary installation requires OPFS, Web Workers, WebAssembly, streaming fetch, and gzip `DecompressionStream`. Current Chromium verification passes; Firefox and Safari remain explicit compatibility-test targets.
- Supabase provisioning, Google OAuth provider configuration, `supabase/schema.sql`, production redirect URLs, and Vercel public environment variables are configured. Any additional deployment domain must also be added to Supabase Auth redirect URLs before Google login can return to it.
- `dist/` is generated output and is ignored by Git. Vercel provides `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` together during production builds; neither the Google OAuth client secret nor any Supabase secret/service-role key belongs in frontend or Vercel public build configuration.
- Clearing browser site data removes the installed local dictionary. It can be reinstalled without affecting the source package.

## Verification

Verified on 2026-09-23:

- `node --check src/app.js` passes.
- Traditional grammar Skill/runtime prompt synchronization test passes: 1/1.
- SIEG2 Skill validation and cache behavior tests pass: 13/13.
- Common grammar colors render correctly in black and gray themes.
- HEX input and common-palette selection update only the selected grammar role.
- Opening a top popover disables learning shortcuts; closing it restores them.
- The common library manifest count matches the 30,150 valid TSV records.
- Library search, 50-row pagination, practice selection, and shortcut suspension were verified in the browser.

Verified on 2026-09-24:

- The basic `ecdict.csv` build produces 770,611 entries and passes SQLite `integrity_check` plus fixed exact/fuzzy query tests.
- The generated SQLite database is about 170.4 MB; the deterministic gzip package is about 67.8 MB.
- SQLite WASM initializes through the existing Python static server, installs the compressed database into OPFS, reports the stored metadata, and queries `dictionary` successfully in the browser.
- JavaScript syntax checks pass for the app, dictionary service, and dictionary Worker.
- The Vercel build produces 23 runtime files (about 71.75 MiB), excludes development and source-data directories, and correctly handles both empty local cloud configuration and build-time Supabase configuration.

Verified on 2026-09-25:

- The production Vercel deployment is configured with the Supabase project URL and publishable key.
- Supabase Google OAuth returns successfully to `https://book-hill.vercel.app/`, and production Google login works.
- The local site at `http://localhost:8848/` receives the same Supabase public client configuration; its redirect URL is registered in Supabase Auth for local Google-login testing.
- Cross-device state synchronization remains to be tested independently of authentication.
- The learned-count implementation passes JavaScript syntax validation, clean-diff validation, and the production `npm run build` flow.

Verified on 2026-09-26:

- Sentence favoriting, the favorites `句子` tab (single-line rows, hover-reveal translation, height-measured pagination, the load-into-practice button), the `用户收藏` library option, and the toolbar library quick-switch dropdown were exercised end-to-end in-browser with seeded favorites data.
- The CSS Grid row-overlap bug affecting wrapped favorite rows once the list needed to scroll was reproduced with 40+ seeded entries and confirmed fixed after switching `.user-words-list`/`.user-sentences-list` to a flex column layout.
- Last-position restoration was verified across a full reload for both the common library and `用户收藏`, including the fix that added `saveLastPosition()` to `switchSpeakingSentence()` (the `◀`/`▶` navigation path), which previously never saved a position.
- Removing `用户收藏` from the `句库` dialog's sidebar (while keeping it in the toolbar quick-switch dropdown and the `收藏` `▶` button) was confirmed by grepping `index.html`/`src/app.js`/`src/styles.css` for leftover `favoritesLibrary*` identifiers after the change.
- The per-row `▶` load button added to the `句库` dialog's common-library preview was exercised in-browser against the real 30,150-entry package: clicking a non-first row's button closed the dialog, switched to the listening page, and displayed exactly that row's sentence.
- `node --check src/app.js` passes.

## Next Priorities

1. Continue local daily-use testing and fix listening, speaking, and grammar-analysis defects.
2. Continue moving feature boundaries out of the large `src/app.js`; sentence-library loading already lives in `src/library.js`.
3. Build the reading page around full articles, sentence understanding, vocabulary, phrases, and notes.
4. Build the writing page around rewriting, summaries, retelling, and AI-assisted review.
5. Add review pools that connect listening mistakes, speaking problems, reading notes, and writing corrections.
6. Add AI-generated learning materials based on level and interests, using manual triggers, caching, and result reuse.
7. Before formal release, implement the cloud-first account data model: authoritative cloud records, complete synchronization coverage, offline caching and queued writes, conflict handling, migrations, recovery, and visible sync state. Preserve local-only users as a separate offline mode.
8. Add a backend proxy, authentication, quotas, and cloud storage controls before broader public use.
