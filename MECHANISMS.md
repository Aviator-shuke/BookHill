# langLSRW Mechanisms

Last updated: 2026-09-25

This document records how implemented product behavior works. It describes the current code, not planned behavior. Update it whenever a trigger, storage rule, identity boundary, synchronization scope, or deployment mechanism changes.

## User Identity

langLSRW has two independent identity modes:

- A Google account is identified by its immutable Supabase user ID.
- A local user is identified by an explicitly created local username.
- A Google account is never converted into an email-named local user.
- Signing out clears the active cloud identity and returns to user selection.
- Local-user data and cloud-account data use separate browser-storage namespaces.

## Local Persistence

The application is local-first. Settings, practice records, learned count, imported material, cached analysis, and user collections are stored in browser storage unless a mechanism below says otherwise.

- Local users can export and import their data as JSON.
- Google-account browser data acts as the working local copy for that account.
- Clearing browser site data removes local copies and locally installed dictionary data.
- The replaceable ECDICT database never stores user-created data.

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
- `savedAt`

The source sentence and translation are saved as complete text, not as a sentence number or library reference. This preserves the example even if the active library, sentence order, or source material later changes. Saving several words from one sentence intentionally duplicates that small text snapshot.

Storage namespaces:

- Google account: `langLSRWUserWords:cloud:<Supabase user ID>`
- Local user: `langLSRWUserWords:<local username>`

The collection supports category filtering from the saved ECDICT metadata and sorting by saved time, alphabet, BNC rank, contemporary-corpus rank, or Collins stars. It is not currently synchronized to Supabase.

Relevant implementation: `userWordsStorageKey()`, `toggleDictionaryFavorite()`, and `renderUserPhrases()` in `src/app.js`.

## User Sentence Collection

The sentence collection has separate per-identity storage namespaces and UI structure, but adding sentences is not implemented yet.

- Google account: `langLSRWUserSentences:cloud:<Supabase user ID>`
- Local user: `langLSRWUserSentences:<local username>`
- Sentence collections are not currently synchronized to Supabase.

Relevant implementation: `userSentencesStorageKey()` and `loadUserSentences()` in `src/app.js`.

## Local Dictionary

ECDICT is distributed as a generated compressed SQLite package.

- The browser downloads the package only when the user installs the dictionary.
- SQLite WASM runs in a Worker and stores the database in browser OPFS.
- Queries are local and do not call AI or a remote dictionary service.
- The database is read-only and can be removed or replaced independently of user data.
- `DictionaryService` is the stable interface so a future server/MySQL adapter can replace the local adapter without rewriting the UI.

Relevant implementation: `src/dictionary/dictionary-service.js`, `src/dictionary/dictionary-worker.js`, and `tools/build-ecdict.py`.

## Sentence Libraries

The built-in common library is a versioned static package with stable source IDs and compact TSV content.

- Search and pagination run locally after loading.
- Preview renders 50 rows per page.
- Selecting the package exposes all 30,150 entries to listening and speaking practice.
- Imported custom material remains user data and is independent of the built-in package.

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
