const fallbackSentences = [
      "Hello.",
      "Good morning.",
      "Nice to meet you.",
      "How are you?",
      "I am learning English.",
      "Please speak slowly.",
      "Could you say that again?",
      "I would like a cup of coffee.",
      "Where is the nearest subway station?",
      "I am here on vacation."
    ];

    const defaultShortcuts = {
      speakSentence: "`",
      toggleSource: "1",
      toggleTranslation: "2",
      nextSentence: "Right",
      previousSentence: "Left",
      nextSentenceInOrder: "Down",
      previousSentenceInOrder: "Up",
      speakCurrentWord: "Alt+`",
      peekCurrentWord: "Alt+1",
      lookupCurrentWord: "Alt+D",
      stopSpeech: "Alt+X",
      resetSentence: "Alt+R",
      finishSentence: "Ctrl+Enter",
      holdSpeaking: "Space"
    };

    const speakingShortcuts = {
      previousSentence: "Alt+B",
      nextSentence: "Alt+N",
      speakModel: "Alt+P",
      togglePractice: "Alt+R"
    };

    const themes = [
      { id: "eye", label: "护眼" },
      { id: "light", label: "白天" },
      { id: "gray", label: "深灰" },
      { id: "black", label: "黑夜" }
    ];

    const englishFontPresets = {
      default: '"Segoe UI", Arial, sans-serif',
      georgia: 'Georgia, "Times New Roman", serif',
      times: '"Times New Roman", Times, serif',
      segoe: '"Segoe UI", Arial, sans-serif',
      arial: 'Arial, sans-serif'
    };

    const chineseFontPresets = {
      yahei: '"Microsoft YaHei", "PingFang SC", sans-serif',
      simsun: 'SimSun, "宋体", serif',
      simhei: 'SimHei, "黑体", sans-serif',
      kaiti: 'KaiTi, "楷体", serif'
    };

    function fontDefaults() {
      return { english: "default", chinese: "yahei" };
    }

    function grammarColorDefaults() {
      return {
        subject: "#ef4444",
        predicate: "#f97316",
        object: "#eab308",
        predicative: "#b58ba0",
        complement: "#22c55e",
        attribute: "#14b8a6",
        adverbial: "#06b6d4",
        appositive: "#3b82f6",
        head: "#a855f7",
        other: "#94a3b8"
      };
    }

    function normalizeGrammarColors(colors) {
      const defaults = grammarColorDefaults();
      return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
        const value = String(colors?.[key] || "").trim();
        return [key, /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback];
      }));
    }

    const shortcutActions = [
      { id: "speakSentence", label: "朗读当前词/句" },
      { id: "toggleSource", label: "显示/隐藏原文" },
      { id: "toggleTranslation", label: "显示/隐藏翻译" },
      { id: "nextSentence", label: "下一句（随机模式下为随机下一句）" },
      { id: "previousSentence", label: "上一句（随机模式下为退回上一个随机句）" },
      { id: "nextSentenceInOrder", label: "按顺序下一句（任何模式）" },
      { id: "previousSentenceInOrder", label: "按顺序上一句（任何模式）" },
      { id: "speakCurrentWord", label: "长文默写时手动发音下一个词" },
      { id: "peekCurrentWord", label: "按住显示当前词" },
      { id: "lookupCurrentWord", label: "查询当前词" },
      { id: "stopSpeech", label: "停止朗读" },
      { id: "resetSentence", label: "重写当前句" },
      { id: "finishSentence", label: "完成本句" },
      { id: "holdSpeaking", label: "按住说话" }
    ];

    const fixedMouseActions = [
      { label: "朗读所点单词", control: "鼠标中键" },
      { label: "临时查看隐藏单词", control: "按住左键" },
      { label: "查询所点单词", control: "鼠标右键" }
    ];

    // The page is not remembered: every visit starts on 听.
    function loadActiveLearningPage() {
      return "listenPage";
    }

    const LEARNING_LANGUAGES = {
      en: {
        id: "en",
        label: "英语",
        shortLabel: "英",
        dictionaryId: "ecdict",
        dictionaryName: "ECDICT",
        collectionEnabled: true,
        wordStudyEnabled: true,
        // 词库 category decks (Oxford 3000, CET4 ...) come from ECDICT tags.
        dictionaryStudyDeckEnabled: true,
        // Extra 识义 distractors when the favorites are too few.
        reviewDistractorCategory: "oxford",
        // Word review wording: the word's language and the language of its dictionary meanings.
        wordLabel: "英文",
        meaningLabel: "中文",
        commonLibraryManifestUrl: "assets/libraries/common-english-30150/manifest.json",
        commonLibraryContent: "英文原句 + 中文翻译",
        accents: [["en-GB", "英音"], ["en-US", "美音"]],
        sentenceFavoritesEnabled: true,
        grammarAnalysisEnabled: true
      },
      es: {
        id: "es",
        label: "西班牙语",
        shortLabel: "西",
        dictionaryId: "spanish-wiktionary",
        dictionaryName: "西语 Wiktionary",
        // Word and sentence favorites and 背单词 records are stored per learning language.
        collectionEnabled: true,
        wordStudyEnabled: true,
        // 词库 categories are subtitle-frequency tiers (常用 500 ... 10000), see src/languages/es/dictionary.js.
        dictionaryStudyDeckEnabled: true,
        reviewDistractorCategory: "top3000",
        wordLabel: "西语",
        meaningLabel: "英文",
        commonLibraryManifestUrl: "assets/libraries/common-spanish-134910/manifest.json",
        commonLibraryContent: "西语原句 + 英文翻译",
        // Accent regions for TTS voices and speech recognition; materials and records are not region-specific yet.
        accents: [["es-ES", "西班牙"], ["es-MX", "墨西哥"], ["es-US", "美国"], ["es-AR", "阿根廷"], ["es-CO", "哥伦比亚"], ["es-CL", "智利"]],
        sentenceFavoritesEnabled: true,
        // AI grammar analysis is not language-scoped yet; keep it off for Spanish.
        grammarAnalysisEnabled: false
      }
    };

    const state = {
      sentences: normalizeSentenceList(fallbackSentences),
      index: 0,
      events: [],
      startedAt: 0,
      finished: false,
      currentUser: localStorage.getItem("langLSRWCurrentUser") || "",
      cloudUser: null,
      cloudSyncing: false,
      cloudLastSyncedAt: "",
      cloudSwitchingToLocal: false,
      dictionaryLookupEntry: null,
      dictionaryLibraryPage: 1,
      dictionaryLibraryPageCount: 1,
      dictionaryLibraryType: "words",
      dictionaryWordCategoryByLanguage: {},
      dictionaryLibrarySelectFirstAfterRender: false,
      dictionaryLibraryPageSize: 100,
      userWordsPage: 1,
      userWordsPageCount: 1,
      userWordsPageSize: 100,
      userWordsSelectFirstAfterRender: false,
      userSentencesPage: 1,
      userSentencesPageCount: 1,
      userSentencesPageRanges: [],
      voices: [],
      lastSpokenWordKey: "",
      replayRate: 1,
      // Settings belong to the identity (applyIdentitySettings()); these defaults show until its data opens.
      shortcuts: { ...defaultShortcuts },
      speechSettings: {},
      aiSettings: {},
      fontSettings: fontDefaults(),
      grammarColors: grammarColorDefaults(),
      // The theme starts from the browser's cache of the last shown theme (see applyTheme()).
      theme: document.body.dataset.theme || "eye",
      activePage: loadActiveLearningPage(),
      // The learning language is a per-identity setting, applied once the identity's data opens; English until then.
      learningLanguageId: "en",
      currentLibraryLabel: "示例句库",
      grammarLoading: false,
      grammarVisible: false,
      translationEditing: false,
      translationDraft: "",
      grammarExpansionMode: "main",
      grammarExpandedNodeIds: new Set(),
      library: {
        manifest: null,
        items: [],
        fingerprint: "",
        filteredItems: [],
        query: "",
        page: 0,
        pageSize: 50,
        loading: false
      },
      wordReview: null,
      dictionaryStudyLoading: false,
      dictionaryStudyLoadingMode: "",
      speaking: {
        isRecognizing: false,
        isRecording: false,
        isStarting: false,
        holdActive: false,
        stopAfterStart: false,
        stopTimer: null,
        permissionLock: false,
        micReady: false,
        recognition: null,
        mediaRecorder: null,
        mediaStream: null,
        audioContext: null,
        volumeAnalyser: null,
        volumeFrame: 0,
        volumeLevel: 0,
        volumeTotal: 0,
        volumeSamples: 0,
        audioChunks: [],
        spokenText: "",
        recordedAudioUrl: "",
        recordedAudioBlob: null,
        metrics: null,
        ttsAudioCache: new Map(),
        ttsShareStream: null,
        pitchCompareBusy: false,
        loopCompareActive: false,
        loopCompareRunId: 0,
        cancelLoopCompareAudio: null,
        pitchCompareView: "pitch",
        pitchCompareResult: null
      }
    };

    const $ = (id) => document.getElementById(id);
    const targetEl = $("target");
    const typingBox = $("typingBox");
    const typedPreviewEl = $("typedPreview");
    const counterEl = $("counter");
    const counterIndexInput = $("counterIndexInput");
    const counterTotalEl = $("counterTotal");
    const counterMeasureCanvas = document.createElement("canvas");
    const counterMeasureCtx = counterMeasureCanvas.getContext("2d");

    function fitCounterIndexInputWidth() {
      counterMeasureCtx.font = getComputedStyle(counterIndexInput).font;
      const text = counterIndexInput.value || "0";
      const width = counterMeasureCtx.measureText(text).width;
      counterIndexInput.style.width = `${Math.max(18, Math.ceil(width) + 11)}px`;
    }

    function updateCounter() {
      counterTotalEl.textContent = `/ ${state.sentences.length}`;
      counterIndexInput.max = String(Math.max(1, state.sentences.length));
      if (document.activeElement !== counterIndexInput) {
        counterIndexInput.value = state.index + 1;
        fitCounterIndexInputWidth();
      }
    }

    function jumpToEnteredCounterIndex() {
      const entered = Number.parseInt(counterIndexInput.value, 10);
      if (!Number.isFinite(entered) || !state.sentences.length) {
        updateCounter();
        return;
      }
      const clamped = Math.max(1, Math.min(entered, state.sentences.length));
      counterIndexInput.value = clamped;
      fitCounterIndexInputWidth();
      if (clamped - 1 === state.index) return;
      state.index = clamped - 1;
      resetCurrent(true);
    }

    function adjustCounterIndex(step) {
      const current = Number.parseInt(counterIndexInput.value, 10) || state.index + 1;
      const next = Math.max(1, Math.min(current + step, state.sentences.length || 1));
      counterIndexInput.value = String(next);
      fitCounterIndexInputWidth();
      jumpToEnteredCounterIndex();
    }

    function placeCounterCaretAtEnd() {
      const end = counterIndexInput.value.length;
      counterIndexInput.setSelectionRange(end, end);
    }
    const errorsEl = $("errors");

    function syncCurrentLibrarySelect(label) {
      const select = $("currentLibrarySelect");
      const isCommon = label === "常用句库";
      const isFavorites = label === "用户收藏";
      const isAudio = label === "音频字幕";
      let customOption = select.querySelector('option[value="custom"]');
      if (!isCommon && !isFavorites && !isAudio) {
        if (!customOption) {
          customOption = document.createElement("option");
          customOption.value = "custom";
          select.appendChild(customOption);
        }
        customOption.textContent = label;
        select.value = "custom";
      } else {
        if (customOption) customOption.remove();
        select.value = isCommon ? "common" : isAudio ? "audio" : "favorites";
      }
      select.title = `当前使用：${label}`;
    }

    function setCurrentLibrary(label, statusText = "") {
      stopFullTextReading();
      clearAudioMaterial();
      state.currentLibraryLabel = label || "自定义句库";
      syncCurrentLibrarySelect(state.currentLibraryLabel);
      if (statusText) $("sourceStatus").textContent = statusText;
      state.randomHistory = [];
      state.randomForwardStack = [];
      scheduleCloudSync();
    }

    function normalizeUsername(name) {
      return name.trim().replace(/\s+/g, " ").slice(0, 24);
    }

    // ---- Personal data (src/user-data.js, docs/USER_DATA.md section 8). Every record belongs to an identity (a local
    // user, a cloud account, or guest) and to "global" or one learning language.
    const userData = window.langLSRWUserData;

    function userDataIdentity() {
      if (state.cloudUser?.id) return `cloud:${state.cloudUser.id}`;
      if (state.currentUser) return `local:${state.currentUser}`;
      return "guest";
    }

    function userDataIdentityMeta() {
      if (state.cloudUser?.id) return { type: "cloud", id: state.cloudUser.id, name: cloudDisplayName() };
      if (state.currentUser) return { type: "local", name: state.currentUser };
      return { type: "guest" };
    }

    function languageScope(languageId = state.learningLanguageId) {
      return LEARNING_LANGUAGES[languageId] ? languageId : "en";
    }

    // Opens the current identity's records and applies what depends on them.
    async function openUserData() {
      await userData.open(userDataIdentity());
      applyIdentitySettings();
    }

    // After an import or a cloud download changed the open identity's records.
    function refreshAfterUserDataChange() {
      applyIdentitySettings();
      render();
      if (!$("userPhrasesModal").hidden) renderUserPhrases();
      refreshWordReviewStatusIcons();
      updateFavoriteReviewLaunchers();
    }

    function saveLastPosition() {
      userData.put("position", "last", {
        libraryLabel: state.currentLibraryLabel,
        index: state.index
      }, languageScope());
    }

    function loadLastPosition() {
      const saved = userData.get("position", "last", languageScope());
      return saved && typeof saved === "object" ? saved : null;
    }

    function getKnownUsers() {
      return JSON.parse(localStorage.getItem("langLSRWKnownUsers") || "[]");
    }

    function saveKnownUser(name) {
      const users = getKnownUsers().filter((user) => user !== name);
      users.unshift(name);
      localStorage.setItem("langLSRWKnownUsers", JSON.stringify(users.slice(0, 8)));
    }

    // Built-in library references: sentences are stored as library id + sentence id + library fingerprint, never as
    // text. A reference whose fingerprint no longer matches the loaded library is treated as invalid (docs/SENTENCE_REVIEW.md
    // section 8); the per-sentence fingerprint `fp` is reserved for later.
    function textFingerprint(text) {
      let h1 = 0xdeadbeef;
      let h2 = 0x41c6ce57;
      for (let i = 0; i < text.length; i += 1) {
        const ch = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    }

    let librarySentenceMap = { items: null, map: new Map() };

    function librarySentenceById(id) {
      if (librarySentenceMap.items !== state.library.items) {
        librarySentenceMap = { items: state.library.items, map: new Map(state.library.items.map((item) => [String(item.id), item])) };
      }
      return librarySentenceMap.map.get(String(id)) || null;
    }

    function librarySentenceRef(item) {
      const normalized = normalizeSentenceItem(item);
      const libraryId = state.library.manifest?.id;
      if (normalized.id && libraryId && normalized.libraryId === libraryId && state.library.fingerprint && librarySentenceById(normalized.id)) {
        return { lib: libraryId, id: normalized.id, lf: state.library.fingerprint };
      }
      return null;
    }

    function resolveLibrarySentence(ref) {
      if (!ref?.lib || ref.lib !== state.library.manifest?.id || ref.lf !== state.library.fingerprint) return null;
      const item = librarySentenceById(ref.id);
      return item ? normalizeSentenceItem(item) : null;
    }

    // One compact practice event per answered sentence (docs/USER_DATA.md section 8.2), for sentence review
    // (docs/SENTENCE_REVIEW.md; not built yet, so nothing calls this for now):
    // [mode, libraryId, sentenceId, libraryFingerprint, text (only outside built-in libraries), accuracy, fluency,
    //  errorCount, wpm, time in seconds, mistakes as [[position, typed], ...]].
    function recordPracticeEvent(mode, item, metrics) {
      const normalized = normalizeSentenceItem(item);
      const ref = librarySentenceRef(normalized);
      userData.append("practiceEvent", [
        mode,
        ref?.lib || "",
        ref?.id || "",
        ref?.lf || "",
        ref ? "" : normalized.text,
        metrics.accuracy,
        metrics.fluency,
        metrics.errors.length,
        metrics.wpm,
        Math.floor(Date.now() / 1000),
        metrics.errors.map((error) => [error.pos, error.actual])
      ], languageScope());
      scheduleCloudSync();
    }

    const AUTO_CLOUD_SYNC_ENABLED = false;
    let cloudSyncTimer = 0;

    function cloudDisplayName(user = state.cloudUser) {
      if (!user) return "";
      return String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Google 用户");
    }

    function renderCloudAuthState(message = "") {
      const configured = Boolean(window.langLSRWCloudAuth?.isConfigured());
      const signedIn = Boolean(state.cloudUser);
      $("cloudUserMenuSection").hidden = !signedIn;
      $("localUserMenuSection").hidden = signedIn || !state.currentUser;
      $("googleLoginBtn").disabled = !configured || signedIn;
      $("cloudLogoutBtn").disabled = !signedIn || state.cloudSyncing;
      $("syncCloudBtn").disabled = !signedIn || state.cloudSyncing;
      $("clearUserBtn").disabled = signedIn || !state.currentUser;
      $("clearUserBtn").title = signedIn ? "请先退出 Google 登录" : "删除当前浏览器中的本机用户和练习记录";
      $("cloudLoginStatus").textContent = message || (signedIn
        ? `已登录：${cloudDisplayName()}`
        : configured ? "" : "云登录未配置");
      $("cloudAccountStatus").textContent = signedIn
        ? `${cloudDisplayName()}${state.cloudLastSyncedAt ? ` · 云端保存 ${new Date(state.cloudLastSyncedAt).toLocaleString()}` : " · 尚未保存"}`
        : "未登录云账号";
      if (signedIn) $("userBadge").textContent = `用户：${cloudDisplayName()}`;
    }

    // The cloud row carries the same personal data document as a backup export.
    function collectCloudPayload() {
      return userData.exportDocument({ identity: userDataIdentityMeta() });
    }

    function applyCloudPayload(payload) {
      if (!userData.isDocument(payload)) return;
      state.cloudSyncing = true;
      try {
        userData.importDocument(payload);
      } finally {
        state.cloudSyncing = false;
      }
      refreshAfterUserDataChange();
    }

    async function pushCloudState() {
      if (!state.cloudUser || state.cloudSyncing) return;
      state.cloudSyncing = true;
      renderCloudAuthState("正在保存到云端...");
      try {
        state.cloudLastSyncedAt = await window.langLSRWCloudAuth.saveState(state.cloudUser.id, collectCloudPayload());
        renderCloudAuthState("已保存到云端");
      } catch (error) {
        renderCloudAuthState(`云端保存失败：${error.message || error}`);
      } finally {
        state.cloudSyncing = false;
        renderCloudAuthState();
      }
    }

    function scheduleCloudSync() {
      if (!AUTO_CLOUD_SYNC_ENABLED || !state.cloudUser || state.cloudSyncing) return;
      clearTimeout(cloudSyncTimer);
      cloudSyncTimer = setTimeout(pushCloudState, 1200);
    }

    function completeCloudSignOut(message = "已退出 Google") {
      state.cloudUser = null;
      state.cloudLastSyncedAt = "";
      state.currentUser = "";
      localStorage.removeItem("langLSRWCurrentUser");
      $("userBadge").textContent = "未登录";
      renderCloudAuthState(message);
      openUserData().then(() => tryLoadDefaultLibrary()).then(render);
      showLogin();
    }

    async function activateCloudUser(user) {
      if (!user || state.cloudUser?.id === user.id) return;
      state.cloudUser = user;
      state.currentUser = "";
      localStorage.removeItem("langLSRWCurrentUser");
      await openUserData();
      renderCloudAuthState("正在读取云端数据...");
      try {
        const remote = await window.langLSRWCloudAuth.loadState(user.id);
        if (remote?.payload) {
          state.cloudLastSyncedAt = remote.updated_at || "";
          applyCloudPayload(remote.payload);
        }
        await tryLoadDefaultLibrary();
        hideLogin();
        render();
      } catch (error) {
        renderCloudAuthState(`云端读取失败，本地模式仍可使用：${error.message || error}`);
      }
    }

    async function initializeCloudAuth() {
      renderCloudAuthState();
      if (!window.langLSRWCloudAuth?.isConfigured()) return;
      try {
        window.langLSRWCloudAuth.onAuthStateChange((event, session) => {
          if (session?.user) activateCloudUser(session.user);
          if (event === "SIGNED_OUT") {
            state.cloudUser = null;
            state.cloudLastSyncedAt = "";
            if (state.cloudSwitchingToLocal) return;
            completeCloudSignOut();
          }
        });
        const user = await window.langLSRWCloudAuth.getUser();
        if (user) await activateCloudUser(user);
      } catch (error) {
        renderCloudAuthState(`云账号初始化失败：${error.message || error}`);
      }
    }

    async function signInWithGoogle() {
      renderCloudAuthState("正在跳转到 Google...");
      try {
        await window.langLSRWCloudAuth.signInWithGoogle();
      } catch (error) {
        renderCloudAuthState(`登录失败：${error.message || error}`);
      }
    }

    async function signOutCloudUser() {
      try {
        clearTimeout(cloudSyncTimer);
        await window.langLSRWCloudAuth.signOut();
        if (state.cloudUser) completeCloudSignOut();
      } catch (error) {
        renderCloudAuthState(`退出失败：${error.message || error}`);
      }
    }

    function normalizeSentenceItem(item) {
      if (item && typeof item === "object") {
        return {
          id: String(item.id || "").trim(),
          libraryId: String(item.libraryId || "").trim(),
          text: String(item.text || item.sentence || item.english || "").trim(),
          translation: String(item.translation || item.zh || item.cn || "").trim(),
          grammar: String(item.grammar || item.grammarAnalysis || "").trim(),
          grammarRaw: String(item.grammarRaw || item.aiGrammarResponse || item.grammar || item.grammarAnalysis || "").trim(),
          // Audio + LRC materials: keep the sentence's segment in the original recording through every normalization.
          ...(Number.isFinite(item.start) ? { start: item.start, end: Number.isFinite(item.end) ? item.end : null } : {})
        };
      }
      return { id: "", libraryId: "", text: String(item || "").trim(), translation: "", grammar: "", grammarRaw: "" };
    }

    function sentenceText(item) {
      return normalizeSentenceItem(item).text;
    }

    function sentenceTranslation(item) {
      return normalizeSentenceItem(item).translation;
    }

    function sentenceGrammar(item) {
      return normalizeSentenceItem(item).grammar;
    }

    function sentenceGrammarRaw(item) {
      return normalizeSentenceItem(item).grammarRaw;
    }

    // AI grammar analyses are personal records of the current learning language (grammarResult).
    function loadGrammarCache() {
      return userData.entries("grammarResult", languageScope()).map(({ key, value }) => ({
        key,
        sentence: value?.sentence || "",
        framework: value?.framework || "traditional",
        grammar: value?.grammar || "",
        grammarRaw: value?.grammarRaw || value?.grammar || "",
        savedAt: value?.savedAt || ""
      }));
    }

    function grammarCacheSentenceKey(sentence) {
      return String(sentence || "")
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim();
    }

    function grammarFrameworkFromContent(grammar) {
      try {
        const parsed = JSON.parse(String(grammar || "").trim());
        return String(parsed?.convention || "").startsWith("traditional-school/") ? "traditional" : "sieg2-cgel";
      } catch {
        return "sieg2-cgel";
      }
    }

    // 🌈 marks sentences that already have an AI grammar analysis; clicking it shows (or hides) that analysis.
    function grammarToggleButton(visible) {
      return `<button class="translation-grammar-button${visible ? " is-active" : ""}" type="button" data-grammar-toggle title="${visible ? "隐藏 Ai 语法分析" : "显示已保存的 Ai 语法分析"}" aria-pressed="${visible}">🌈</button>`;
    }

    function grammarCacheKeySet() {
      return new Set(loadGrammarCache()
        .filter((item) => item && String(item.grammar || "").trim() && (item.framework || grammarFrameworkFromContent(item.grammar)) === "traditional")
        .map((item) => grammarCacheSentenceKey(item.key || item.sentence)));
    }

    function sentenceHasGrammar(item, keys) {
      const normalized = normalizeSentenceItem(item);
      if (normalized.grammar && grammarFrameworkFromContent(normalized.grammar) === "traditional") return true;
      return keys.has(grammarCacheSentenceKey(normalized.text));
    }

    function findCachedGrammar(sentence) {
      const key = grammarCacheSentenceKey(sentence);
      const record = loadGrammarCache().find((item) => (
        item
        && grammarCacheSentenceKey(item.key || item.sentence) === key
        && (item.framework || grammarFrameworkFromContent(item.grammar)) === "traditional"
      ));
      if (!record || !String(record.grammar || "").trim()) return null;
      return {
        grammar: String(record.grammar).trim(),
        grammarRaw: String(record.grammarRaw || record.grammar).trim()
      };
    }

    function saveGrammarCache(sentence, grammar, grammarRaw = grammar) {
      const key = grammarCacheSentenceKey(sentence);
      if (!key) return;
      userData.put("grammarResult", key, {
        sentence,
        framework: "traditional",
        grammar,
        ...(grammarRaw && grammarRaw !== grammar ? { grammarRaw } : {}),
        savedAt: new Date().toISOString()
      }, languageScope());
      scheduleCloudSync();
    }

    function sentenceWithCachedGrammar(item) {
      const normalized = normalizeSentenceItem(item);
      if (normalized.grammar && grammarFrameworkFromContent(normalized.grammar) === "traditional") {
        if (!findCachedGrammar(normalized.text)) {
          saveGrammarCache(normalized.text, normalized.grammar, normalized.grammarRaw || normalized.grammar);
        }
        return normalized;
      }
      const cached = findCachedGrammar(normalized.text);
      if (!cached) {
        normalized.grammar = "";
        normalized.grammarRaw = "";
        return normalized;
      }
      normalized.grammar = cached.grammar;
      normalized.grammarRaw = cached.grammarRaw;
      return normalized;
    }

    function normalizeSentenceList(items) {
      return (items || [])
        .map(normalizeSentenceItem)
        .filter((item) => item.text);
    }

    function downloadJson(filename, data, { compact = false } = {}) {
      const blob = new Blob([compact ? JSON.stringify(data) : JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    // Export = every record of the current identity, whatever page or library is open (docs/USER_DATA.md section 8.4).
    async function exportData() {
      await userData.flush();
      const date = new Date().toISOString().slice(0, 10);
      const label = state.cloudUser ? cloudDisplayName() : (state.currentUser || "guest");
      const safeName = label.replace(/[^a-z0-9_-]+/gi, "_");
      downloadJson(`langlsrw-${safeName}-${date}.json`, userData.exportDocument({ identity: userDataIdentityMeta() }), { compact: true });
    }

    // Import merges record by record into the current identity; the newer copy of a record wins.
    async function restoreBackupData(data) {
      if (!userData.isDocument(data)) {
        alert("这不是新版个人数据文件。旧版备份已不再支持导入。");
        return;
      }
      if (!state.cloudUser && !state.currentUser && data.identity?.type === "local" && data.identity.name) {
        await loginAs(data.identity.name);
      }
      const counts = userData.importDocument(data, { dryRun: true });
      if (!counts.added && !counts.updated) {
        alert("没有需要导入的内容：文件中的记录在本机都已是最新。");
        return;
      }
      const target = state.cloudUser ? cloudDisplayName() : (state.currentUser || "未登录");
      if (!confirm(`导入到“${target}”：新增 ${counts.added} 条、更新 ${counts.updated} 条记录（同一条记录保留较新的一份）。继续吗？`)) return;
      userData.importDocument(data);
      await userData.flush();
      refreshAfterUserDataChange();
      await tryLoadDefaultLibrary();
      hideLogin();
      alert("数据已导入。");
    }

    function renderLoginUsers() {
      const users = getKnownUsers();
      const loginUsers = $("loginUsers");
      if (!users.length) {
        loginUsers.innerHTML = '<span class="empty">还没有用户。</span>';
        return;
      }
      loginUsers.innerHTML = users.map((user) => (
        `<button class="user-chip" type="button" data-user="${escapeHtml(user)}">${escapeHtml(user)}</button>`
      )).join("");
    }

    function showLogin() {
      $("loginScreen").classList.add("active");
      $("usernameInput").value = state.currentUser || "";
      renderLoginUsers();
      $("loginScreen").focus({ preventScroll: true });
    }

    function hideLogin() {
      $("loginScreen").classList.remove("active");
    }

    async function loginAs(name) {
      const username = normalizeUsername(name);
      if (!username) return;
      if (state.cloudUser) {
        clearTimeout(cloudSyncTimer);
        state.cloudSwitchingToLocal = true;
        try {
          await window.langLSRWCloudAuth.signOut();
        } catch {
          // Local mode remains available even if the remote session cannot be closed.
        }
        state.cloudUser = null;
        state.cloudLastSyncedAt = "";
        state.cloudSwitchingToLocal = false;
      }
      state.currentUser = username;
      localStorage.setItem("langLSRWCurrentUser", username);
      saveKnownUser(username);
      await openUserData();
      await tryLoadDefaultLibrary();
      resetCurrent();
      $("userBadge").textContent = `用户：${username}`;
      renderCloudAuthState();
      hideLogin();
    }

    async function clearCurrentUser() {
      const username = state.currentUser;
      if (!username) {
        showLogin();
        return;
      }
      const confirmed = confirm(`确定清除用户「${username}」吗？这个用户在本机的全部数据（收藏、背词记录、练习记录、设置等）都会被删除。`);
      if (!confirmed) return;

      await userData.deleteIdentity(`local:${username}`);
      const users = getKnownUsers().filter((user) => user !== username);
      localStorage.setItem("langLSRWKnownUsers", JSON.stringify(users));
      localStorage.removeItem("langLSRWCurrentUser");
      state.currentUser = "";
      await openUserData();
      await tryLoadDefaultLibrary();
      $("userBadge").textContent = "未登录";
      renderCloudAuthState();
      closeTopMenus();
      showLogin();
    }

    function cleanSentenceLine(line) {
      return line
        .replace(/^\s*\d+[\).]\s*/, "")
        .trim();
    }

    function cleanLrcLine(line) {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^\[(ti|ar|al|by|offset|length|re):/i.test(trimmed)) return "";
      return trimmed
        .replace(/(?:\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\])+/g, "")
        .replace(/^\s*[-–—]\s*/, "")
        .trim();
    }

    function hasCjk(text) {
      return /[\u3400-\u9fff]/.test(text || "");
    }

    function splitInlineTranslation(line) {
      const patterns = [
        /^(.+?)\s*(?:\|\||\t|=>|->|：|:)\s*([\u3400-\u9fff].*)$/,
        /^(.+?)\s{2,}([\u3400-\u9fff].*)$/
      ];
      for (const pattern of patterns) {
        const match = line.match(pattern);
        // The left side must be the English sentence: a Chinese line that merely contains a colon is not a pair.
        if (match && match[1].trim() && match[2].trim() && !hasCjk(match[1])) {
          return { text: match[1].trim(), translation: match[2].trim() };
        }
      }
      return null;
    }

    function parseSentences(text, filename = "") {
      const looksLikeLrc = /\.lrc$/i.test(filename) || /\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/.test(text);
      const lines = text
        .split(/\r?\n/)
        .map((line) => looksLikeLrc ? cleanLrcLine(line) : cleanSentenceLine(line))
        .filter(Boolean);

      const items = [];
      lines.forEach((line) => {
        const inlinePair = splitInlineTranslation(line);
        if (inlinePair) {
          items.push(inlinePair);
          return;
        }

        if (hasCjk(line)) {
          const previous = items[items.length - 1];
          if (previous && !previous.translation) previous.translation = line;
          return;
        }

        items.push({ text: line, translation: "" });
      });

      const seen = new Set();
      return items.filter((item) => {
        const key = item.text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function commonLibraryManifestUrl() {
      return currentLearningLanguage().commonLibraryManifestUrl;
    }

    function resetCommonLibraryState() {
      state.library.manifest = null;
      state.library.items = [];
      state.library.fingerprint = "";
      state.library.filteredItems = [];
      state.library.query = "";
      state.library.page = 0;
      $("librarySearchInput").value = "";
      $("useLibraryBtn").disabled = true;
    }

    function closeLibraryModal() {
      $("libraryModal").hidden = true;
    }

    function setLibraryView(view) {
      const views = [
        ["common", "commonLibraryPanel", "commonLibraryTabBtn"],
        ["settings", "librarySettingsPanel", "librarySettingsTabBtn"],
        ["audio", "audioLibraryPanel", "audioLibraryTabBtn"]
      ];
      const active = views.some(([name]) => name === view) ? view : "common";
      views.forEach(([name, panelId, buttonId]) => {
        $(panelId).hidden = name !== active;
        $(buttonId).classList.toggle("is-active", name === active);
        $(buttonId).setAttribute("aria-current", String(name === active));
      });
      if (active === "common") $("librarySearchInput").focus();
      if (active === "audio") renderAudioLibrary();
    }

    function useFavoritesLibrary() {
      const sentences = loadUserSentences();
      if (!sentences.length) return;
      state.sentences = normalizeSentenceList(sentences.map((item) => ({
        id: item.sourceId || "",
        libraryId: item.libraryId || "",
        sentence: item.sentence,
        translation: item.translation
      })));
      state.index = 0;
      setCurrentLibrary("用户收藏", `当前句库：用户收藏（${state.sentences.length.toLocaleString()}句）`);
      closeLibraryModal();
      resetCurrent(true);
    }

    function libraryFilteredItems() {
      const query = state.library.query.toLocaleLowerCase();
      if (!query) return state.library.items;
      return state.library.items.filter((item) => (
        item.id.toLocaleLowerCase().includes(query)
        || item.text.toLocaleLowerCase().includes(query)
        || item.translation.toLocaleLowerCase().includes(query)
      ));
    }

    function renderLibraryPage() {
      const library = state.library;
      const items = library.filteredItems;
      const pageCount = items.length ? Math.ceil(items.length / library.pageSize) : 0;
      library.page = pageCount ? Math.min(library.page, pageCount - 1) : 0;
      const start = library.page * library.pageSize;
      const visibleItems = items.slice(start, start + library.pageSize);

      $("librarySentenceList").innerHTML = visibleItems.length
        ? visibleItems.map((item) => `
          <div class="library-sentence-row">
            <span class="library-sentence-id">${escapeHtml(item.id)}</span>
            <span class="library-sentence-english">${escapeHtml(item.text)}</span>
            <span class="library-sentence-translation">${escapeHtml(item.translation)}</span>
            <button class="user-sentence-load-button" type="button" data-load-library-sentence="${escapeHtml(item.id)}" title="加载到听写练习" aria-label="加载到听写练习">▶</button>
          </div>
        `).join("")
        : '<div class="empty">没有找到匹配的句子。</div>';
      $("libraryStatus").textContent = library.query
        ? `找到 ${items.length.toLocaleString()} 条，显示第 ${items.length ? start + 1 : 0}-${Math.min(start + library.pageSize, items.length)} 条`
        : `共 ${items.length.toLocaleString()} 条，显示第 ${items.length ? start + 1 : 0}-${Math.min(start + library.pageSize, items.length)} 条`;
      $("libraryPageInput").value = pageCount ? library.page + 1 : 0;
      $("libraryPageInput").max = Math.max(1, pageCount);
      $("libraryPageInput").disabled = !pageCount;
      $("libraryPageCount").textContent = `/ ${pageCount} 页`;
      $("libraryFirstPageBtn").disabled = library.page <= 0;
      $("libraryPreviousPageBtn").disabled = library.page <= 0;
      $("libraryNextPageBtn").disabled = !pageCount || library.page >= pageCount - 1;
      $("libraryLastPageBtn").disabled = !pageCount || library.page >= pageCount - 1;
    }

    function goToLibraryPage(pageIndex) {
      const pageCount = Math.ceil(state.library.filteredItems.length / state.library.pageSize);
      if (!pageCount) return;
      state.library.page = Math.max(0, Math.min(Number(pageIndex) || 0, pageCount - 1));
      renderLibraryPage();
      $("librarySentenceList").scrollTop = 0;
    }

    function goToEnteredLibraryPage() {
      const enteredPage = Number.parseInt($("libraryPageInput").value, 10);
      goToLibraryPage(Number.isFinite(enteredPage) ? enteredPage - 1 : state.library.page);
    }

    function filterLibrary() {
      state.library.query = $("librarySearchInput").value.trim();
      state.library.page = 0;
      state.library.filteredItems = libraryFilteredItems();
      renderLibraryPage();
    }

    async function loadCommonLibrary() {
      // Loading is tracked per learning language, so switching language during a load still loads the new library.
      if (state.library.items.length || (state.library.loading && state.library.loadingLanguage === state.learningLanguageId)) return;
      state.library.loading = true;
      state.library.loadingLanguage = state.learningLanguageId;
      $("libraryStatus").textContent = "正在加载常用句库...";
      $("librarySentenceList").innerHTML = '<div class="empty">正在读取常用句库...</div>';
      const languageId = state.learningLanguageId;
      try {
        const result = await window.langLSRWLibrary.load(commonLibraryManifestUrl());
        if (state.learningLanguageId !== languageId) return;
        state.library.manifest = result.manifest;
        state.library.items = result.items;
        state.library.fingerprint = textFingerprint(result.items.map((item) => `${item.id}\t${item.text}`).join("\n"));
        state.library.filteredItems = result.items;
        $("libraryName").textContent = result.manifest.name;
        $("libraryMeta").textContent = `${result.items.length.toLocaleString()} 条 · ${currentLearningLanguage().commonLibraryContent} · v${result.manifest.version}`;
        $("useLibraryBtn").disabled = false;
        renderLibraryPage();
      } catch (error) {
        $("libraryStatus").textContent = `加载失败：${error.message || error}`;
        $("librarySentenceList").innerHTML = '<div class="empty">请确认通过本地服务器打开网页，且句库文件完整。</div>';
      } finally {
        if (state.library.loadingLanguage === languageId) state.library.loading = false;
      }
    }

    async function openLibraryModal() {
      closeTopMenus();
      clearPeekedWord();
      if (state.speaking.holdActive) scheduleStopSpeakingPractice();
      $("libraryModal").hidden = false;
      setLibraryView("common");
      await loadCommonLibrary();
      $("librarySearchInput").focus();
    }

    function useCommonLibrary() {
      if (!state.library.items.length || !state.library.manifest) return;
      state.sentences = normalizeSentenceList(state.library.items);
      state.index = 0;
      setCurrentLibrary("常用句库", `当前句库：${state.library.manifest.name}（${state.sentences.length.toLocaleString()}句）`);
      closeLibraryModal();
      resetCurrent(true);
    }

    function loadLibrarySentenceIntoPractice(id) {
      if (!state.library.items.length || !state.library.manifest) return;
      state.sentences = normalizeSentenceList(state.library.items);
      const matchIndex = state.sentences.findIndex((item) => item.id === id);
      state.index = Math.max(0, matchIndex);
      setCurrentLibrary("常用句库", `当前句库：${state.library.manifest.name}（${state.sentences.length.toLocaleString()}句）`);
      closeLibraryModal();
      setActivePage("listenPage");
      resetCurrent(true);
    }

    // ---- Original-audio materials: an audio file plus a timed .lrc. Each sentence keeps its [start, end) seconds
    // and plays that segment of the audio instead of TTS. The audio stays in memory only (re-import after reload).
    const AUDIO_FILE_PATTERN = /\.(m4a|mp3|wav|ogg|oga|aac|flac|webm|opus)$/i;

    function parseLrcTime(stamp) {
      const match = String(stamp).match(/^(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?$/);
      if (!match) return NaN;
      const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0")}`) : 0;
      return Number(match[1]) * 60 + Number(match[2]) + fraction;
    }

    function isTranslationOnlyLine(content) {
      return Boolean(content) && hasCjk(content) && !splitInlineTranslation(content);
    }

    function parseTimedLrc(text) {
      const offsetMatch = text.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/im);
      const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
      const entries = [];
      text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || /^\[(ti|ar|al|by|offset|length|re):/i.test(trimmed)) return;
        const stamps = [...trimmed.matchAll(/\[(\d{1,3}:\d{2}(?:[.:]\d{1,3})?)\]/g)]
          .map((match) => parseLrcTime(match[1]))
          .filter(Number.isFinite);
        const content = cleanLrcLine(trimmed);
        stamps.forEach((time) => entries.push({ time: Math.max(0, time - offset), content }));
      });
      entries.sort((a, b) => a.time - b.time);
      const items = [];
      entries.forEach((entry, index) => {
        if (!entry.content) return;
        if (isTranslationOnlyLine(entry.content)) {
          const previous = items[items.length - 1];
          if (previous && !previous.translation) previous.translation = entry.content;
          return;
        }
        const pair = splitInlineTranslation(entry.content);
        // A sentence ends where the next English line (or an empty timing line) starts; translation lines do not cut it.
        const next = entries.slice(index + 1).find((candidate) => candidate.time > entry.time && !isTranslationOnlyLine(candidate.content));
        items.push({
          text: pair ? pair.text : entry.content,
          translation: pair ? pair.translation : "",
          start: entry.time,
          boundaryEnd: next ? next.time : null,
          // Stop a little before the next line: subtitle stamps often lag the speech, so the next sentence's
          // first sounds would otherwise leak into this one.
          end: next ? Math.max(entry.time + 0.5, next.time - TIMED_SEGMENT_END_MARGIN_SECONDS) : null
        });
      });
      // Cap each subtitle line first, so a merged sentence ends where its last line's speech is expected to end.
      return mergeTimedFragments(capTimedSegments(items));
    }

    // Subtitles often split one sentence over several lines. A line that has no sentence-ending punctuation is joined
    // with the next when it ends with , ; : or a dash, or the next line starts in lower case (at most 4 lines).
    const TIMED_MERGE_MAX_LINES = 4;

    function mergeTimedFragments(items) {
      const merged = [];
      let group = [];
      const flush = () => {
        if (!group.length) return;
        const first = group[0];
        const last = group[group.length - 1];
        merged.push({
          text: group.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(),
          translation: group.map((item) => item.translation).filter(Boolean).join(""),
          start: first.start,
          // A continuation line often starts before the previous fragment has fully ended. Once those fragments
          // become one sentence, use the final fragment's real next-line boundary so its last words are not cut.
          end: group.length > 1 && Number.isFinite(last.boundaryEnd) ? last.boundaryEnd : last.end
        });
        group = [];
      };
      items.forEach((item, index) => {
        group.push(item);
        const next = items[index + 1];
        const endsSentence = /[.?!…]["'”’)\]]*$/.test(item.text);
        const continues = /[,;:\-–—]$/.test(item.text) || languageText().startsLowercase(next?.text || "");
        if (!next || endsSentence || !continues || group.length >= TIMED_MERGE_MAX_LINES) flush();
      });
      return merged;
    }

    // A segment ends at the next line's start, but long music or silence (and the last line, which has no next line)
    // would otherwise be played too. Cap each segment at 2.5 s + 0.6 s per word, well above normal speaking speed.
    const TIMED_SEGMENT_END_MARGIN_SECONDS = 0.3;
    const TIMED_SEGMENT_BASE_SECONDS = 2.5;
    const TIMED_SEGMENT_SECONDS_PER_WORD = 0.6;

    function capTimedSegments(items) {
      return items.map((item) => {
        const words = item.text.split(/\s+/).filter(Boolean).length;
        const limit = item.start + TIMED_SEGMENT_BASE_SECONDS + TIMED_SEGMENT_SECONDS_PER_WORD * words;
        return { ...item, end: item.end === null ? limit : Math.min(item.end, limit) };
      });
    }

    function setAudioMaterial(blob, name = blob?.name || "") {
      clearAudioMaterial();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = "auto";
      state.audioMaterial = { url, audio, name, playToken: 0, finishPlayback: null, audioContext: null, gainNode: null };
      setOriginalVoiceOption(true);
    }

    function clearAudioMaterial() {
      const material = state.audioMaterial;
      if (!material) return;
      stopSentenceAudio();
      material.audioContext?.close().catch(() => {});
      material.audio.removeAttribute("src");
      URL.revokeObjectURL(material.url);
      state.audioMaterial = null;
      setOriginalVoiceOption(false);
    }

    // With an audio material loaded, the accent select gains 原声 and switches to it; 英音 / 美音 stay available and
    // use TTS. 原声 is never saved as the accent setting: TTS-only uses (word replay, speech recognition, voices)
    // keep reading the saved English accent through ttsAccent().
    function setOriginalVoiceOption(available) {
      const select = $("accentSelect");
      let option = select.querySelector('option[value="original"]');
      if (available) {
        if (!option) {
          option = document.createElement("option");
          option.value = "original";
          option.textContent = "原声";
          select.prepend(option);
        }
        select.value = "original";
      } else {
        option?.remove();
        select.value = defaultAccentForLanguage();
      }
      updateVoiceSelectForAccent();
    }

    function usingOriginalVoice() {
      return $("accentSelect").value === "original";
    }

    function defaultAccentForLanguage() {
      const language = currentLearningLanguage();
      const saved = language.id === "en" ? state.speechSettings.accent : state.speechSettings[`accent_${language.id}`];
      return language.accents.some(([value]) => value === saved) ? saved : language.accents[0][0];
    }

    function ttsAccent() {
      const value = $("accentSelect").value;
      return value === "original" || !value ? defaultAccentForLanguage() : value;
    }

    function voiceSettingKey() {
      return state.learningLanguageId && state.learningLanguageId !== "en" ? `voiceURI_${state.learningLanguageId}` : "voiceURI";
    }

    // The accent select lists the current learning language's accents (英音 / 美音 for English, 西语 for Spanish),
    // keeping the 原声 option while an audio material is loaded.
    function renderAccentOptions() {
      const select = $("accentSelect");
      const original = select.querySelector('option[value="original"]');
      const wasOriginal = select.value === "original";
      const accents = currentLearningLanguage().accents;
      select.innerHTML = accents.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
      select.classList.toggle("is-wide", accents.some(([, label]) => label.length > 2));
      if (original) select.prepend(original);
      select.value = wasOriginal && original ? "original" : defaultAccentForLanguage();
      populateVoices();
      updateVoiceSelectForAccent();
    }

    function updateVoiceSelectForAccent() {
      const voiceSelect = $("voiceSelect");
      const original = usingOriginalVoice();
      voiceSelect.disabled = original;
      voiceSelect.title = original ? "正在使用原声，不需要选择合成声音；切换到英音或美音后可选" : "选择朗读用的合成声音";
    }

    function currentSentenceAudioSegment() {
      const item = state.sentences[state.index];
      if (!state.audioMaterial || !usingOriginalVoice() || !item || !Number.isFinite(item.start)) return null;
      return { start: item.start, end: Number.isFinite(item.end) ? item.end : null };
    }

    function stopSentenceAudio() {
      const material = state.audioMaterial;
      if (!material) return;
      material.playToken += 1;
      material.audio.pause();
      if (material.audioContext && material.gainNode) {
        const now = material.audioContext.currentTime;
        material.gainNode.gain.cancelScheduledValues(now);
        material.gainNode.gain.setValueAtTime(0, now);
      }
      material.finishPlayback?.();
    }

    function ensureSentenceAudioGain(material) {
      if (material.audioContext && material.gainNode) return material.audioContext;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      const context = new AudioContextClass();
      const source = context.createMediaElementSource(material.audio);
      const gain = context.createGain();
      source.connect(gain);
      gain.connect(context.destination);
      gain.gain.value = 1;
      material.audioContext = context;
      material.gainNode = gain;
      return context;
    }

    function playSentenceAudioAndWait(rate = 1) {
      const segment = currentSentenceAudioSegment();
      if (!segment) return Promise.resolve();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      stopSentenceAudio();
      const material = state.audioMaterial;
      const audio = material.audio;
      const token = material.playToken;
      const audioContext = ensureSentenceAudioGain(material);
      return new Promise((resolve, reject) => {
        let timer = 0;
        let finished = false;
        const finish = (error) => {
          if (finished) return;
          finished = true;
          clearInterval(timer);
          audio.removeEventListener("ended", onEnded);
          if (material.finishPlayback === finish) material.finishPlayback = null;
          if (error) reject(error);
          else resolve();
        };
        const onEnded = () => finish();
        material.finishPlayback = finish;
        audio.addEventListener("ended", onEnded);
        audio.playbackRate = rate;
        audio.currentTime = segment.start;
        const beginPlayback = async () => {
          if (audioContext?.state === "suspended") await audioContext.resume();
          if (finished || material.playToken !== token) return;
          if (audioContext?.state === "running" && material.gainNode) {
            const now = audioContext.currentTime;
            material.gainNode.gain.cancelScheduledValues(now);
            material.gainNode.gain.setValueAtTime(1, now);
          }
          await audio.play();
          if (finished || material.playToken !== token) return;
          if (segment.end !== null && audioContext?.state === "running" && material.gainNode) {
            const now = audioContext.currentTime;
            const audibleSeconds = Math.max(0, (segment.end - audio.currentTime) / audio.playbackRate);
            material.gainNode.gain.setValueAtTime(0, now + audibleSeconds);
          }
          timer = setInterval(() => {
            if (material.playToken !== token) {
              finish();
            } else if (segment.end !== null && audio.currentTime >= segment.end) {
              audio.pause();
              finish();
            }
          }, 20);
        };
        beginPlayback().catch((error) => finish(new Error(`原声播放失败：${error.message || error}`)));
      });
    }

    function speakSentence(rate = currentReplayRate()) {
      if (currentSentenceAudioSegment()) {
        playSentenceAudioAndWait(rate).catch((error) => alert(error.message || error));
        return;
      }
      speakText(getSpeechText(), { rate });
    }

    function speakSentenceAndWait(rate = currentReplayRate()) {
      if (currentSentenceAudioSegment()) return playSentenceAudioAndWait(rate);
      return speakTextAndWait(currentSentence(), { rate });
    }

    async function importSentenceFiles(fileList) {
      const files = Array.from(fileList || []).filter(Boolean);
      if (!files.length) return false;
      const textFile = files.find((file) => /\.(txt|lrc)$/i.test(file.name) || /^text\//i.test(file.type || ""));
      const audioFile = files.find((file) => /^audio\//i.test(file.type || "") || AUDIO_FILE_PATTERN.test(file.name));
      if (!textFile) {
        alert(audioFile ? "请同时选择音频文件和对应的 .lrc 字幕文件。" : "请导入 .txt 或 .lrc 文件，或同时选择音频和 .lrc 字幕。");
        return false;
      }
      if (!audioFile) return importSentenceFile(textFile);
      return applyTimedMaterial(await textFile.text(), audioFile, textFile.name, audioFile.name);
    }

    function applyTimedMaterial(lrcText, audioBlob, subtitleName, audioName) {
      const sentences = parseTimedLrc(lrcText);
      if (!sentences.length) {
        alert("字幕里没有识别到带时间的句子。请使用每行带 [分:秒] 时间标记的 .lrc 文件。");
        return false;
      }
      fillTranslationsFromCache(sentences);
      state.sentences = sentences;
      state.index = 0;
      setCurrentLibrary("音频字幕", `${sentenceSourceLabel(subtitleName, sentences)}，原声：${audioName}`);
      setAudioMaterial(audioBlob, audioName);
      resetCurrent(true);
      closeTopMenus();
      return true;
    }

    // 音频字幕 panel: bundled audio + subtitle materials in assets/audio/. The audio is fetched whole into a Blob
    // because the local Python server does not answer HTTP Range requests, which seeking to each sentence needs.
    const AUDIO_LIBRARY_DEFAULT_ID = "audio-example";
    const AUDIO_LIBRARY_MATERIALS = [
      { id: "audio-example", title: "Audio_Example", audio: "assets/audio/Audio_Example.m4a", subtitles: "assets/audio/Audio_Example.lrc" }
    ];

    function renderAudioLibrary(statusText = "") {
      const currentName = state.audioMaterial?.name || "";
      $("audioLibraryStatus").textContent = statusText || (currentName ? `正在使用：${currentName}` : "当前句库没有使用原声。");
      $("audioLibraryList").innerHTML = AUDIO_LIBRARY_MATERIALS.map((item) => {
        const audioName = item.audio.split("/").pop();
        const subtitleName = item.subtitles.split("/").pop();
        const inUse = currentName === audioName;
        return `<div class="audio-library-item${inUse ? " is-current" : ""}">
          <div class="audio-library-info"><strong>${escapeHtml(item.title)}</strong><span class="small-note">${escapeHtml(audioName)} + ${escapeHtml(subtitleName)}</span></div>
          <button type="button" class="primary" data-audio-library="${escapeHtml(item.id)}" title="加载这份音频和字幕，每句播放原声片段">${inUse ? "重新加载" : "使用"}</button>
        </div>`;
      }).join("");
    }

    async function loadAudioLibraryMaterial(id, { navigate = true } = {}) {
      const material = AUDIO_LIBRARY_MATERIALS.find((item) => item.id === id);
      if (!material) return;
      renderAudioLibrary(`正在加载“${material.title}”…`);
      try {
        const [lrcText, audioBlob] = await Promise.all([
          fetch(material.subtitles).then((response) => {
            if (!response.ok) throw new Error(`字幕 ${material.subtitles}：HTTP ${response.status}`);
            return response.text();
          }),
          fetch(material.audio).then((response) => {
            if (!response.ok) throw new Error(`音频 ${material.audio}：HTTP ${response.status}`);
            return response.blob();
          })
        ]);
        if (applyTimedMaterial(lrcText, audioBlob, material.subtitles.split("/").pop(), material.audio.split("/").pop()) && navigate) {
          closeLibraryModal();
          setActivePage("listenPage");
        }
      } catch (error) {
        alert(`无法加载音频字幕：${error.message || error}`);
        syncCurrentLibrarySelect(state.currentLibraryLabel);
      } finally {
        renderAudioLibrary();
      }
    }

    async function importAudioLibraryFiles(fileList) {
      const files = Array.from(fileList || []);
      const hasText = files.some((file) => /\.lrc$/i.test(file.name));
      const hasAudio = files.some((file) => /^audio\//i.test(file.type || "") || AUDIO_FILE_PATTERN.test(file.name));
      if (!hasText || !hasAudio) {
        alert("请同时选择一个音频文件和对应的 .lrc 字幕文件。");
        return false;
      }
      const imported = await importSentenceFiles(files);
      if (imported) {
        closeLibraryModal();
        setActivePage("listenPage");
      }
      return imported;
    }

    // ---- Free translation with the browser's built-in, on-device Translator API (desktop Chrome/Edge 138+).
    // Only sentences without a translation in 自定义句库 / 音频字幕 are translated, on an explicit button press.
    // Results are cached by English text in localStorage and reused on every later import, so each sentence is
    // translated once per browser.
    const TRANSLATION_CACHE_KEY = "langLSRWTranslationCache";
    let freeTranslationRunning = false;

    function loadTranslationCache() {
      try {
        const data = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || "{}");
        return data && typeof data === "object" ? data : {};
      } catch {
        return {};
      }
    }

    function saveTranslationCache(cache) {
      try {
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
      } catch {
        /* storage full: translations stay in the current session only */
      }
    }

    function translationCacheKey(text) {
      return String(text || "").trim().replace(/\s+/g, " ").toLowerCase();
    }

    function clearTranslationCache() {
      const count = Object.keys(loadTranslationCache()).length;
      if (!count) {
        $("translationCacheStatus").textContent = "翻译缓存是空的。";
        return;
      }
      if (!confirm(`清除本机保存的 ${count} 句翻译？
不影响学习记录和收藏，也不影响已经写进字幕文件的翻译。已载入的句库仍显示原来的翻译，重新载入后生效。`)) return;
      localStorage.removeItem(TRANSLATION_CACHE_KEY);
      $("translationCacheStatus").textContent = `已清除 ${count} 句翻译缓存。`;
    }

    function fillTranslationsFromCache(sentences) {
      const cache = loadTranslationCache();
      sentences.forEach((item) => {
        if (item && typeof item === "object" && !item.translation) {
          const cached = cache[translationCacheKey(item.text)];
          if (cached) item.translation = cached;
        }
      });
    }

    function setFreeTranslationStatus(text) {
      document.querySelectorAll("[data-free-translate-status]").forEach((element) => { element.textContent = text; });
    }

    function updateSourceStatusTranslationCount() {
      const translated = state.sentences.filter((item) => sentenceTranslation(item)).length;
      const status = $("sourceStatus");
      status.textContent = status.textContent.replace(/（(\d+)句，\d+句有翻译）/, `（$1句，${translated}句有翻译）`);
    }

    const FREE_TRANSLATOR_OPTIONS = { sourceLanguage: "en", targetLanguage: "zh" };

    function pendingTranslationSentences() {
      return state.sentences.filter((item) => item && typeof item === "object" && sentenceText(item) && !sentenceTranslation(item));
    }

    function setFreeTranslationBusy(busy) {
      freeTranslationRunning = busy;
      document.querySelectorAll("[data-free-translate], [data-subtitle-translate]").forEach((button) => { button.disabled = busy; });
    }

    // Download messages appear only when the model is not on this device yet (Chrome also reports progress for an
    // already-downloaded model) and only while `canReport()` says the caller still wants status updates.
    async function createFreeTranslator(canReport = () => true) {
      const availability = await Translator.availability(FREE_TRANSLATOR_OPTIONS);
      if (availability === "unavailable") throw new Error("浏览器不支持英语到中文的内置翻译。");
      const downloading = availability !== "available";
      if (downloading && canReport()) setFreeTranslationStatus("首次使用，正在下载翻译模型…");
      return Translator.create({
        ...FREE_TRANSLATOR_OPTIONS,
        monitor(monitor) {
          if (!downloading) return;
          monitor.addEventListener("downloadprogress", (event) => {
            if (canReport()) setFreeTranslationStatus(`正在下载翻译模型 ${Math.round((event.loaded || 0) * 100)}%…`);
          });
        }
      });
    }

    // 中译 / 英译 (non-English learning languages): a one-off switch for the current sentence only. 中译 replaces that
    // sentence's English translation with a Chinese one, translated from the English text by the browser's on-device
    // Translator (en -> zh; English is the translator's pivot language, so this is more faithful than translating the
    // Spanish directly); 英译 switches back. Moving to another sentence returns to English. Nothing is cached: the
    // Chinese text lives only in state.translationChinese and is translated again on the next 中译.
    let chineseTranslatorPromise = null;

    // state.translationChinese = { index, key, text } for the sentence shown in Chinese (text is "" while translating);
    // any other sentence, or an edited translation, clears it.
    function chineseTranslationActive() {
      const shown = state.translationChinese;
      if (!shown) return false;
      if (shown.index !== state.index || shown.key !== translationCacheKey(currentTranslation()) || currentLearningLanguage().id === "en") {
        state.translationChinese = null;
        return false;
      }
      return true;
    }

    // Shows the English text until the Chinese translation arrives.
    function displayedTranslation(text) {
      return text && chineseTranslationActive() && state.translationChinese.text ? state.translationChinese.text : text;
    }

    function chineseTranslationToggle(translation) {
      if (currentLearningLanguage().id === "en" || !translation) return "";
      const active = chineseTranslationActive();
      const pending = active && !state.translationChinese.text;
      const title = pending
        ? "正在用浏览器内置翻译译成中文…"
        : active ? "换回这一句的英文翻译" : "用浏览器内置翻译把这一句的英文翻译换成中文（只对当前句，在本机翻译）";
      return `<button class="translation-edit-button translation-language-button" type="button" data-translation-action="language"${pending ? " disabled" : ""} title="${title}">${active ? "英译" : "中译"}</button>`;
    }

    function toggleChineseTranslation() {
      if (chineseTranslationActive()) {
        state.translationChinese = null;
        renderTarget();
        return;
      }
      if (!("Translator" in window)) {
        alert("当前浏览器不支持内置翻译。请使用电脑版 Chrome 或 Edge（138 或更新版本）。");
        return;
      }
      const english = currentTranslation();
      const shown = { index: state.index, key: translationCacheKey(english), text: "" };
      state.translationChinese = shown;
      renderTarget();
      translateToChinese(shown, english);
    }

    async function translateToChinese(shown, english) {
      let failure = "";
      try {
        chineseTranslatorPromise ||= createFreeTranslator(() => false);
        const translator = await chineseTranslatorPromise;
        shown.text = String(await translator.translate(english) || "").trim();
        if (!shown.text) failure = "没有得到翻译结果。";
      } catch (error) {
        chineseTranslatorPromise = null;
        failure = error.message || String(error);
      }
      if (state.translationChinese !== shown) return;
      if (failure) {
        state.translationChinese = null;
        alert(`中译失败：${failure}`);
      }
      if (!state.translationEditing) renderTarget();
    }

    async function translateSentencesForFree(pending, existingTranslator = null) {
      const translator = existingTranslator || await createFreeTranslator();
      const cache = loadTranslationCache();
      try {
        for (let index = 0; index < pending.length; index += 1) {
          setFreeTranslationStatus(`正在翻译 ${index + 1} / ${pending.length}…`);
          const item = pending[index];
          const text = sentenceText(item);
          const translation = String(await translator.translate(text) || "").trim();
          if (!translation) continue;
          item.translation = translation;
          cache[translationCacheKey(text)] = translation;
          if (index % 20 === 19) saveTranslationCache(cache);
        }
      } finally {
        saveTranslationCache(cache);
        translator.destroy?.();
      }
    }

    async function translateCurrentLibraryForFree() {
      if (freeTranslationRunning) return;
      if (!["自定义句库", "音频字幕"].includes(state.currentLibraryLabel)) {
        alert("只能翻译自定义句库或音频字幕中的句子。");
        return;
      }
      if (!("Translator" in window)) {
        alert("当前浏览器不支持内置翻译。请使用电脑版 Chrome 或 Edge（138 或更新版本）。");
        return;
      }
      const pending = pendingTranslationSentences();
      if (!pending.length) {
        setFreeTranslationStatus("当前句库的句子都已有翻译。");
        return;
      }
      setFreeTranslationBusy(true);
      try {
        await translateSentencesForFree(pending);
        updateSourceStatusTranslationCount();
        renderTarget();
        setFreeTranslationStatus(`已翻译 ${pending.length} 句（浏览器内置翻译，结果已保存在本机）。`);
      } catch (error) {
        setFreeTranslationStatus(`翻译失败：${error.message || error}`);
      } finally {
        setFreeTranslationBusy(false);
      }
    }

    // Inserts each sentence's translation into the original LRC text as a Chinese line with the same timestamp,
    // right after the English line where the sentence starts. Merged sentences therefore get one translation line
    // after their first fragment, which parseTimedLrc() attaches back to the whole sentence. Sentences that already
    // have a Chinese line at their start time in the file are left alone.
    function buildBilingualLrc(lrcText, sentences) {
      const offsetMatch = lrcText.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/im);
      const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
      const lines = lrcText.split(/\r?\n/);
      const lineTime = (stamp) => Math.max(0, parseLrcTime(stamp) - offset).toFixed(3);
      const translatedTimes = new Set();
      lines.forEach((line) => {
        const content = cleanLrcLine(line);
        const stamp = line.match(/\[(\d{1,3}:\d{2}(?:[.:]\d{1,3})?)\]/);
        if (stamp && isTranslationOnlyLine(content)) translatedTimes.add(lineTime(stamp[1]));
      });
      const pendingByTime = new Map();
      sentences.forEach((item) => {
        const translation = sentenceTranslation(item);
        if (!translation || !Number.isFinite(item?.start)) return;
        const key = item.start.toFixed(3);
        if (!translatedTimes.has(key) && !pendingByTime.has(key)) pendingByTime.set(key, translation);
      });
      const output = [];
      let inserted = 0;
      lines.forEach((line) => {
        output.push(line);
        const trimmed = line.trim();
        if (!trimmed || /^\[(ti|ar|al|by|offset|length|re):/i.test(trimmed)) return;
        const stamp = trimmed.match(/\[(\d{1,3}:\d{2}(?:[.:]\d{1,3})?)\]/);
        const content = cleanLrcLine(trimmed);
        if (!stamp || !content || isTranslationOnlyLine(content)) return;
        const key = lineTime(stamp[1]);
        const translation = pendingByTime.get(key);
        if (!translation) return;
        output.push(`[${stamp[1]}]${translation}`);
        pendingByTime.delete(key);
        inserted += 1;
      });
      return { text: output.join(lrcText.includes("\r\n") ? "\r\n" : "\n"), inserted };
    }

    function downloadTextFile(text, filename) {
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // 翻译字幕: pick any timed .lrc (it does not need to be loaded), translate its missing sentences for free, and
    // write a bilingual version back to the same file. Browsers only allow writing to a file after a user gesture,
    // and translation can take a while, so writing is a second click ("写入原文件") once the translation is ready.
    // Browsers without the File System Access API get a same-named download instead.
    let pendingSubtitleWrite = null;

    function pickFileWithInput(accept) {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
        input.addEventListener("cancel", () => resolve(null), { once: true });
        input.click();
      });
    }

    function setSubtitleWriteButton(job) {
      document.querySelectorAll("[data-subtitle-write]").forEach((button) => {
        button.hidden = !job;
        if (job) button.textContent = job.handle ? "写入原文件" : "下载双语字幕";
      });
      // Without the save dialog, 另存 would be the same download as the first button, so it is only offered with it.
      document.querySelectorAll("[data-subtitle-save-as]").forEach((button) => {
        button.hidden = !job || !("showSaveFilePicker" in window);
      });
    }

    function bilingualSubtitleName(name) {
      const base = String(name || "subtitles.lrc").replace(/\.lrc$/i, "");
      return `${base}_双语.lrc`;
    }

    async function translateSubtitleFile() {
      if (freeTranslationRunning) return;
      pendingSubtitleWrite = null;
      setSubtitleWriteButton(null);
      // Start creating the translator inside the click: downloading the model on first use needs the user gesture.
      // If the learner cancels, stop reporting its progress, clear the status, and release the translator.
      let reporting = true;
      const translatorPromise = "Translator" in window ? createFreeTranslator(() => reporting) : null;
      translatorPromise?.catch(() => {});
      const abandon = () => {
        reporting = false;
        translatorPromise?.then((translator) => translator.destroy?.()).catch(() => {});
        setFreeTranslationStatus("");
      };
      let handle = null;
      let file = null;
      try {
        if ("showOpenFilePicker" in window) {
          [handle] = await window.showOpenFilePicker({ types: [{ description: "LRC 字幕", accept: { "text/plain": [".lrc"] } }] });
          file = await handle.getFile();
        } else {
          file = await pickFileWithInput(".lrc");
        }
      } catch (error) {
        abandon();
        if (error?.name !== "AbortError") alert(`无法打开字幕文件：${error.message || error}`);
        return;
      }
      if (!file) {
        abandon();
        return;
      }
      const original = await file.text();
      const sentences = parseTimedLrc(original);
      if (!sentences.length) {
        abandon();
        alert("字幕里没有识别到带时间的句子。请使用每行带 [分:秒] 时间标记的 .lrc 文件。");
        return;
      }
      fillTranslationsFromCache(sentences);
      const pending = sentences.filter((item) => !item.translation);
      setFreeTranslationBusy(true);
      try {
        if (pending.length) {
          if (!translatorPromise) throw new Error("当前浏览器不支持内置翻译。请使用电脑版 Chrome 或 Edge（138 或更新版本）。");
          await translateSentencesForFree(pending, await translatorPromise);
        } else {
          translatorPromise?.then((translator) => translator.destroy?.()).catch(() => {});
        }
        const { text, inserted } = buildBilingualLrc(original, sentences);
        if (!inserted) {
          setFreeTranslationStatus(`${file.name} 已经是双语字幕，没有需要写入的翻译。`);
          return;
        }
        pendingSubtitleWrite = { handle, name: file.name, text, inserted };
        setSubtitleWriteButton(pendingSubtitleWrite);
        setFreeTranslationStatus(`${file.name}：已翻译 ${inserted} 句，点“${handle ? "写入原文件" : "下载双语字幕"}”${"showSaveFilePicker" in window ? "或“另存字幕文件”" : ""}保存为双语字幕。`);
      } catch (error) {
        setFreeTranslationStatus(`翻译字幕失败：${error.message || error}`);
      } finally {
        setFreeTranslationBusy(false);
      }
    }

    async function writePendingSubtitle() {
      const job = pendingSubtitleWrite;
      if (!job) return;
      try {
        if (job.handle) {
          const permission = await job.handle.requestPermission({ mode: "readwrite" });
          if (permission !== "granted") throw new Error("没有获得写入这个文件的权限。");
          const writable = await job.handle.createWritable();
          await writable.write(job.text);
          await writable.close();
          setFreeTranslationStatus(`已写入 ${job.inserted} 句翻译，${job.name} 已是双语字幕。`);
        } else {
          downloadTextFile(job.text, job.name);
          setFreeTranslationStatus(`已下载双语字幕 ${job.name}，用它替换原文件即可。`);
        }
        pendingSubtitleWrite = null;
        setSubtitleWriteButton(null);
      } catch (error) {
        setFreeTranslationStatus(`写入失败：${error.message || error}`);
      }
    }

    // Saves the bilingual subtitle to a new file chosen in the save dialog, leaving the original subtitle unchanged.
    async function savePendingSubtitleAs() {
      const job = pendingSubtitleWrite;
      if (!job || !("showSaveFilePicker" in window)) return;
      try {
        const target = await window.showSaveFilePicker({
          suggestedName: bilingualSubtitleName(job.name),
          types: [{ description: "LRC 字幕", accept: { "text/plain": [".lrc"] } }]
        });
        const writable = await target.createWritable();
        await writable.write(job.text);
        await writable.close();
        setFreeTranslationStatus(`已另存双语字幕 ${target.name}（${job.inserted} 句翻译），原字幕 ${job.name} 未改动。`);
        pendingSubtitleWrite = null;
        setSubtitleWriteButton(null);
      } catch (error) {
        if (error?.name !== "AbortError") setFreeTranslationStatus(`另存失败：${error.message || error}`);
      }
    }

    async function importSentenceFile(file) {
      if (!file) return false;
      if (!/\.(txt|lrc)$/i.test(file.name) && !/^text\//i.test(file.type || "")) {
        alert("请导入 .txt 或 .lrc 文件。");
        return false;
      }
      const text = await file.text();
      const sentences = parseSentences(text, file.name);
      if (!sentences.length) {
        alert("没有识别到可练习的句子。");
        return false;
      }
      fillTranslationsFromCache(sentences);
      state.sentences = sentences;
      state.index = 0;
      setCurrentLibrary("自定义句库", sentenceSourceLabel(file.name, sentences));
      resetCurrent(true);
      closeTopMenus();
      return true;
    }

    async function tryLoadDefaultLibrary() {
      const lastPosition = loadLastPosition();
      await loadCommonLibrary();
      if (lastPosition && lastPosition.libraryLabel === "用户收藏" && currentLearningLanguage().sentenceFavoritesEnabled) {
        const favorites = loadUserSentences();
        if (favorites.length) {
          state.sentences = normalizeSentenceList(favorites.map((item) => ({
            id: item.sourceId || "",
            libraryId: item.libraryId || "",
            sentence: item.sentence,
            translation: item.translation
          })));
          state.index = Number.isInteger(lastPosition.index) && lastPosition.index >= 0 && lastPosition.index < state.sentences.length
            ? lastPosition.index
            : 0;
          setCurrentLibrary("用户收藏", `当前句库：用户收藏（${state.sentences.length.toLocaleString()}句）`);
          render();
          return;
        }
      }
      if (!state.library.items.length || !state.library.manifest) return;
      state.sentences = normalizeSentenceList(state.library.items);
      state.index = (lastPosition && lastPosition.libraryLabel === "常用句库"
        && Number.isInteger(lastPosition.index) && lastPosition.index >= 0 && lastPosition.index < state.sentences.length)
        ? lastPosition.index
        : 0;
      setCurrentLibrary("常用句库", `当前句库：${state.library.manifest.name}（${state.sentences.length.toLocaleString()}句）`);
      render();
    }

    function currentSentence() {
      return sentenceText(state.sentences[state.index]);
    }

    function currentTranslation() {
      return sentenceTranslation(state.sentences[state.index]);
    }

    function beginTranslationEdit() {
      state.translationEditing = true;
      state.translationDraft = currentTranslation();
      renderTarget();
      const editor = $("translationInlineInput");
      if (editor) {
        editor.focus();
        editor.select();
      }
    }

    function cancelTranslationEdit() {
      state.translationEditing = false;
      state.translationDraft = "";
      renderTarget();
      scheduleCloudSync();
    }

    function saveCurrentTranslation() {
      const item = normalizeSentenceItem(state.sentences[state.index]);
      item.translation = state.translationDraft.trim();
      state.sentences[state.index] = item;
      state.translationEditing = false;
      state.translationDraft = "";
      renderTarget();
    }

    function currentGrammar() {
      const item = sentenceWithCachedGrammar(state.sentences[state.index]);
      state.sentences[state.index] = item;
      return item.grammar;
    }

    function currentGrammarRaw() {
      currentGrammar();
      return sentenceGrammarRaw(state.sentences[state.index]);
    }

    function openAiTextModal(title, text) {
      $("aiTextModalTitle").textContent = title;
      $("aiTextModalBody").value = text;
      $("aiTextModal").hidden = false;
      setTimeout(() => {
        $("aiTextModalBody").focus();
        $("aiTextModalBody").select();
      }, 0);
    }

    function closeAiTextModal() {
      $("aiTextModal").hidden = true;
    }

    async function copyAiText() {
      const text = $("aiTextModalBody").value;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        $("copyAiTextBtn").textContent = "已复制";
        setTimeout(() => {
          $("copyAiTextBtn").textContent = "复制";
        }, 1200);
      } catch {
        $("aiTextModalBody").focus();
        $("aiTextModalBody").select();
      }
    }

    function formatAiResponseForDisplay(text) {
      const raw = String(text || "").trim();
      if (!raw) return "";
      const jsonText = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      try {
        return JSON.stringify(JSON.parse(jsonText), null, 2);
      } catch {
        return raw;
      }
    }

    function showCurrentAiResponse() {
      const raw = currentGrammarRaw();
      if (!raw) {
        alert("当前句还没有 Ai 语法分析回复。");
        return;
      }
      openAiTextModal("Ai回复", formatAiResponseForDisplay(raw));
    }

    function showCurrentAiPrompt() {
      const sentence = currentSentence();
      if (!sentence) {
        alert("当前没有可分析的句子。");
        return;
      }
      openAiTextModal("Ai询问", buildGrammarPrompt(sentence, currentTranslation()));
    }

    // The "analysing" placeholder belongs to the sentence being analysed, not to whichever sentence is current.
    function isAnalysingCurrentSentence() {
      return state.grammarLoading && state.sentences === state.grammarLoadingSentences && state.index === state.grammarLoadingIndex;
    }

    function renderGrammarAnalysis() {
      if (isAnalysingCurrentSentence()) {
        return '<div class="grammar-panel is-loading">正在分析语法...</div>';
      }
      if (!state.grammarVisible) return "";
      const grammar = currentGrammar();
      if (!grammar) return '<div class="grammar-panel grammar-visual"><div class="grammar-toolbar"><div class="grammar-pattern"><span>句子成分</span></div></div><div class="grammar-empty">当前体系暂无分析</div></div>';
      const parsed = parseGrammarAnalysis(grammar);
      if (!parsed) return `<div class="grammar-panel">${escapeHtml(grammar).replace(/\n/g, "<br>")}</div>`;
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const nodeHtml = renderGrammarNodes(nodes);
      const explanation = Array.isArray(parsed.explanation) ? parsed.explanation : [];
      const explanationHtml = explanation.length
        ? `<ul class="grammar-points">${explanation.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`
        : "";
      const pattern = String(parsed.pattern || "")
        .trim()
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/\s*\+\s*/g, " + ");
      const provenance = grammarAnalysisProvenance(parsed);
      const analysisLabel = `句子成分${provenance.legacy ? " · 旧版" : ""}${parsed.status === "partial" ? " · 部分分析" : ""}`;
      const patternHtml = pattern
        ? `<div class="grammar-pattern"><span title="${escapeHtml(provenance.label)}">${analysisLabel}</span><span aria-hidden="true">·</span><strong>${escapeHtml(pattern)}</strong></div>`
        : `<div class="grammar-pattern"><span title="${escapeHtml(provenance.label)}">${analysisLabel}</span></div>`;
      const levels = [["main", "主干"], ["level1", "一级"], ["all", "全部"]];
      const levelControls = levels.map(([value, label]) => `
        <button type="button" class="grammar-level-btn ${state.grammarExpansionMode === value ? "is-active" : ""}"
          data-grammar-level="${value}" aria-pressed="${state.grammarExpansionMode === value}">${label}</button>
      `).join("");
      return `
        <div class="grammar-panel grammar-visual">
          <div class="grammar-toolbar">
            ${patternHtml}
            <div class="grammar-levels" role="group" aria-label="语法节点展开层级">${levelControls}</div>
          </div>
          <div class="grammar-nodes">${nodeHtml}</div>
          ${explanationHtml}
        </div>
      `;
    }

    function normalizeGrammarNodes(nodes) {
      if (!Array.isArray(nodes)) return [];
      return nodes
        .map((node, index) => ({
          id: Number(node.id),
          parent: Number(node.parent || 0),
          role: String(node.role || "其他").trim() || "其他",
          type: typeof node.type === "string" ? node.type.trim() : "",
          text: String(node.text || "").trim(),
          note: String(node.note || "").trim(),
          order: index
        }))
        .filter((node) => Number.isFinite(node.id) && node.id > 0 && node.text);
    }

    function renderGrammarNodes(nodes) {
      const normalized = normalizeGrammarNodes(nodes);
      if (!normalized.length) return "";
      const byParent = new Map();
      normalized.forEach((node) => {
        const parent = normalized.some((item) => item.id === node.parent) ? node.parent : 0;
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push(node);
      });
      byParent.forEach((items) => items.sort((a, b) => a.order - b.order));
      const renderNode = (node, depth = 0) => {
        const roleType = grammarRoleType(node.role);
        const isPunctuationNode = /^[\p{P}\s]+$/u.test(node.text || "");
        const isClauseNode = /从句/.test(node.type || "");
        const label = isPunctuationNode ? "" : [node.role, node.type].filter(Boolean).join(" · ");
        const children = byParent.get(node.id) || [];
        const isExpanded = children.length && state.grammarExpandedNodeIds.has(node.id);
        const details = [node.note].filter(Boolean);
        const content = `
          ${label ? `<span class="grammar-role">${escapeHtml(label)}</span>` : ""}
          <span class="grammar-text">${escapeHtml(node.text)}</span>
        `;
        return `
          <div class="grammar-node grammar-${roleType} ${children.length ? "has-children" : ""} ${isExpanded ? "is-expanded" : ""} ${isClauseNode ? "is-clause" : ""}" data-grammar-node-id="${node.id}" data-depth="${depth}">
            <div class="grammar-node-heading">
              ${children.length
                ? `<button type="button" class="grammar-node-content" data-grammar-toggle="${node.id}" aria-expanded="${Boolean(isExpanded)}" aria-label="${isExpanded ? "收起" : "展开"}${escapeHtml(node.text)}">${content}</button>`
                : `<div class="grammar-node-content">${content}</div>`}
            </div>
            ${details.length
              ? `<div class="grammar-node-details">${node.note ? `<span>${escapeHtml(node.note)}</span>` : ""}</div>`
              : ""}
            ${isExpanded ? `<div class="grammar-node-children">${children.map((child) => renderNode(child, depth + 1)).join("")}</div>` : ""}
          </div>
        `;
      };
      return (byParent.get(0) || normalized.filter((node) => node.parent === 0)).map(renderNode).join("");
    }

    function setGrammarExpansion(mode) {
      const parsed = parseGrammarAnalysis(currentGrammar());
      const nodes = normalizeGrammarNodes(parsed?.nodes);
      const parentIds = new Set(nodes.map((node) => node.parent).filter((id) => id > 0));
      const next = new Set();
      if (mode === "level1") {
        nodes.filter((node) => node.parent === 0 && parentIds.has(node.id)).forEach((node) => next.add(node.id));
      } else if (mode === "all") {
        parentIds.forEach((id) => next.add(id));
      }
      state.grammarExpansionMode = mode;
      state.grammarExpandedNodeIds = next;
      renderTarget();
    }

    function collectGrammarDescendantIds(nodeId, nodes) {
      const result = new Set();
      const stack = [nodeId];
      while (stack.length) {
        const current = stack.pop();
        nodes.forEach((node) => {
          if (node.parent === current) {
            result.add(node.id);
            stack.push(node.id);
          }
        });
      }
      return result;
    }

    function resetGrammarInteraction() {
      state.grammarExpansionMode = "main";
      state.grammarExpandedNodeIds = new Set();
    }

    function parseGrammarAnalysis(text) {
      const raw = String(text || "").trim();
      if (!raw) return null;
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start < 0 || end <= start) return null;
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (!parsed) return null;
        if (Array.isArray(parsed.nodes)) return parsed;
        if (Array.isArray(parsed.chunks)) {
          return {
            pattern: parsed.pattern || "",
            nodes: parsed.chunks.map((chunk, index) => ({
              id: index + 1,
              text: chunk.text,
              role: chunk.role,
              parent: 0,
              note: chunk.note
            })),
            explanation: parsed.explanation || []
          };
        }
        return null;
      } catch {
        return null;
      }
    }

    function grammarAnalysisProvenance(parsed) {
      const convention = typeof parsed?.convention === "string" ? parsed.convention : "";
      const schemaVersion = Number.isInteger(parsed?.schemaVersion) ? parsed.schemaVersion : null;
      if (!convention || !schemaVersion) return { legacy: true, label: "旧版分析：未记录分析规范或数据版本" };
      return { legacy: false, label: `分析规范：${convention}；数据版本：${schemaVersion}` };
    }

    function grammarRoleType(role) {
      const text = String(role || "");
      const traditionalRoles = {
        "主语": "subject", "谓语": "predicate", "宾语": "object",
        "表语": "predicative", "补语": "complement", "定语": "attribute",
        "状语": "adverbial", "同位语": "appositive", "中心语": "head", "其他": "other"
      };
      if (Object.prototype.hasOwnProperty.call(traditionalRoles, text)) return traditionalRoles[text];
      const conventionRoles = {
        "述语补足语": "predicative", "补足语": "complement",
        "修饰语": "attribute", "附加语": "adverbial",
        "限定语": "attribute",
        "标记语": "connector", "并列项": "clause", "补充语": "appositive", "未定": "other"
      };
      if (Object.prototype.hasOwnProperty.call(conventionRoles, text)) return conventionRoles[text];
      if (text.includes("主语")) return "subject";
      if (text.includes("谓语")) return "predicate";
      if (text.includes("宾语")) return "object";
      if (text.includes("表语")) return "predicative";
      if (text.includes("补语")) return "complement";
      if (text.includes("定语")) return "attribute";
      if (text.includes("状语")) return "adverbial";
      if (text.includes("同位语")) return "appositive";
      if (text.includes("介词")) return "prep";
      if (text.includes("从句")) return "clause";
      if (text.includes("连接")) return "connector";
      return "other";
    }

    function chatCompletionContent(data) {
      return data?.choices?.[0]?.message?.content
        || data?.choices?.[0]?.text
        || data?.output_text
        || "";
    }

    async function analyzeCurrentGrammar({ force = false } = {}) {
      if (state.grammarLoading || !currentLearningLanguage().grammarAnalysisEnabled) return;
      const sentence = currentSentence();
      if (!sentence) return;
      const cachedGrammar = currentGrammar();
      if (cachedGrammar && !force) {
        state.grammarVisible = true;
        renderTarget();
        $("sourceStatus").textContent = "当前句已有 Ai 语法分析，已使用缓存。";
        return;
      }
      const settings = mergedAiSettings();
      if (!settings.apiKey) {
        alert("请先在“设置”的“AI 接口”中填写并保存 API Key。");
        return;
      }
      // Remember the analysed sentence: the learner (or 全文 reading) may move on while the request is running.
      const analysedIndex = state.index;
      const analysedSentences = state.sentences;
      state.grammarLoading = true;
      state.grammarLoadingIndex = analysedIndex;
      state.grammarLoadingSentences = analysedSentences;
      state.grammarVisible = true;
      renderTarget();
      let finishedOk = false;
      $("analyzeGrammarBtn").disabled = true;
      $("analyzeGrammarBtn").textContent = "分析中";
      try {
        const baseUrl = settings.baseUrl.replace(/\/+$/, "");
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              { role: "system", content: "你是专业、严谨、简洁的英语语法老师。" },
              { role: "user", content: buildGrammarPrompt(sentence, currentTranslation()) }
            ]
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP ${response.status}`);
        }
        const data = await response.json();
        const content = chatCompletionContent(data).trim();
        if (!content) throw new Error("AI 没有返回语法分析内容。");
        if (sentenceText(analysedSentences[analysedIndex]) === sentence) {
          const item = normalizeSentenceItem(analysedSentences[analysedIndex]);
          item.grammar = content;
          item.grammarRaw = content;
          analysedSentences[analysedIndex] = item;
        }
        saveGrammarCache(sentence, content, content);
        scheduleCloudSync();
        finishedOk = true;
        $("sourceStatus").textContent = force
          ? "当前句已重新分析并更新缓存。"
          : "当前句语法分析已保存。";
      } catch (error) {
        if (state.sentences === analysedSentences && state.index === analysedIndex) state.grammarVisible = Boolean(cachedGrammar);
        alert(`语法分析失败：${error.message || error}`);
      } finally {
        state.grammarLoading = false;
        state.grammarLoadingIndex = -1;
        state.grammarLoadingSentences = null;
        $("analyzeGrammarBtn").disabled = false;
        $("analyzeGrammarBtn").textContent = "Ai语法分析";
        // A finished analysis stops 全文 reading and returns to the analysed sentence to show the result,
        // unless the library has been switched in the meantime.
        if (finishedOk) stopFullTextReading();
        if (finishedOk && state.sentences === analysedSentences && state.index !== analysedIndex) {
          state.index = analysedIndex;
          saveLastPosition();
          resetCurrent(false);
        }
        if (finishedOk && state.sentences === analysedSentences) state.grammarVisible = true;
        renderTarget();
      }
    }

    function closeGrammarContextMenu() {
      const menu = $("grammarContextMenu");
      menu.hidden = true;
    }

    function openGrammarContextMenu(event) {
      event.preventDefault();
      if (state.grammarLoading || !currentSentence()) return;
      closeTopMenus();
      const menu = $("grammarContextMenu");
      const buttonRect = $("analyzeGrammarBtn").getBoundingClientRect();
      menu.hidden = false;
      const menuRect = menu.getBoundingClientRect();
      const requestedX = event.clientX || buttonRect.left;
      const requestedY = event.clientY || buttonRect.bottom;
      menu.style.left = `${Math.max(8, Math.min(requestedX, window.innerWidth - menuRect.width - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(requestedY, window.innerHeight - menuRect.height - 8))}px`;
      $("traditionalGrammarMenuBtn").focus();
    }

    function sentenceSourceLabel(name, sentences) {
      const translated = normalizeSentenceList(sentences).filter((item) => item.translation).length;
      return `当前句库：${name}（${sentences.length}句，${translated}句有翻译）`;
    }

    // Settings belong to the identity (settings records) and are not kept in browser storage. The AI API key is
    // per identity too but stays on this device (localSecrets: never exported or synced).
    const IDENTITY_SETTING_NAMES = ["theme", "shortcuts", "speech", "fonts", "grammarColors", "dictionaryAutoSpeak", "practice"];

    function persistSetting(name, value) {
      if (!userData.identity) return;
      userData.put("settings", name, value, "global");
      scheduleCloudSync();
    }

    // What a new identity starts with.
    function defaultSettingValue(name) {
      return {
        theme: "eye",
        shortcuts: { ...defaultShortcuts },
        speech: {},
        fonts: fontDefaults(),
        grammarColors: grammarColorDefaults(),
        dictionaryAutoSpeak: "1",
        practice: { wordGroupSize: 20, sentenceGroupSize: 20 }
      }[name];
    }

    // Applies the open identity's settings; missing ones start from the defaults.
    function applyIdentitySettings() {
      const saved = (name) => userData.get("settings", name, "global");
      // A new identity learns English.
      if (!LEARNING_LANGUAGES[saved("learningLanguage")]) userData.put("settings", "learningLanguage", "en", "global");
      setLearningLanguage(saved("learningLanguage"), { persist: false, reloadLibrary: false });
      IDENTITY_SETTING_NAMES.forEach((name) => {
        if (saved(name) === undefined) userData.put("settings", name, defaultSettingValue(name), "global");
      });
      applyTheme(saved("theme"), { persist: false });
      state.shortcuts = { ...defaultShortcuts, ...(saved("shortcuts") || {}) };
      state.speechSettings = { ...(saved("speech") || {}) };
      applyFontSettings(saved("fonts"), { persist: false });
      applyGrammarColors(saved("grammarColors"), { persist: false });
      state.aiSettings = { ...(saved("ai") || {}), apiKey: String(userData.get("localSecrets", "aiApiKey", "global") || "") };
      loadAiSettings();
      loadPracticeSettings();
      document.querySelectorAll("[data-dictionary-auto-speak]").forEach((checkbox) => {
        checkbox.checked = dictionaryAutoSpeakEnabled();
      });
      loadSpeechSettings();
      populateVoices();
      renderShortcutSettings();
      updateSpeechRateIndicator();
    }

    // 练习 settings: how many new words / sentences one practice round adds (also the size of a new-word group).
    function practiceGroupSize(kind) {
      const value = Number(userData.get("settings", "practice", "global")?.[kind]);
      return Number.isInteger(value) && value >= 5 && value <= 100 ? value : 20;
    }

    function loadPracticeSettings() {
      $("wordGroupSizeInput").value = practiceGroupSize("wordGroupSize");
      $("sentenceGroupSizeInput").value = practiceGroupSize("sentenceGroupSize");
    }

    function savePracticeSettings() {
      const read = (id) => Math.max(5, Math.min(100, Math.round(Number($(id).value) || 20)));
      persistSetting("practice", { wordGroupSize: read("wordGroupSizeInput"), sentenceGroupSize: read("sentenceGroupSizeInput") });
      loadPracticeSettings();
    }

    function saveSpeechSettings() {
      const languageId = state.learningLanguageId || "en";
      const voiceKey = voiceSettingKey();
      const settings = {
        ...state.speechSettings,
        accent: languageId === "en" && !usingOriginalVoice() ? ttsAccent() : (state.speechSettings.accent || "en-GB"),
        ...(languageId === "en" || usingOriginalVoice() ? {} : { [`accent_${languageId}`]: ttsAccent() }),
        [voiceKey]: usingOriginalVoice() ? (state.speechSettings[voiceKey] || "") : $("voiceSelect").value,
        autoSpeak: $("autoSpeakToggle").checked,
        displayMode: sourceDisplayMode(),
        speakWord: $("speakWordToggle").checked,
        showSource: $("showSourceToggle").checked,
        showTranslation: $("showTranslationToggle").checked
      };
      state.speechSettings = settings;
      persistSetting("speech", settings);
    }

    function saveShortcuts() {
      persistSetting("shortcuts", state.shortcuts);
    }

    function aiDefaults() {
      return {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-5.6-luna",
        apiKey: ""
      };
    }

    function mergedAiSettings() {
      return { ...aiDefaults(), ...state.aiSettings };
    }

    function loadAiSettings() {
      const settings = mergedAiSettings();
      $("aiBaseUrlInput").value = settings.baseUrl;
      $("aiModelInput").value = settings.model;
      $("aiApiKeyInput").value = settings.apiKey;
    }

    function saveAiSettings() {
      const settings = {
        baseUrl: $("aiBaseUrlInput").value.trim() || aiDefaults().baseUrl,
        model: $("aiModelInput").value.trim() || aiDefaults().model,
        apiKey: $("aiApiKeyInput").value.trim()
      };
      state.aiSettings = settings;
      persistSetting("ai", { baseUrl: settings.baseUrl, model: settings.model });
      if (userData.identity) userData.put("localSecrets", "aiApiKey", settings.apiKey, "global");
      $("aiSettingsStatus").textContent = "AI 设置已保存。";
    }

    function formatBytes(bytes) {
      const value = Number(bytes) || 0;
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    let dictionaryBusyId = "";
    const dictionaryStatusResults = new Map();

    function dictionaryPackageLabel(item) {
      const pkg = item?.package || item;
      const languageLabel = pkg?.languageId === "es" ? "西班牙语" : "英语";
      return `${pkg?.label || languageLabel} · ${item?.manifest?.name || pkg?.id || "词典"}`;
    }

    function dictionaryStatusText(item) {
      if (item?.error) return `词典不可用：${item.error.message || item.error}`;
      const installed = Boolean(item?.installed);
      const manifest = item?.manifest;
      const metadata = item?.metadata;
      if (installed) {
        const count = Number(metadata?.entry_count || manifest?.entryCount || 0).toLocaleString();
        return `已安装 · ${count} 词条 · v${metadata?.dictionary_version || manifest?.version || "未知"}`;
      }
      if (manifest) {
        return `未安装 · ${Number(manifest.entryCount).toLocaleString()} 词条 · 下载 ${formatBytes(manifest.downloadBytes || manifest.databaseBytes)} · 本地 ${formatBytes(manifest.databaseBytes)}`;
      }
      return "本地词典尚未准备好。";
    }

    function renderDictionarySettings(results = [...dictionaryStatusResults.values()]) {
      const list = $("dictionarySettingsList");
      if (!window.langLSRWDictionary) {
        list.innerHTML = '<div class="dictionary-status">本地词典服务不可用。</div>';
        return;
      }
      const byId = new Map(results.map((item) => [item.package?.id, item]));
      const packages = window.langLSRWDictionary.listPackages();
      list.innerHTML = packages.map((pkg) => {
        const item = byId.get(pkg.id) || dictionaryStatusResults.get(pkg.id) || { package: pkg };
        const installed = Boolean(item.installed);
        const busy = Boolean(dictionaryBusyId);
        const installLabel = installed ? (item.updateAvailable ? "更新" : "重装") : "安装";
        const testWord = pkg.testWord || "dictionary";
        return `
          <div class="dictionary-settings-card" data-dictionary-card="${escapeHtml(pkg.id)}">
            <div class="dictionary-settings-head">
              <div class="dictionary-settings-name">${escapeHtml(item.manifest?.name || pkg.id)}</div>
              <div class="dictionary-settings-lang">${escapeHtml(pkg.label || pkg.languageId)}</div>
            </div>
            <div class="dictionary-status" data-dictionary-status>${escapeHtml(dictionaryStatusText(item))}</div>
            <progress class="dictionary-install-progress" data-dictionary-progress max="100" value="0" hidden></progress>
            <div class="dictionary-settings-actions">
              <button type="button" data-dictionary-action="install" data-dictionary-id="${escapeHtml(pkg.id)}" title="${escapeHtml(installLabel)} ${escapeHtml(dictionaryPackageLabel(item))}" ${busy ? "disabled" : ""}>${installLabel}</button>
              <button type="button" data-dictionary-action="test" data-dictionary-id="${escapeHtml(pkg.id)}" title="查询测试词：${escapeHtml(testWord)}" ${busy || !installed ? "disabled" : ""}>测试</button>
              <button type="button" data-dictionary-action="remove" data-dictionary-id="${escapeHtml(pkg.id)}" title="删除当前浏览器中安装的${escapeHtml(item.manifest?.name || pkg.id)}" ${busy || !installed ? "disabled" : ""}>删除</button>
            </div>
            <div class="small-note" data-dictionary-test-result></div>
          </div>`;
      }).join("");
    }

    async function refreshDictionaryStatus() {
      if (!window.langLSRWDictionary) return;
      renderDictionarySettings();
      const results = await window.langLSRWDictionary.statuses();
      dictionaryStatusResults.clear();
      results.forEach((item) => dictionaryStatusResults.set(item.package?.id, item));
      renderDictionarySettings(results);
    }

    function dictionaryCard(dictionaryId) {
      return document.querySelector(`[data-dictionary-card="${CSS.escape(dictionaryId)}"]`);
    }

    function setDictionaryCardMessage(dictionaryId, message) {
      const card = dictionaryCard(dictionaryId);
      const status = card?.querySelector("[data-dictionary-status]");
      if (status) status.textContent = message;
    }

    async function installDictionary(dictionaryId = "ecdict") {
      if (!window.langLSRWDictionary || dictionaryBusyId) return;
      const pkg = window.langLSRWDictionary.dictionary(dictionaryId);
      const card = dictionaryCard(dictionaryId);
      const progress = card?.querySelector("[data-dictionary-progress]");
      const result = card?.querySelector("[data-dictionary-test-result]");
      if (progress) {
        progress.hidden = false;
        progress.value = 0;
      }
      if (result) result.textContent = "";
      dictionaryBusyId = dictionaryId;
      renderDictionarySettings();
      const stopProgress = window.langLSRWDictionary.onProgress(({ dictionaryId: progressId, received, total }) => {
        if (progressId !== dictionaryId) return;
        const currentProgress = dictionaryCard(dictionaryId)?.querySelector("[data-dictionary-progress]");
        if (currentProgress) {
          currentProgress.hidden = false;
          currentProgress.max = total || Math.max(received, 1);
          currentProgress.value = received;
        }
        setDictionaryCardMessage(dictionaryId, total
          ? `正在安装：${formatBytes(received)} / ${formatBytes(total)}`
          : `正在安装：${formatBytes(received)}`);
      });
      try {
        await window.langLSRWDictionary.install(dictionaryId);
        await refreshDictionaryStatus();
      } catch (error) {
        setDictionaryCardMessage(dictionaryId, `安装失败：${error.message || error}`);
      } finally {
        stopProgress();
        dictionaryBusyId = "";
        await refreshDictionaryStatus();
      }
    }

    async function testDictionary(dictionaryId = "ecdict") {
      const pkg = window.langLSRWDictionary?.dictionary(dictionaryId);
      const testWord = pkg?.testWord || "dictionary";
      const resultBox = dictionaryCard(dictionaryId)?.querySelector("[data-dictionary-test-result]");
      if (resultBox) resultBox.textContent = `正在查询 ${testWord}...`;
      try {
        const result = await window.langLSRWDictionary.query(testWord, dictionaryId);
        if (resultBox) {
          resultBox.textContent = result
            ? `${result.word} ${result.phonetic ? `[${result.phonetic}] ` : ""}${String(result.translation || result.definition || "").split("\n")[0]}`
            : `未找到 ${testWord}。`;
        }
      } catch (error) {
        if (resultBox) resultBox.textContent = `查询失败：${error.message || error}`;
      }
    }

    function currentLearningLanguage() {
      return LEARNING_LANGUAGES[state.learningLanguageId] || LEARNING_LANGUAGES.en;
    }

    function currentDictionaryId() {
      return currentLearningLanguage().dictionaryId;
    }

    function dictionaryCollectionEnabled() {
      return Boolean(currentLearningLanguage().collectionEnabled);
    }

    function dictionaryWordStudyEnabled() {
      return Boolean(currentLearningLanguage().wordStudyEnabled);
    }

    function dictionaryStudyDeckEnabled() {
      return Boolean(currentLearningLanguage().dictionaryStudyDeckEnabled);
    }

    function dictionaryDisabledNote(kind = "收藏") {
      return `<span class="dictionary-disabled-note" title="当前${currentLearningLanguage().label}${kind}还没有接入，先只提供查词。">${kind}稍后接入</span>`;
    }

    function renderLearningLanguageTabs() {
      document.querySelectorAll("[data-language-id]").forEach((button) => {
        const language = LEARNING_LANGUAGES[button.dataset.languageId] || LEARNING_LANGUAGES.en;
        const active = language.id === state.learningLanguageId;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
        button.title = active
          ? `当前学习语言：${language.label}`
          : `切换到${language.label}${language.id === "es" ? "（使用西语词典；收藏和背单词记录单独保存）" : ""}`;
      });
    }

    // reloadLibrary: false leaves loading the new language's library to the caller (identity changes call
    // tryLoadDefaultLibrary() themselves after applying settings).
    function setLearningLanguage(languageId, { persist = true, reloadLibrary = true } = {}) {
      const language = LEARNING_LANGUAGES[languageId] || LEARNING_LANGUAGES.en;
      if (state.learningLanguageId === language.id) {
        renderLearningLanguageTabs();
        window.langLSRWDictionary?.setActiveDictionary(language.dictionaryId);
        applyLearningLanguageLibraryOptions();
        syncDictionaryCategoryForType();
        return;
      }
      rememberDictionaryWordCategory();
      stopSpeech();
      closeDictionaryLookup();
      state.learningLanguageId = language.id;
      if (persist) persistSetting("learningLanguage", language.id);
      window.langLSRWDictionary?.setActiveDictionary(language.dictionaryId);
      renderLearningLanguageTabs();
      dictionaryStudyDeckCache.clear();
      state.dictionaryLibraryPage = 1;
      applyLearningLanguageLibraryOptions();
      if (!$("dictionaryLibraryModal").hidden) {
        setDictionaryLibraryType("words", false);
        renderDictionaryLibrary();
      } else {
        syncDictionaryCategoryForType();
      }
      updateDictionaryStudyButton();
      if (!$("userPhrasesModal").hidden) {
        state.userWordsPage = 1;
        renderUserPhrases();
      }
      renderAccentOptions();
      // Each learning language practises its own common library, resuming that language's last position.
      resetCommonLibraryState();
      if (!reloadLibrary) return;
      tryLoadDefaultLibrary().then(() => {
        if (!$("libraryModal").hidden) loadCommonLibrary();
      });
    }

    function applyLearningLanguageLibraryOptions() {
      const favoritesOption = $("currentLibrarySelect").querySelector('option[value="favorites"]');
      if (favoritesOption) favoritesOption.hidden = !currentLearningLanguage().sentenceFavoritesEnabled;
      applyLearningLanguageFavoriteOptions();
    }

    // 收藏 page: categories, sorts, and 背单词 controls follow the current learning language.
    // The category and sort selects of 词库 and 收藏 list the current learning language's options. English keeps the
    // options written in index.html; another language provides its own lists in src/languages/<id>/dictionary.js.
    const englishSelectOptions = {};

    function applyLanguageSelectOptions(selectId, options) {
      const select = $(selectId);
      if (!(selectId in englishSelectOptions)) englishSelectOptions[selectId] = select.innerHTML;
      const previous = select.value;
      select.innerHTML = options
        ? options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")
        : englishSelectOptions[selectId];
      if ([...select.options].some((option) => option.value === previous)) select.value = previous;
    }

    function applyLearningLanguageFavoriteOptions() {
      const rules = languageDictionary();
      applyLanguageSelectOptions("dictionaryCategorySelect", rules.libraryCategoryOptions);
      applyLanguageSelectOptions("dictionarySortSelect", rules.librarySortOptions);
      applyLanguageSelectOptions("userWordsCategorySelect", rules.favoriteCategoryOptions);
      applyLanguageSelectOptions("userWordsSortSelect", rules.favoriteSortOptions);
      $("userWordsControls").querySelector(".word-review-launchers").hidden = !dictionaryWordStudyEnabled();
      $("userPhrasesList").classList.toggle("is-without-review-status", !dictionaryWordStudyEnabled());
    }

    async function removeDictionary(dictionaryId = "ecdict") {
      const pkg = window.langLSRWDictionary?.dictionary(dictionaryId);
      if (!confirm(`删除当前浏览器中的${pkg?.label || ""}本地词典吗？以后可以重新安装。`)) return;
      try {
        dictionaryBusyId = dictionaryId;
        renderDictionarySettings();
        await window.langLSRWDictionary.remove(dictionaryId);
        await refreshDictionaryStatus();
      } catch (error) {
        setDictionaryCardMessage(dictionaryId, `删除失败：${error.message || error}`);
      } finally {
        dictionaryBusyId = "";
        await refreshDictionaryStatus();
      }
    }

    function applyTheme(theme, { persist = true } = {}) {
      const themeMap = { dark: "black" };
      const nextTheme = themeMap[theme] || theme;
      state.theme = themes.some((item) => item.id === nextTheme) ? nextTheme : "eye";
      document.body.dataset.theme = state.theme;
      // Browser cache of the last shown theme, read by index.html before the page renders so opening the page does
      // not flash another background; the identity's theme setting stays authoritative.
      try {
        localStorage.setItem("langLSRWBootTheme", state.theme);
      } catch {
        /* ignore storage errors */
      }
      const current = themes.find((item) => item.id === state.theme);
      $("themeToggleBtn").textContent = current.label;
      $("themeToggleBtn").title = `背景：${current.label}`;
      if (persist) persistSetting("theme", state.theme);
    }

    function toggleTheme() {
      const currentIndex = Math.max(0, themes.findIndex((item) => item.id === state.theme));
      applyTheme(themes[(currentIndex + 1) % themes.length].id);
    }

    function applyFontSettings(settings, { persist = true } = {}) {
      const defaults = fontDefaults();
      const english = Object.prototype.hasOwnProperty.call(englishFontPresets, settings?.english)
        ? settings.english
        : defaults.english;
      const chinese = Object.prototype.hasOwnProperty.call(chineseFontPresets, settings?.chinese)
        ? settings.chinese
        : defaults.chinese;
      state.fontSettings = { english, chinese };
      document.documentElement.style.setProperty("--font-english-content", englishFontPresets[english]);
      document.documentElement.style.setProperty("--font-translation", chineseFontPresets[chinese]);
      $("englishFontSelect").value = english;
      $("chineseFontSelect").value = chinese;
      if (persist) persistSetting("fonts", state.fontSettings);
    }

    function saveFontSettings() {
      applyFontSettings({
        english: $("englishFontSelect").value,
        chinese: $("chineseFontSelect").value
      });
    }

    function resetFontSettings() {
      applyFontSettings(fontDefaults());
    }

    const grammarColorLabels = {
      subject: "主语",
      predicate: "谓语",
      object: "宾语",
      predicative: "表语",
      complement: "补语",
      attribute: "定语",
      adverbial: "状语",
      appositive: "同位语",
      head: "中心语",
      other: "其他"
    };
    let activeGrammarColorRole = "subject";

    function setActiveGrammarColorRole(role) {
      if (!grammarColorLabels[role]) return;
      activeGrammarColorRole = role;
      document.querySelectorAll("[data-grammar-color-row]").forEach((row) => {
        row.classList.toggle("is-active", row.dataset.grammarColorRow === role);
      });
      $("grammarColorActiveLabel").textContent = grammarColorLabels[role];
    }

    function normalizeHexInput(value) {
      const compact = String(value || "").trim();
      const prefixed = compact.startsWith("#") ? compact : `#${compact}`;
      return /^#[0-9a-f]{6}$/i.test(prefixed) ? prefixed.toLowerCase() : "";
    }

    function updateGrammarColor(role, value) {
      const normalized = normalizeHexInput(value);
      if (!normalized || !grammarColorLabels[role]) return false;
      setActiveGrammarColorRole(role);
      applyGrammarColors({ ...state.grammarColors, [role]: normalized });
      return true;
    }

    function applyGrammarColors(colors, { persist = true } = {}) {
      state.grammarColors = normalizeGrammarColors(colors);
      Object.entries(state.grammarColors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--grammar-${key}-color`, value);
        const input = document.querySelector(`[data-grammar-color="${key}"]`);
        if (input) input.value = value;
        const hexInput = document.querySelector(`[data-grammar-hex="${key}"]`);
        if (hexInput) {
          hexInput.value = value.toUpperCase();
          hexInput.classList.remove("is-invalid");
        }
      });
      if (persist) persistSetting("grammarColors", state.grammarColors);
    }

    function resetGrammarColors() {
      applyGrammarColors(grammarColorDefaults());
    }

    // Resets the current identity's settings (other users keep theirs).
    function resetSettingsToDefault() {
      state.shortcuts = { ...defaultShortcuts };
      saveShortcuts();
      state.speechSettings = {};
      persistSetting("speech", state.speechSettings);
      applyTheme(defaultSettingValue("theme"));
      applyFontSettings(fontDefaults());
      applyGrammarColors(grammarColorDefaults());
      persistSetting("practice", defaultSettingValue("practice"));
      loadPracticeSettings();
      loadSpeechSettings();
      populateVoices();
      renderShortcutSettings();
      updateSpeechRateIndicator();
    }

    function resetGlobalSettings() {
      const confirmed = confirm("确定恢复默认设置吗？主题、字体、句子成分颜色、快捷键、朗读设置会重置，用户记录和句库不会删除。");
      if (!confirmed) return;

      resetSettingsToDefault();
      closeTopMenus();
    }

    function setActivePage(pageId) {
      const page = document.getElementById(pageId);
      if (!page) return;
      state.activePage = pageId;
      document.body.dataset.activePage = pageId;
      if (pageId !== "listenPage") {
        closeTopMenus();
        dragDepth = 0;
        $("dropOverlay").classList.remove("active");
      }
      if (pageId !== "listenPage" && (state.speaking.isRecognizing || state.speaking.isRecording)) stopSpeakingPractice();
      if (pageId !== "listenPage") stopLoopCompare();
      document.querySelectorAll(".learning-page").forEach((item) => {
        item.classList.toggle("active", item.id === pageId);
      });
      document.querySelectorAll(".page-tab").forEach((tab) => {
        const isActive = tab.dataset.pageTarget === pageId;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-current", isActive ? "page" : "false");
      });
      if (pageId === "listenPage") renderSpeakingPage();
    }

    function normalizeShortcutEvent(event) {
      const modifierKeys = ["Control", "Alt", "Shift", "Meta"];
      if (modifierKeys.includes(event.key)) return "";
      const keyMap = {
        " ": "Space",
        "ArrowLeft": "Left",
        "ArrowRight": "Right",
        "ArrowUp": "Up",
        "ArrowDown": "Down",
        "Escape": "Esc"
      };
      const key = keyMap[event.key] || (event.key.length === 1 ? event.key.toUpperCase() : event.key);
      const parts = [];
      if (event.ctrlKey) parts.push("Ctrl");
      if (event.altKey) parts.push("Alt");
      if (event.shiftKey) parts.push("Shift");
      if (event.metaKey) parts.push("Meta");
      parts.push(key);
      return parts.join("+");
    }

    function shortcutDisplayName(shortcut) {
      const arrows = { Left: "←", Right: "→", Up: "↑", Down: "↓" };
      return String(shortcut || "").split("+").map((part) => arrows[part] || part).join("+") || "未设置";
    }

    // Hover explanations for the practice-order select and the ◀ / ▶ buttons; they follow the current mode and the
    // learner's configured shortcut keys.
    function updateSentenceNavigationTitles() {
      const mode = $("modeSelect").value;
      const keys = {
        previous: shortcutDisplayName(state.shortcuts.previousSentence),
        next: shortcutDisplayName(state.shortcuts.nextSentence),
        previousInOrder: shortcutDisplayName(state.shortcuts.previousSentenceInOrder),
        nextInOrder: shortcutDisplayName(state.shortcuts.nextSentenceInOrder)
      };
      const orderNote = `顺序模式：${keys.previousInOrder}/${keys.nextInOrder}=上/下一句；${keys.previous}/${keys.next}=上/下一句。\n随机模式：${keys.previousInOrder}/${keys.nextInOrder}=上/下一句；${keys.previous}/${keys.next}=上个随机句/随机下一句。`;
      $("modeSelect").title = `顺序＝按句库顺序切换；\n随机＝从句库随机抽取；\n全文＝开始朗读后，从当前句连续朗读到全文结束。\n---------------------------
${orderNote}`;
      const previous = {
        ordered: "上一句",
        random: `顺序模式：${keys.previous}=上一句。随机模式：${keys.previous}=上个随机句 (最多10句)。`,
        mistakes: "上一个错句"
      }[mode] || "上一句";
      const next = {
        ordered: "下一句",
        random: `顺序模式：${keys.next}=下一句。随机模式：${keys.next}=下一个随机句。`,
        mistakes: "下一个错句"
      }[mode] || "下一句";
      $("previousUnifiedBtn").title = `${keys.previous} 键：\n${previous}`;
      $("nextUnifiedBtn").title = `${keys.next} 键：\n${next}`;
    }

    function renderShortcutSettings() {
      updateSentenceNavigationTitles();
      const keyboardRows = shortcutActions.map((action) => `
        <label class="shortcut-row" title="${escapeHtml(action.label)}：点击按键框，再按下想用的组合键">
          <span>${escapeHtml(action.label)}</span>
          <input class="shortcut-input" type="text" readonly data-shortcut="${escapeHtml(action.id)}" value="${escapeHtml(state.shortcuts[action.id] || "")}" placeholder="未设置">
        </label>
      `).join("");
      const mouseRows = fixedMouseActions.map((action) => `
        <div class="shortcut-row" title="${escapeHtml(action.label)}：固定的鼠标操作，不能修改">
          <span>${escapeHtml(action.label)}</span>
          <span class="shortcut-input shortcut-fixed">${escapeHtml(action.control)}</span>
        </div>
      `).join("");
      $("shortcutList").innerHTML = keyboardRows + mouseRows;
    }

    function runShortcutAction(actionId) {
      const actions = {
        toggleSource: toggleSourceVisibility,
        toggleTranslation: toggleTranslationVisibility,
        nextSentence: goNextSentence,
        previousSentence: goPreviousSentence,
        nextSentenceInOrder: () => goSentenceInOrder(1),
        previousSentenceInOrder: () => goSentenceInOrder(-1),
        resetSentence: () => resetCurrent(false),
        speakSentence: speakCurrentSentence,
        stopSpeech,
        peekCurrentWord: peekCurrentWord,
        speakCurrentWord: speakCurrentWord,
        lookupCurrentWord: lookupCurrentWord,
        finishSentence: finishCurrent
      };
      if (actions[actionId]) actions[actionId]();
    }

    function runSpeakingShortcut(actionId) {
      const actions = {
        previousSentence: () => switchSpeakingSentence(pickSentenceIndex(-1)),
        nextSentence: () => switchSpeakingSentence(pickSentenceIndex(1)),
        speakModel: () => speakSentence(1),
        togglePractice: () => {
          if (state.speaking.isRecognizing || state.speaking.isRecording) {
            stopSpeakingPractice();
          } else {
            startSpeakingPractice();
          }
        }
      };
      if (actions[actionId]) actions[actionId]();
    }

    function handleSpeakingShortcut(event) {
      const shortcut = normalizeShortcutEvent(event);
      if (!shortcut) return false;
      const match = Object.entries(speakingShortcuts).find(([, value]) => value === shortcut);
      if (!match) return false;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      if (event.repeat && match[0] === "togglePractice") return true;
      runSpeakingShortcut(match[0]);
      return true;
    }

    // 朗读当前词/句 works wherever something can be spoken: the word in an open lookup popover, review card, or
    // 收藏 / 词库 detail; otherwise the current sentence on the 听 and 说 pages. Returns true when it spoke.
    function speakCurrentWordOrSentence() {
      if (englishLookupTop()?.dataset.word) {
        speakText(englishLookupTop().dataset.word, englishReferenceSpeechOptions());
        return true;
      }
      if (!$("dictionaryLookupPopover").hidden && $("dictionaryLookupPopover").dataset.word) {
        speakText($("dictionaryLookupPopover").dataset.word, { rate: currentReplayRate() });
        return true;
      }
      if (document.querySelector(".word-review-modal:not([hidden])")) {
        const review = state.wordReview;
        const word = currentWordReviewItem()?.word;
        // 默写 must not give the answer away by sound before it is answered.
        if (word && !(review?.mode === "spell" && !review.answered)) speakReviewWord(word);
        return true;
      }
      if (!$("userPhrasesModal").hidden) {
        const word = $("userPhraseDetail").dataset.word;
        if (word) speakText(word, { rate: currentReplayRate() });
        return true;
      }
      if (!$("dictionaryLibraryModal").hidden) {
        const word = $("dictionaryLibraryDetail").dataset.word;
        if (word) speakText(word, { rate: currentReplayRate() });
        return true;
      }
      if (document.querySelector(".font-menu[open], .user-menu[open]") || !$("settingsModal").hidden || !$("libraryModal").hidden) return false;
      if (state.activePage === "listenPage") {
        speakCurrentSentence();
        return true;
      }
      if (state.activePage === "speakPage") {
        speakSentence(1);
        return true;
      }
      return false;
    }

    function isTopMenuOpen() {
      return Boolean(
        document.querySelector(".font-menu[open], .user-menu[open]")
        || !$("settingsModal").hidden
        || !$("libraryModal").hidden
        || !$("dictionaryLibraryModal").hidden
        || !$("userPhrasesModal").hidden
        || document.querySelector(".word-review-modal:not([hidden])")
      );
    }

    function handleGlobalShortcut(event) {
      if (event.isComposing) return;
      if (event.target && event.target.closest && event.target.closest("[data-shortcut]")) return;
      if (document.activeElement === counterIndexInput || event.target === counterIndexInput) return;
      if (event.key === "Escape" && englishLookupTop()) {
        event.preventDefault();
        closeEnglishLookup(englishLookupTop());
        return;
      }
      if (event.key === "Escape" && !$("dictionaryLookupPopover").hidden) {
        event.preventDefault();
        closeDictionaryLookup();
        return;
      }
      if (event.key === "Escape" && document.querySelector(".word-review-modal:not([hidden])")) {
        event.preventDefault();
        closeWordReview();
        return;
      }
      if (event.key === "Escape" && !$("userPhrasesModal").hidden) {
        event.preventDefault();
        closeUserPhrases();
        return;
      }
      if (event.key === "Escape" && !$("dictionaryLibraryModal").hidden) {
        event.preventDefault();
        closeDictionaryLibrary();
        return;
      }
      if (event.key === "Escape" && !$("settingsModal").hidden) {
        event.preventDefault();
        closeSettings();
        return;
      }
      // 单词练习: the 按住说话 shortcut holds the same recognition as the button (keydown starts, keyup stops).
      if (state.wordReview?.source === "single" && !document.querySelector("#wordListenReviewModal")?.hidden
        && normalizeShortcutEvent(event) === state.shortcuts.holdSpeaking) {
        event.preventDefault();
        if (!event.repeat && !wordSpeakRecognition) startWordSpeak();
        return;
      }
      const speakShortcut = normalizeShortcutEvent(event);
      const inOtherField = event.target?.closest?.("input, textarea, select") && event.target !== typingBox && !event.target.matches?.("[data-word-review-input]");
      if (speakShortcut && speakShortcut === state.shortcuts.speakSentence && !inOtherField && !event.repeat && speakCurrentWordOrSentence()) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        return;
      }
      if (isTopMenuOpen()) return;
      if (state.activePage !== "listenPage") return;
      const target = event.target;
      const isTypingFocused = document.activeElement === typingBox || target === typingBox || Boolean(target && target.closest && target.closest("#typingBox"));
      const isInteractiveTarget = target && target.closest && target.closest("input, textarea, select, button, summary, a, [contenteditable='true']");

      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key === "Escape" && isTypingFocused) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        typingBox.blur();
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key === "Enter" && !isTypingFocused && !isInteractiveTarget) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        typingBox.focus();
        return;
      }

      const shortcut = normalizeShortcutEvent(event);
      if (shortcut && state.shortcuts.holdSpeaking === shortcut) {
        if (isTypingFocused) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        if (!event.repeat && !state.speaking.holdActive && !state.speaking.isStarting && !state.speaking.isRecognizing && !state.speaking.isRecording) {
          state.speaking.holdActive = true;
          startSpeakingPractice();
        }
        return;
      }

      if (shortcut) {
        const match = shortcutActions.find((action) => state.shortcuts[action.id] === shortcut);
        if (match && match.id !== "holdSpeaking") {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          if (match.id === "peekCurrentWord") {
            peekCurrentWord();
            return;
          }
          if (event.repeat && match.id === "speakCurrentWord") return;
          runShortcutAction(match.id);
          return;
        }
      }

      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key === "-") {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        replaySlower();
        return;
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key === "=") {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        replayCurrentSpeed();
        return;
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && (event.key === "`" || event.code === "Backquote")) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        replayNormalSpeed();
        return;
      }
    }

    function handleGlobalShortcutKeyup(event) {
      if (event.isComposing) return;
      if (event.target && event.target.closest && event.target.closest("[data-shortcut]")) return;
      if (document.activeElement === counterIndexInput || event.target === counterIndexInput) return;
      if (wordSpeakRecognition && normalizeShortcutEvent(event) === state.shortcuts.holdSpeaking) {
        event.preventDefault();
        stopWordSpeak();
        return;
      }
      if (isTopMenuOpen()) {
        if (state.speaking.holdActive) scheduleStopSpeakingPractice();
        clearPeekedWord();
        return;
      }
      if (state.activePage !== "listenPage") return;
      const target = event.target;
      const isTypingFocused = document.activeElement === typingBox || target === typingBox || Boolean(target && target.closest && target.closest("#typingBox"));
      const shortcut = normalizeShortcutEvent(event);
      if (!isTypingFocused && shortcut && state.shortcuts.holdSpeaking === shortcut) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        scheduleStopSpeakingPractice();
        return;
      }
      if (!shortcut || state.shortcuts.peekCurrentWord !== shortcut) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      clearPeekedWord();
    }

    function loadSpeechSettings() {
      renderAccentOptions();
      $("autoSpeakToggle").checked = state.speechSettings.autoSpeak !== false;
      // Older settings stored a longText checkbox; it maps to 长文显示.
      const displayMode = state.speechSettings.displayMode || (state.speechSettings.longText === true ? "long" : "single");
      $("displayModeSelect").value = ["single", "long", "focus"].includes(displayMode) ? displayMode : "single";
      $("speakWordToggle").checked = state.speechSettings.speakWord !== false;
      $("showSourceToggle").checked = state.speechSettings.showSource !== false;
      $("showTranslationToggle").checked = state.speechSettings.showTranslation !== false;
    }

    function populateVoices() {
      if (!("speechSynthesis" in window)) return;
      state.voices = window.speechSynthesis.getVoices();
      const accent = ttsAccent();
      const matchingVoices = state.voices.filter((voice) => voice.lang && voice.lang.toLowerCase().startsWith(accent.toLowerCase()));
      const languagePrefix = `${state.learningLanguageId || "en"}-`;
      const voices = matchingVoices.length ? matchingVoices : state.voices.filter((voice) => String(voice.lang || "").toLowerCase().startsWith(languagePrefix));
      $("voiceSelect").innerHTML = '<option value="">自动选择</option>' + voices.map((voice) => (
        `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})</option>`
      )).join("");
      const savedVoice = state.speechSettings[voiceSettingKey()];
      if (savedVoice && voices.some((voice) => voice.voiceURI === savedVoice)) {
        $("voiceSelect").value = savedVoice;
      }
    }

    function getSpeechText() {
      return currentSentence();
    }

    function chooseVoice() {
      const voiceURI = usingOriginalVoice() ? "" : $("voiceSelect").value;
      const accent = ttsAccent();
      if (voiceURI) return state.voices.find((voice) => voice.voiceURI === voiceURI) || null;
      return state.voices.find((voice) => voice.lang === accent)
        || state.voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith(accent.toLowerCase()))
        || state.voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith(`${state.learningLanguageId || "en"}-`))
        || null;
    }

    function speakText(text, options = {}) {
      if (!("speechSynthesis" in window)) {
        alert("当前浏览器不支持朗读功能。");
        return;
      }
      if (!text) return;
      if (options.interrupt !== false) {
        stopFullTextReading();
        window.speechSynthesis.cancel();
        stopSentenceAudio();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || ttsAccent();
      utterance.rate = options.rate || 1;
      utterance.pitch = 1;
      const voice = options.lang ? options.voice : chooseVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }

    // English words in a Spanish entry's English definitions are read with the learner's saved English accent/voice.
    function englishReferenceSpeechOptions() {
      const accent = state.speechSettings.accent || "en-GB";
      const voiceURI = state.speechSettings.voiceURI || "";
      const isEnglish = (voice) => String(voice?.lang || "").toLowerCase().startsWith("en");
      const saved = state.voices.find((voice) => voice.voiceURI === voiceURI && isEnglish(voice));
      const voice = saved
        || state.voices.find((item) => item.lang === accent)
        || state.voices.find((item) => String(item.lang || "").toLowerCase().startsWith(accent.toLowerCase()))
        || state.voices.find(isEnglish)
        || null;
      return { lang: accent, voice, rate: currentReplayRate() };
    }

    function speakCurrentSentence() {
      if ($("modeSelect").value === "fulltext") {
        if (state.fullTextReading) stopFullTextReading();
        else startFullTextReading();
        return;
      }
      speakSentence(currentReplayRate());
    }

    // 全文 mode: once reading starts, read from the current sentence to the last one in library order, moving the
    // practice view along, then stop. Any other navigation, stop action, word replay, or library/mode change cancels it.
    function setSpeakButtonReading(reading) {
      const button = $("speakBtn");
      button.textContent = reading ? "停止 ⏹" : "朗读 📢";
      button.title = reading ? "停止全文朗读" : "朗读当前句；全文模式下从当前句连续朗读到结尾";
    }

    async function startFullTextReading() {
      stopFullTextReading();
      const run = { id: (state.fullTextRunId || 0) + 1 };
      state.fullTextRunId = run.id;
      state.fullTextReading = run;
      setSpeakButtonReading(true);
      const active = () => state.fullTextReading === run;
      try {
        if (state.audioMaterial && usingOriginalVoice() && Number.isFinite(state.sentences[state.index]?.start)) {
          await playFullTextAudio(active);
        } else {
          // TTS: the next sentence starts as soon as the previous one ends.
          while (active()) {
            await speakSentenceAndWait(currentReplayRate());
            if (!active() || state.index >= state.sentences.length - 1) break;
            advanceFullTextSentence();
          }
        }
      } catch {
        /* interrupted (for example by another TTS call): just stop */
      } finally {
        if (active()) {
          state.fullTextReading = null;
          setSpeakButtonReading(false);
        }
      }
    }

    function advanceFullTextSentence() {
      state.fullTextAdvancing = true;
      try {
        state.index += 1;
        saveLastPosition();
        resetCurrent(false);
      } finally {
        state.fullTextAdvancing = false;
      }
    }

    // Original audio in 全文: one continuous playback from the current sentence's start to the last sentence's end,
    // exactly as recorded (no per-sentence seeking, cutting, or pauses). The practice view follows the audio clock:
    // whenever playback reaches the next sentence's start time, that sentence becomes current.
    async function playFullTextAudio(isActive) {
      const material = state.audioMaterial;
      const startItem = state.sentences[state.index];
      if (!material || !Number.isFinite(startItem?.start)) return;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      stopSentenceAudio();
      const token = material.playToken;
      const audio = material.audio;
      const audioContext = ensureSentenceAudioGain(material);
      audio.playbackRate = currentReplayRate();
      audio.currentTime = startItem.start;
      if (audioContext?.state === "suspended") await audioContext.resume();
      if (!isActive() || material.playToken !== token) return;
      if (audioContext && material.gainNode) {
        const now = audioContext.currentTime;
        material.gainNode.gain.cancelScheduledValues(now);
        material.gainNode.gain.setValueAtTime(1, now);
      }
      await audio.play();
      await new Promise((resolve) => {
        let timer = 0;
        const finish = () => {
          clearInterval(timer);
          audio.removeEventListener("ended", finish);
          if (material.finishPlayback === finish) material.finishPlayback = null;
          resolve();
        };
        material.finishPlayback = finish;
        audio.addEventListener("ended", finish);
        timer = setInterval(() => {
          if (!isActive() || material.playToken !== token) {
            finish();
            return;
          }
          const time = audio.currentTime;
          while (state.index < state.sentences.length - 1) {
            const next = state.sentences[state.index + 1];
            if (!Number.isFinite(next?.start) || time < next.start) break;
            advanceFullTextSentence();
          }
          const last = state.sentences[state.sentences.length - 1];
          if (state.index === state.sentences.length - 1 && Number.isFinite(last?.end) && time >= last.end) {
            audio.pause();
            finish();
          }
        }, 50);
      });
    }

    function stopFullTextReading() {
      if (!state.fullTextReading) return;
      state.fullTextReading = null;
      setSpeakButtonReading(false);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      stopSentenceAudio();
    }

    function speakTextAndWait(text, options = {}) {
      return new Promise((resolve, reject) => {
        if (!("speechSynthesis" in window)) {
          reject(new Error("当前浏览器不支持朗读功能。"));
          return;
        }
        if (!text) {
          resolve();
          return;
        }
        if (options.interrupt !== false) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = ttsAccent();
        utterance.rate = options.rate || 1;
        utterance.pitch = 1;
        const voice = chooseVoice();
        if (voice) utterance.voice = voice;
        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(event.error || "朗读失败"));
        window.speechSynthesis.speak(utterance);
      });
    }

    function playRecordedAudioAndWait(runId) {
      const audio = $("speakingAudio");
      return new Promise((resolve, reject) => {
        if (!audio.src || state.speaking.loopCompareRunId !== runId) {
          resolve();
          return;
        }
        let settled = false;
        const cleanup = () => {
          audio.removeEventListener("ended", onEnded);
          audio.removeEventListener("error", onError);
          if (state.speaking.cancelLoopCompareAudio === cancel) {
            state.speaking.cancelLoopCompareAudio = null;
          }
        };
        const settle = (error) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (error) reject(error);
          else resolve();
        };
        const cancel = () => settle();
        const onEnded = () => settle();
        const onError = () => settle(new Error("录音播放失败"));
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);
        state.speaking.cancelLoopCompareAudio = cancel;
        audio.currentTime = 0;
        audio.play().catch((error) => settle(error));
      });
    }

    function setLoopCompareButtonState() {
      const button = $("loopCompareBtn");
      if (!button) return;
      button.classList.toggle("is-active", state.speaking.loopCompareActive);
      button.textContent = state.speaking.loopCompareActive ? "停止循环" : "原声对比";
    }

    function stopLoopCompare() {
      if (!state.speaking.loopCompareActive && !state.speaking.cancelLoopCompareAudio) return;
      state.speaking.loopCompareActive = false;
      state.speaking.loopCompareRunId += 1;
      state.speaking.cancelLoopCompareAudio?.();
      window.speechSynthesis.cancel();
      stopSentenceAudio();
      $("speakingAudio").pause();
      setLoopCompareButtonState();
    }

    async function toggleLoopCompare() {
      if (state.speaking.loopCompareActive) {
        stopLoopCompare();
        return;
      }
      if (!state.speaking.recordedAudioUrl) {
        setPitchCompareStatus("请先录音，再循环对比原声。");
        return;
      }
      const runId = state.speaking.loopCompareRunId + 1;
      state.speaking.loopCompareRunId = runId;
      state.speaking.loopCompareActive = true;
      setLoopCompareButtonState();
      const isCurrentRun = () => state.speaking.loopCompareActive && state.speaking.loopCompareRunId === runId;
      try {
        while (isCurrentRun()) {
          await speakSentenceAndWait(currentReplayRate());
          if (!isCurrentRun()) break;
          await waitMs(300);
          if (!isCurrentRun()) break;
          await playRecordedAudioAndWait(runId);
          if (!isCurrentRun()) break;
          await waitMs(500);
        }
      } catch (error) {
        if (state.speaking.loopCompareRunId === runId) {
          setPitchCompareStatus(`循环对比中断：${error.message || error}`);
        }
      } finally {
        if (state.speaking.loopCompareRunId === runId) {
          state.speaking.loopCompareActive = false;
          setLoopCompareButtonState();
        }
      }
    }

    function currentReplayRate() {
      return Math.min(2, Math.max(0.5, Number(state.replayRate) || 1));
    }

    function updateSpeechRateIndicator() {
      const value = $("speechRateValue");
      if (value) value.textContent = currentReplayRate().toFixed(1);
    }

    function setReplayRate(value) {
      state.replayRate = Math.round(Math.min(2, Math.max(0.5, Number(value) || 1)) * 10) / 10;
      updateSpeechRateIndicator();
    }

    function replaySlower() {
      setReplayRate(currentReplayRate() - 0.1);
      speakSentence(currentReplayRate());
    }

    function replayNormalSpeed() {
      setReplayRate(1);
      speakSentence(currentReplayRate());
    }

    function replayCurrentSpeed() {
      updateSpeechRateIndicator();
      speakSentence(currentReplayRate());
    }

    function autoSpeakCurrentSentence() {
      if ($("autoSpeakToggle").checked) {
        setTimeout(speakCurrentSentence, 120);
      }
    }

    function targetWordFromEvent(event) {
      return event.target && event.target.closest ? event.target.closest(".target-word") : null;
    }

    function speakTargetWord(wordEl) {
      if (!wordEl) return;
      speakText(wordEl.dataset.word || wordEl.textContent.trim(), { rate: currentReplayRate() });
    }

    function clearPeekedWord() {
      targetEl.querySelectorAll(".peek-word").forEach((word) => word.classList.remove("peek-word"));
      document.body.classList.remove("hide-cursor");
    }

    function getActiveTargetWordEl() {
      const root = targetEl.querySelector(".long-text-item.is-current") || targetEl;
      const words = [...root.querySelectorAll(".target-word")];
      if (!words.length) return null;

      if (targetEl.classList.contains("hidden-source")) {
        return root.querySelector(".covered-word") || words[words.length - 1];
      }

      return root.querySelector(".wrong, .pending") || words[words.length - 1];
    }

    function peekCurrentWord() {
      if (!targetEl.classList.contains("hidden-source")) return;
      const wordEl = getActiveTargetWordEl();
      if (!wordEl) return;
      clearPeekedWord();
      wordEl.classList.add("peek-word");
      document.body.classList.add("hide-cursor");
    }

    function speakCurrentWord() {
      speakTargetWord(getActiveTargetWordEl());
    }

    function dictionaryTextLines(value) {
      return String(value || "")
        .split(/\\n|\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    }

    function dictionaryTags(value) {
      const labels = {
        zk: "中考",
        gk: "高考",
        ky: "考研",
        cet4: "CET4",
        cet6: "CET6",
        ielts: "IELTS",
        toefl: "TOEFL",
        gre: "GRE"
      };
      const order = ["zk", "gk", "cet4", "cet6", "ky", "ielts", "toefl", "gre"];
      return String(value || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((tag) => tag.toLowerCase())
        .sort((left, right) => {
          const leftIndex = order.indexOf(left);
          const rightIndex = order.indexOf(right);
          return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex);
        })
        .map((tag) => ({ key: labels[tag] ? tag : "other", label: labels[tag] || tag.toUpperCase() }));
    }

    function dictionaryTagBadges(tags) {
      return tags.map((tag) => `<span class="dictionary-level-tag dictionary-level-${tag.key}">${escapeHtml(tag.label)}</span>`).join("");
    }

    // Word forms are read by the current learning language's dictionary rules (src/languages/<id>/dictionary.js).
    function dictionaryExchanges(value, rules = languageDictionary()) {
      return rules.exchanges(value);
    }

    function dictionaryExchangeHtml(exchanges, rules = languageDictionary()) {
      if (!exchanges.length) return "";
      const groupDefinitions = rules.exchangeGroups;
      const knownTypes = new Set(groupDefinitions.flatMap((group) => group.types));
      const groups = groupDefinitions
        .map((group) => ({
          ...group,
          items: group.types.flatMap((type) => exchanges.filter((item) => item.type === type))
        }))
        .filter((group) => group.items.length);
      const otherItems = exchanges.filter((item) => !knownTypes.has(item.type));
      if (otherItems.length) groups.push({ key: "other", label: "其他", items: otherItems });
      return `<div class="dictionary-exchange"><div class="dictionary-section-label">词形变化</div><div class="dictionary-exchange-groups">${groups.map((group) => `<div class="dictionary-exchange-group"><div class="dictionary-exchange-group-label">${group.label}</div><dl>${group.items.map(({ label, form, isBase }) => `<div><dt>${escapeHtml(label)}</dt><dd><button class="dictionary-form-link${isBase ? " dictionary-form-base" : ""}" type="button" data-dictionary-form="${escapeHtml(form)}" title="查看 ${escapeHtml(form)}">${escapeHtml(form)}</button></dd></div>`).join("")}</dl></div>`).join("")}</div></div>`;
    }

    function wordReviewRecordStarted(record) {
      return Boolean(record && typeof record === "object" && (
        record.lastReviewedAt
        || record.lastGrade
        || Number(record.reps) > 0
        || Number(record.lapses) > 0
        || Number(record.interval) > 0
      ));
    }

    function wordMasteryState(record, manual = false) {
      if (manual) return { key: "mastered", label: "手动掌握🟢" };
      // Same precedence as the list status icons: a due record shows 已到期 even if it was mastered.
      if (wordReviewRecordStarted(record) && Number(record.due) <= Date.now()) return { key: "due", label: "已到期" };
      if (wordReviewMastered(record)) return { key: "mastered", label: "已掌握" };
      if (wordReviewRecordStarted(record)) return { key: "learning", label: "学习中" };
      return { key: "new", label: "未学习" };
    }

    function wordReviewIntervalLabel(record) {
      if (!wordReviewRecordStarted(record)) return "—";
      const interval = Number(record?.interval);
      if (interval > 0) return `${Number.isInteger(interval) ? interval : interval.toFixed(1)} 天`;
      const reviewedAt = Date.parse(record?.lastReviewedAt);
      const due = Number(record?.due);
      if (Number.isFinite(reviewedAt) && Number.isFinite(due) && due > reviewedAt) {
        const minutes = Math.max(1, Math.round((due - reviewedAt) / 60000));
        return minutes < 60 ? `${minutes} 分钟` : `${(minutes / 60).toFixed(1)} 小时`;
      }
      return "—";
    }

    function wordReviewDueLabel(record) {
      const due = Number(record?.due);
      if (!wordReviewRecordStarted(record) || !Number.isFinite(due) || due <= 0) return "—";
      const now = new Date();
      const target = new Date(due);
      if (due <= now.getTime()) return "现在（已到期）";
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
      const dayDifference = Math.round((targetDay - startOfToday) / WORD_REVIEW_DAY_MS);
      const time = target.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
      if (dayDifference === 0) return `今天 ${time}`;
      if (dayDifference === 1) return `明天 ${time}`;
      const date = target.toLocaleDateString("zh-CN", {
        ...(target.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
        month: "numeric",
        day: "numeric"
      });
      return `${date} ${time}`;
    }

    function dictionaryWordMasteryHtml(word) {
      const records = loadWordReviewRecords();
      const marks = loadWordManualMastery()[dictionaryFavoriteKey(word)] || {};
      const wordRecord = records[dictionaryFavoriteKey(word)] || {};
      const modes = WORD_REVIEW_MODES.map((mode) => ({
        label: mode.label,
        state: wordMasteryState(wordRecord[mode.id], Boolean(marks[mode.id])),
        // Manually mastered modes hide the underlying schedule; every field shows "—".
        record: marks[mode.id] ? null : wordRecord[mode.id] || null
      }));
      return `<div class="dictionary-mastery"><div class="dictionary-section-label">当前单词掌握程度</div><div class="dictionary-mastery-items">${modes.map((mode) => `<div class="dictionary-mastery-item is-${mode.state.key}"><div class="dictionary-mastery-head"><b>${mode.label}</b><span>${mode.state.label}</span></div><div class="dictionary-mastery-meta"><span>复习间隔：${wordReviewIntervalLabel(mode.record)}</span><span>下次复习：${wordReviewDueLabel(mode.record)}</span><span>间隔系数：${wordReviewRecordStarted(mode.record) ? (wordReviewEase(mode.record) / 100).toFixed(2) : "—"}</span><span>连续答对：${wordReviewRecordStarted(mode.record) ? `${Number(mode.record.reps) || 0} 次` : "—"}</span></div></div>`).join("")}</div></div>`;
    }

    async function openDictionaryFormDetail(button) {
      const word = String(button?.dataset.dictionaryForm || "").trim();
      if (!word || !window.langLSRWDictionary) return;
      const item = await window.langLSRWDictionary.query(word, currentDictionaryId());
      if (!item) return;
      if (button.closest("#dictionaryLookupPopover")) {
        renderDictionaryLookupResult(item, word);
        autoSpeakLookedUpWord(String(item.word || word));
        return;
      }
      if (button.closest("#userPhraseDetail")) {
        renderUserWordDetail(item);
        return;
      }
      renderDictionaryLibraryDetail(item);
    }

    function dictionaryLookupHeadwordHtml(word, phonetic) {
      return `<div class="dictionary-headword"><strong>${escapeHtml(word)}</strong>${phonetic ? `<button class="dictionary-phonetic" type="button" data-dictionary-pronounce="${escapeHtml(word)}" title="点击朗读" aria-label="朗读 ${escapeHtml(word)}">[${escapeHtml(phonetic)}]</button>` : ""}${dictionaryPronunciationButton(word)}</div>`;
    }

    // Entry body below the header: part of speech, meanings, definitions, badges, frequency, and word forms.
    function dictionaryLookupBodyHtml(result, rules = languageDictionary()) {
      const translations = dictionaryTextLines(result.translation);
      const definitions = dictionaryTextLines(result.definition);
      const pos = String(result.pos || "").trim();
      const collins = Math.max(0, Math.min(5, Number(result.collins) || 0));
      const tags = dictionaryTags(result.tag);
      const bnc = dictionaryRank(result.bnc);
      const frq = dictionaryRank(result.frq);
      const exchanges = dictionaryExchanges(result.exchange, rules);
      return `
        ${pos ? `<div class="dictionary-pos">${escapeHtml(pos)}</div>` : ""}
        ${translations.length ? `<div class="dictionary-meanings">${translations.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>` : ""}
        ${definitions.length ? `<div class="dictionary-definitions${definitions.length > 5 ? " is-collapsed" : ""}">${definitions.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}${definitions.length > 5 ? `<button type="button" class="dictionary-definitions-more" data-dictionary-more title="显示其余 ${definitions.length - 5} 条英文释义">展开全部（共 ${definitions.length} 条）</button>` : ""}</div>` : ""}
        ${!translations.length && !definitions.length ? `<div class="dictionary-lookup-empty">该词条暂无释义。</div>` : ""}
        ${collins || Number(result.oxford) > 0 || tags.length ? `<div class="dictionary-badges">
          ${collins ? `<span class="dictionary-collins" title="柯林斯 ${collins} 星">柯林斯 <span class="dictionary-collins-stars">${"★".repeat(collins)}</span></span>` : ""}
          ${Number(result.oxford) > 0 ? '<span class="dictionary-level-tag dictionary-level-oxford">Oxford 3000</span>' : ""}
          ${dictionaryTagBadges(tags)}
        </div>` : ""}
        ${bnc || frq ? `<div class="dictionary-frequency">
          ${bnc ? `<span><b>${escapeHtml(rules.frequencyLabels?.bnc || "BNC")}</b> 词频 #${bnc}</span>` : ""}
          ${frq ? `<span><b>${escapeHtml(rules.frequencyLabels?.frq || "")}</b> 词频 #${frq}</span>` : ""}
        </div>` : ""}
        ${dictionaryExchangeHtml(exchanges, rules)}`;
    }

    function renderDictionaryLookupResult(result, requestedWord) {
      const popover = $("dictionaryLookupPopover");
      const word = String(result.word || requestedWord || "").trim();
      state.dictionaryLookupEntry = result;
      popover.dataset.word = word;
      const collectionControl = dictionaryCollectionEnabled() ? dictionaryFavoriteButton(word) : dictionaryDisabledNote("收藏");
      const masteryHtml = dictionaryWordStudyEnabled() ? dictionaryWordMasteryHtml(word) : "";
      popover.innerHTML = `
        <div class="dictionary-lookup-header">
          ${dictionaryLookupHeadwordHtml(word, result.phonetic)}
          <div class="dictionary-lookup-actions">${dictionaryAutoSpeakToggle()}${dictionaryPracticeButtons(word)}${collectionControl}<button type="button" data-dictionary-close aria-label="关闭">×</button></div>
        </div>
        ${dictionaryLookupBodyHtml(result)}
        ${masteryHtml}`;
    }

    // English reference lookup: while learning another language, right-clicking an English word in a word entry's
    // English meanings or definitions, or in the practice area's English sentence translation, opens that word from the
    // English dictionary (ECDICT) in a second popover on top.
    // Its stars save into English favorites (English storage keys); mastery is not shown there.
    function englishWordAtPoint(event, container) {
      const inRect = (rect) => rect && event.clientX >= rect.left - 1 && event.clientX <= rect.right + 1
        && event.clientY >= rect.top - 1 && event.clientY <= rect.bottom + 1;
      const selection = window.getSelection();
      const selected = selection && !selection.isCollapsed ? selection.toString().replace(/\s+/g, " ").trim() : "";
      if (selected && selected.length <= 60 && /^[A-Za-z][A-Za-z'’. -]*$/.test(selected) && container.contains(selection.anchorNode)) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        if (inRect(rect)) return { word: selected, rect };
      }
      let node = null;
      let offset = 0;
      if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(event.clientX, event.clientY);
        node = position?.offsetNode;
        offset = position?.offset || 0;
      } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        node = range?.startContainer;
        offset = range?.startOffset || 0;
      }
      if (!node || node.nodeType !== Node.TEXT_NODE || !container.contains(node)) return null;
      const pattern = window.langLSRWLanguages.en.text.typedWordRegex();
      let match;
      while ((match = pattern.exec(node.textContent)) !== null) {
        const end = match.index + match[0].length;
        if (offset < match.index || offset > end) continue;
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, end);
        const rect = range.getBoundingClientRect();
        return inRect(rect) ? { word: match[0].replace(/\.$/, ""), rect } : null;
      }
      return null;
    }

    function englishReferenceSource(target) {
      if (currentLearningLanguage().id === "en" && !target.closest(".english-lookup-popover")) return null;
      // The practice area's English translation of the current (or a long-text) sentence, while it is shown.
      const translation = target.closest(".translation-prompt:not(.is-hidden):not(.translation-editor) > span");
      if (translation) return translation;
      const container = target.closest(".dictionary-meanings, .dictionary-definitions");
      if (!container?.closest("#dictionaryLookupPopover, #userPhraseDetail, #dictionaryLibraryDetail, .english-lookup-popover")) return null;
      return container;
    }

    // English lookups stack: a lookup started inside an English popover opens a new popover above it and keeps it;
    // any other lookup starts over from the base popover. Each popover keeps its own word, entry, and anchor.
    const englishLookupStack = [];

    function englishLookupTop() {
      return englishLookupStack[englishLookupStack.length - 1] || null;
    }

    function englishLookupPopoverFor(fromPopover) {
      const index = fromPopover ? englishLookupStack.indexOf(fromPopover) : -1;
      if (index < 0) {
        closeEnglishLookup();
        englishLookupStack.push($("englishLookupPopover"));
        return $("englishLookupPopover");
      }
      if (englishLookupStack[index + 1]) closeEnglishLookup(englishLookupStack[index + 1]);
      const popover = document.createElement("div");
      popover.className = "dictionary-lookup-popover english-lookup-popover";
      popover.setAttribute("role", "dialog");
      popover.setAttribute("aria-label", "英语词典查询");
      document.body.append(popover);
      englishLookupStack.push(popover);
      return popover;
    }

    function renderEnglishLookupMessage(word, message, popover = $("englishLookupPopover")) {
      popover.innerHTML = `<div class="dictionary-lookup-header"><strong>${escapeHtml(word)}</strong><div class="dictionary-lookup-actions"><span class="english-lookup-label">英语词典</span><button type="button" data-dictionary-close aria-label="关闭" title="关闭英语词典查询">×</button></div></div><div class="dictionary-lookup-empty">${message}</div>`;
    }

    // `popover` re-uses an open popover (switching to a word form); `fromPopover` stacks a new one above it.
    async function lookupEnglishReference(word, anchor, { popover = null, fromPopover = null } = {}) {
      popover ||= englishLookupPopoverFor(fromPopover);
      popover.lookupAnchor = anchor;
      popover.dataset.word = word;
      popover.hidden = false;
      renderEnglishLookupMessage(word, `正在查询 ${escapeHtml(word)}...`, popover);
      placeLookupPopover(popover, anchor);
      try {
        const result = await window.langLSRWDictionary.query(word, "ecdict");
        if (popover.dataset.word !== word) return;
        if (!result) {
          renderEnglishLookupMessage(word, "英语词典中未找到该词。", popover);
        } else {
          const headword = String(result.word || word).trim();
          popover.lookupEntry = result;
          popover.innerHTML = `
            <div class="dictionary-lookup-header">
              ${dictionaryLookupHeadwordHtml(headword, result.phonetic)}
              <div class="dictionary-lookup-actions">${currentLearningLanguage().id === "en" ? dictionaryPracticeButtons(headword) : ""}${dictionaryFavoriteButton(headword, false, "en")}<button type="button" data-dictionary-close aria-label="关闭" title="关闭英语词典查询">×</button></div>
            </div>
            ${dictionaryLookupBodyHtml(result, window.langLSRWLanguages.en.dictionary)}`;
          if (dictionaryAutoSpeakEnabled()) speakText(headword, englishReferenceSpeechOptions());
        }
      } catch (error) {
        if (popover.dataset.word !== word) return;
        const unavailable = String(error?.message || error).includes("尚未安装");
        renderEnglishLookupMessage(word, unavailable ? "英语词典（ECDICT）尚未安装，请先在设置中安装。" : `查询失败：${escapeHtml(error?.message || String(error))}`, popover);
      }
      placeLookupPopover(popover, anchor);
    }

    // 展开全部 keeps the popover at its current height and lets the extra definitions scroll inside it;
    // 收起 folds them again and restores the natural height.
    function toggleDictionaryDefinitions(moreButton, popover, reposition) {
      const list = moreButton.closest(".dictionary-definitions");
      if (!list) return;
      const total = list.querySelectorAll(":scope > div").length;
      if (list.classList.contains("is-collapsed")) {
        popover.style.maxHeight = `${popover.offsetHeight}px`;
        list.classList.remove("is-collapsed");
        moreButton.textContent = "收起";
        moreButton.title = "只显示前 5 条英文释义";
      } else {
        list.classList.add("is-collapsed");
        moreButton.textContent = `展开全部（共 ${total} 条）`;
        moreButton.title = `显示其余 ${total - 5} 条英文释义`;
        popover.scrollTop = 0;
        reposition();
      }
    }

    // Closes `from` and every popover stacked above it; without `from`, closes them all.
    function closeEnglishLookup(from = null) {
      const index = from ? englishLookupStack.indexOf(from) : 0;
      if (index < 0) return;
      englishLookupStack.splice(index).forEach((popover) => {
        if (popover.id) {
          popover.hidden = true;
          popover.dataset.word = "";
        } else {
          popover.remove();
        }
      });
    }

    // One-line frequency ranks of an entry, labelled by the learning language's dictionary rules.
    function dictionaryFrequencyHtml(bnc, frq, rules = languageDictionary()) {
      if (!bnc && !frq) return "";
      const labels = rules.frequencyLabels || {};
      return `<div class="dictionary-frequency">${bnc ? `<span><b>${escapeHtml(labels.bnc || "BNC")}</b> 词频 #${bnc}</span>` : ""}${frq ? `<span><b>${escapeHtml(labels.frq || "")}</b> 词频 #${frq}</span>` : ""}</div>`;
    }

    function dictionaryRank(value) {
      const rank = Number(value);
      return Number.isFinite(rank) && rank > 0 ? rank.toLocaleString() : "";
    }

    // Normally the popover is exactly as tall as its content (no scrollbar). Only content taller than 640px (or than
    // the viewport) is capped, and then it scrolls inside. Re-run after the content changes (e.g. 展开全部).
    function positionDictionaryLookup(anchor = state.dictionaryLookupAnchor) {
      state.dictionaryLookupAnchor = anchor;
      placeLookupPopover($("dictionaryLookupPopover"), anchor);
    }

    function placeLookupPopover(popover, anchor) {
      const margin = 8;
      const gap = 0;
      const preferredX = anchor?.clientX ?? anchor?.left ?? window.innerWidth / 2;
      const avoidRect = anchor?.avoidRect || anchor;
      const avoidTop = avoidRect?.top ?? anchor?.clientY ?? window.innerHeight / 2;
      const avoidBottom = avoidRect?.bottom ?? anchor?.clientY ?? window.innerHeight / 2;
      const belowTop = avoidBottom + gap;
      const belowSpace = window.innerHeight - margin - belowTop;
      const aboveSpace = avoidTop - gap - margin;
      popover.style.maxHeight = "none";
      const naturalHeight = popover.offsetHeight;
      const viewportLimit = Math.max(0, Math.min(640, window.innerHeight - margin * 2));
      const popoverHeight = Math.min(naturalHeight, viewportLimit);
      popover.style.maxHeight = naturalHeight > viewportLimit ? `${viewportLimit}px` : "none";
      const useBelow = belowSpace >= popoverHeight || (aboveSpace < popoverHeight && belowSpace >= aboveSpace);
      const desiredTop = useBelow ? belowTop : avoidTop - gap - popoverHeight;
      const top = Math.max(margin, Math.min(desiredTop, window.innerHeight - popoverHeight - margin));
      popover.style.left = `${Math.max(margin, Math.min(preferredX, window.innerWidth - popover.offsetWidth - margin))}px`;
      popover.style.top = `${top}px`;
    }

    function closeDictionaryLookup() {
      $("dictionaryLookupPopover").hidden = true;
      closeEnglishLookup();
    }

    // languageId lets the English reference popover save into English favorites while another language is active.
    async function renderDictionaryLibrary() {
      const list = $("dictionaryLibraryList");
      list.innerHTML = '<div class="user-phrases-empty">正在读取词库...</div>';
      const language = currentLearningLanguage();
      const category = $("dictionaryCategorySelect").value;
      const sort = $("dictionarySortSelect").value;
      try {
        const result = await window.langLSRWDictionary.list({
          entryType: state.dictionaryLibraryType,
          category,
          sort,
          query: $("dictionaryLibrarySearchInput").value,
          page: state.dictionaryLibraryPage,
          pageSize: state.dictionaryLibraryPageSize
        }, language.dictionaryId);
        state.dictionaryLibraryPage = result.page;
        state.dictionaryLibraryPageCount = result.pageCount;
        const typeLabel = state.dictionaryLibraryType === "suffixes"
          ? "后缀"
          : state.dictionaryLibraryType === "phrases" ? "短语"
            : state.dictionaryLibraryType === "special" ? "特殊词条" : "单词";
        $("dictionaryLibraryCountText").textContent = `0 / ${result.total.toLocaleString()} 个${typeLabel}`;
        $("dictionaryLibrarySummary").textContent = `${language.dictionaryName} · 每页 ${result.pageSize} 词`;
        $("dictionaryPageInput").value = result.page;
        $("dictionaryPageInput").max = result.pageCount;
        $("dictionaryPageCount").textContent = `/ ${result.pageCount.toLocaleString()} 页`;
        $("dictionaryFirstPageBtn").disabled = result.page <= 1;
        $("dictionaryPrevPageBtn").disabled = result.page <= 1;
        $("dictionaryNextPageBtn").disabled = result.page >= result.pageCount;
        $("dictionaryLastPageBtn").disabled = result.page >= result.pageCount;
        const reviewRecords = loadWordReviewRecords();
        const manualMastery = loadWordManualMastery();
        const favoriteWords = dictionaryCollectionEnabled() ? loadUserWords() : [];
        list.classList.toggle("is-without-review-status", !dictionaryWordStudyEnabled());
        list.innerHTML = result.rows.length
          ? result.rows.map((item, index) => `<div class="user-word-item" role="button" tabindex="0" data-dictionary-library-word="${escapeHtml(item.word)}" data-dictionary-library-index="${(result.page - 1) * result.pageSize + index + 1}">${dictionaryWordStudyEnabled() ? wordReviewStatusIconsHtml(item.word, reviewRecords, manualMastery) : ""}<span class="user-word-label">${escapeHtml(item.word)}</span>${dictionaryCollectionEnabled() ? dictionaryFavoriteButton(item.word, false, state.learningLanguageId, favoriteWords) : ""}</div>`).join("")
          : '<div class="user-phrases-empty">当前分类没有单词。</div>';
        list.querySelectorAll("[data-dictionary-library-word]").forEach((button) => {
          const activateFromPointer = () => {
            const focused = document.activeElement;
            if (focused instanceof HTMLElement && list.contains(focused)) focused.blur();
            list.classList.remove("is-keyboard-navigation");
            activateDictionaryLibraryWord(button, result.total, typeLabel);
          };
          button.addEventListener("mouseenter", activateFromPointer);
          button.addEventListener("pointermove", () => {
            if (list.classList.contains("is-keyboard-navigation")) activateFromPointer();
          });
          button.addEventListener("focus", () => activateDictionaryLibraryWord(button, result.total, typeLabel));
        });
        if (state.dictionaryLibrarySelectFirstAfterRender) {
          state.dictionaryLibrarySelectFirstAfterRender = false;
          const firstWord = list.querySelector("[data-dictionary-library-word]");
          if (firstWord) {
            list.scrollTop = 0;
            firstWord.focus({ preventScroll: true });
          }
        }
      } catch (error) {
        const message = String(error.message || "无法读取词库");
        const notInstalled = message.includes("尚未安装");
        list.innerHTML = `<div class="user-phrases-empty">${escapeHtml(message)}${notInstalled ? `<br>请先在设置中安装 ${escapeHtml(language.dictionaryName)}。` : ""}</div>`;
        $("dictionaryLibraryCountText").textContent = notInstalled ? "词典未安装" : "读取失败";
      }
    }

    async function activateDictionaryLibraryWord(button, total, typeLabel) {
      if (!button) return;
      const word = button.dataset.dictionaryLibraryWord;
      const isAlreadyShown = dictionaryFavoriteKey($("dictionaryLibraryDetail").dataset.word) === dictionaryFavoriteKey(word);
      if (button.classList.contains("is-current") && (button.classList.contains("is-loading-detail") || isAlreadyShown)) return;
      $("dictionaryLibraryList").querySelectorAll(".is-current").forEach((item) => item.classList.remove("is-current"));
      button.classList.add("is-current");
      $("dictionaryLibraryCountText").textContent = `${Number(button.dataset.dictionaryLibraryIndex).toLocaleString()} / ${Number(total).toLocaleString()} 个${typeLabel}`;
      button.classList.add("is-loading-detail");
      let item;
      try {
        item = await window.langLSRWDictionary.query(word, currentDictionaryId());
      } finally {
        button.classList.remove("is-loading-detail");
      }
      if (!item || !button.classList.contains("is-current")) return;
      renderDictionaryLibraryDetail(item);
    }

    function handleDictionaryLibraryKeys(event) {
      if ($("dictionaryLibraryModal").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.matches("input, select, textarea")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        $("dictionaryLibraryList").classList.add("is-keyboard-navigation");
        goToDictionaryLibraryPage(state.dictionaryLibraryPage + (event.key === "ArrowLeft" ? -1 : 1));
        return;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const buttons = [...$("dictionaryLibraryList").querySelectorAll("[data-dictionary-library-word]")];
      if (!buttons.length) return;
      event.preventDefault();
      $("dictionaryLibraryList").classList.add("is-keyboard-navigation");
      const currentIndex = buttons.findIndex((button) => button.classList.contains("is-current"));
      const nextIndex = currentIndex < 0
        ? (event.key === "ArrowDown" ? 0 : buttons.length - 1)
        : Math.max(0, Math.min(buttons.length - 1, currentIndex + (event.key === "ArrowDown" ? 1 : -1)));
      buttons[nextIndex].focus({ preventScroll: true });
      buttons[nextIndex].scrollIntoView({ block: "nearest" });
    }

    function renderDictionaryLibraryDetail(item) {
      state.dictionaryLookupEntry = item;
      $("dictionaryLibraryDetail").dataset.word = String(item.word || "");
      const translations = dictionaryTextLines(item.translation);
      const definitions = dictionaryTextLines(item.definition);
      const collins = Math.max(0, Math.min(5, Number(item.collins) || 0));
      const tags = dictionaryTags(item.tag);
      const bnc = dictionaryRank(item.bnc);
      const frq = dictionaryRank(item.frq);
      const exchanges = dictionaryExchanges(item.exchange);
      const collectionControl = dictionaryCollectionEnabled() ? dictionaryFavoriteButton(item.word) : dictionaryDisabledNote("收藏");
      const masteryHtml = dictionaryWordStudyEnabled() ? dictionaryWordMasteryHtml(item.word) : "";
      $("dictionaryLibraryDetail").innerHTML = `
        <div class="dictionary-lookup-header"><div class="dictionary-headword"><strong>${escapeHtml(item.word)}</strong>${item.phonetic ? `<button class="dictionary-phonetic" type="button" data-dictionary-pronounce="${escapeHtml(item.word)}" title="点击朗读" aria-label="朗读 ${escapeHtml(item.word)}">[${escapeHtml(item.phonetic)}]</button>` : ""}${dictionaryPronunciationButton(item.word)}</div><div class="dictionary-lookup-actions">${dictionaryAutoSpeakToggle()}${dictionaryPracticeButtons(item.word)}${collectionControl}</div></div>
        ${item.pos ? `<div class="dictionary-pos">${escapeHtml(item.pos)}</div>` : ""}
        ${translations.length ? `<div class="dictionary-meanings">${translations.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>` : ""}
        ${definitions.length ? `<div class="dictionary-definitions">${definitions.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>` : ""}
        ${collins || Number(item.oxford) > 0 || tags.length ? `<div class="dictionary-badges">${collins ? `<span class="dictionary-collins">柯林斯 <span class="dictionary-collins-stars">${"★".repeat(collins)}</span></span>` : ""}${Number(item.oxford) > 0 ? '<span class="dictionary-level-tag dictionary-level-oxford">Oxford 3000</span>' : ""}${dictionaryTagBadges(tags)}</div>` : ""}
        ${dictionaryFrequencyHtml(bnc, frq)}
        ${dictionaryExchangeHtml(exchanges)}
        ${masteryHtml}`;
      autoSpeakLookedUpWord(item.word);
    }

    function openDictionaryLibrary() {
      closeTopMenus();
      closeDictionaryLookup();
      $("dictionaryLibraryList").classList.remove("is-keyboard-navigation");
      state.dictionaryLibraryPage = 1;
      state.dictionaryLibraryType = "words";
      setDictionaryLibraryType("words", false);
      $("dictionaryLibraryModal").hidden = false;
      requestAnimationFrame(() => {
        updateDictionaryLibraryPageSize(false);
        renderDictionaryLibrary();
      });
    }

    function rememberDictionaryWordCategory(languageId = state.learningLanguageId) {
      if (state.dictionaryLibraryType !== "words") return;
      const select = $("dictionaryCategorySelect");
      if ([...select.options].some((option) => option.value === select.value)) {
        state.dictionaryWordCategoryByLanguage[languageId] = select.value;
      }
    }

    function syncDictionaryCategoryForType() {
      const select = $("dictionaryCategorySelect");
      const showWords = state.dictionaryLibraryType === "words";
      if (showWords) {
        const remembered = state.dictionaryWordCategoryByLanguage[state.learningLanguageId];
        if (remembered && [...select.options].some((option) => option.value === remembered)) {
          select.value = remembered;
        } else if (select.options.length) {
          select.value = select.options[0].value;
        }
      } else if ([...select.options].some((option) => option.value === "all")) {
        select.value = "all";
      }
      select.disabled = false;
      select.title = showWords ? "筛选当前语言的单词分类" : "筛选当前词条类型；切换类型时默认回到全部";
    }

    function setDictionaryLibraryType(type, refresh = true) {
      const nextType = ["suffixes", "phrases", "special"].includes(type) ? type : "words";
      if (state.dictionaryLibraryType === "words" && nextType !== "words") rememberDictionaryWordCategory();
      state.dictionaryLibraryType = nextType;
      state.dictionaryLibraryPage = 1;
      const showWords = state.dictionaryLibraryType === "words";
      const showSuffixes = state.dictionaryLibraryType === "suffixes";
      const showPhrases = state.dictionaryLibraryType === "phrases";
      const showSpecial = state.dictionaryLibraryType === "special";
      $("dictionaryWordsTabBtn").classList.toggle("is-active", showWords);
      $("dictionarySuffixesTabBtn").classList.toggle("is-active", showSuffixes);
      $("dictionaryPhrasesTabBtn").classList.toggle("is-active", showPhrases);
      $("dictionarySpecialTabBtn").classList.toggle("is-active", showSpecial);
      $("dictionaryWordsTabBtn").setAttribute("aria-selected", String(showWords));
      $("dictionarySuffixesTabBtn").setAttribute("aria-selected", String(showSuffixes));
      $("dictionaryPhrasesTabBtn").setAttribute("aria-selected", String(showPhrases));
      $("dictionarySpecialTabBtn").setAttribute("aria-selected", String(showSpecial));
      syncDictionaryCategoryForType();
      const typeLabel = showWords ? "单词" : showSuffixes ? "后缀" : showPhrases ? "短语" : "特殊词条";
      $("dictionaryLibraryDetail").innerHTML = `<div class="user-phrases-empty">将鼠标移到${typeLabel}上查看释义。</div>`;
      updateDictionaryStudyButton();
      if (refresh) renderDictionaryLibrary();
    }

    // 设置 dialog: categories on the left, the selected category's controls in the middle, and on the right the
    // category's introduction plus the explanation (the control's title) of the control under the pointer or in focus.
    function openSettings() {
      closeTopMenus();
      closeDictionaryLookup();
      $("settingsModal").hidden = false;
      selectSettingsTab(document.querySelector("[data-settings-tab].is-active")?.dataset.settingsTab || "appearance");
    }

    function closeSettings() {
      $("settingsModal").hidden = true;
    }

    function selectSettingsTab(key) {
      document.querySelectorAll("[data-settings-tab]").forEach((button) => {
        const active = button.dataset.settingsTab === key;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.settingsPanel !== key;
      });
      renderSettingsDetail(null);
    }

    function renderSettingsDetail(control) {
      const panel = document.querySelector("[data-settings-panel]:not([hidden])");
      if (!panel) return;
      const title = panel.querySelector(".settings-section-title")?.textContent || "";
      const explanation = control ? (control.getAttribute("title") || control.dataset.tooltip || "") : "";
      const name = control ? (control.closest("label")?.firstChild?.textContent || control.textContent || "").trim() : "";
      $("settingsDetail").innerHTML = `<h3>${escapeHtml(title)}</h3>
        <p class="settings-detail-intro">${escapeHtml(panel.dataset.settingsIntro || "")}</p>
        ${explanation ? `<div class="settings-detail-item">${name ? `<strong>${escapeHtml(name)}</strong>` : ""}<p>${escapeHtml(explanation).replace(/\n/g, "<br>")}</p></div>`
          : '<p class="small-note">把鼠标移到某个设置上，这里显示它的说明。</p>'}`;
    }

    function settingsControlAt(target) {
      return target?.closest?.(".settings-panels [title], .settings-panels [data-tooltip]") || null;
    }

    function closeDictionaryLibrary() {
      $("dictionaryLibraryModal").hidden = true;
      closeEnglishLookup();
    }

    let dictionaryStudyCountToken = 0;
    async function updateDictionaryStudyButton() {
      const buttons = [...document.querySelectorAll("[data-dictionary-study-mode]")];
      if (!buttons.length) return;
      const token = ++dictionaryStudyCountToken;
      const category = $("dictionaryCategorySelect").value;
      const hasStudyDeck = dictionaryStudyDeckEnabled() && state.dictionaryLibraryType === "words" && category !== "all";
      const available = hasStudyDeck && !state.dictionaryStudyLoading;
      buttons.forEach((button) => {
        const modeLabel = button.dataset.label || wordReviewModeLabel(button.dataset.dictionaryStudyMode);
        button.disabled = !available;
        button.textContent = `${modeLabel} (${hasStudyDeck ? "…" : 0})`;
      });
      if (!hasStudyDeck) return;
      try {
        const words = await loadDictionaryStudyWords(category, $("dictionarySortSelect").value);
        if (token !== dictionaryStudyCountToken || category !== $("dictionaryCategorySelect").value) return;
        buttons.forEach((button) => {
          const modeLabel = button.dataset.label || wordReviewModeLabel(button.dataset.dictionaryStudyMode);
          button.textContent = `${modeLabel} (${wordListReviewModeCount(words, button.dataset.dictionaryStudyMode)})`;
        });
      } catch {
        if (token !== dictionaryStudyCountToken) return;
        buttons.forEach((button) => {
          const modeLabel = button.dataset.label || wordReviewModeLabel(button.dataset.dictionaryStudyMode);
          button.textContent = `${modeLabel} (0)`;
        });
      }
    }

    const dictionaryStudyDeckCache = new Map();

    function wordListReviewModeCount(words, mode) {
      const records = loadWordReviewRecords();
      const marks = loadWordManualMastery();
      const keys = new Set(words.map((item) => dictionaryFavoriteKey(item.word)));
      return [...keys].filter((key) => wordModeMastered(key, mode, records, marks)).length;
    }

    async function loadDictionaryStudyWords(category, sort) {
      const cacheKey = `${currentDictionaryId()}:${category}:${sort}`;
      if (!dictionaryStudyDeckCache.has(cacheKey)) {
        dictionaryStudyDeckCache.set(cacheKey, window.langLSRWDictionary.studyList({ category, sort }, currentDictionaryId()).catch((error) => {
          dictionaryStudyDeckCache.delete(cacheKey);
          throw error;
        }));
      }
      return dictionaryStudyDeckCache.get(cacheKey);
    }

    async function openDictionaryWordStudy(mode, free = false) {
      if (!WORD_REVIEW_MODES.some((item) => item.id === mode)) return;
      const category = $("dictionaryCategorySelect").value;
      if (!dictionaryStudyDeckEnabled() || state.dictionaryLibraryType !== "words" || category === "all" || state.dictionaryStudyLoading) return;
      const label = $("dictionaryCategorySelect").selectedOptions[0]?.textContent || category;
      const sort = $("dictionarySortSelect").value;
      state.dictionaryStudyLoading = true;
      state.dictionaryStudyLoadingMode = mode;
      updateDictionaryStudyButton();
      try {
        const words = await loadDictionaryStudyWords(category, sort);
        if (!words.length) {
          alert(`${label}分类中没有可学习的单词。`);
          return;
        }
        openWordReview(mode, {
          source: "wordList",
          sourceLabel: label,
          deckCategory: category,
          words,
          wordIndex: new Map(words.map((item) => [dictionaryFavoriteKey(item.word), item]))
        }, free);
      } catch (error) {
        alert(`无法读取${label}词表：${error.message || error}`);
      } finally {
        state.dictionaryStudyLoading = false;
        state.dictionaryStudyLoadingMode = "";
        updateDictionaryStudyButton();
      }
    }

    function resetDictionaryLibrarySize() {
      const dialog = $("dictionaryLibraryModal").querySelector(".user-phrases-dialog");
      dialog.style.removeProperty("width");
      dialog.style.removeProperty("height");
      requestAnimationFrame(() => updateDictionaryLibraryPageSize());
    }

    function goToDictionaryLibraryPage(page) {
      const target = Math.max(1, Math.min(Number(page) || 1, state.dictionaryLibraryPageCount));
      if (target === state.dictionaryLibraryPage) return;
      state.dictionaryLibraryPage = target;
      state.dictionaryLibrarySelectFirstAfterRender = true;
      renderDictionaryLibrary();
      $("dictionaryLibraryList").scrollTop = 0;
    }

    function goToEnteredDictionaryPage() {
      goToDictionaryLibraryPage(Number.parseInt($("dictionaryPageInput").value, 10));
    }

    let dictionaryLibraryResizeTimer;
    function updateDictionaryLibraryPageSize(refresh = true) {
      const listHeight = $("dictionaryLibraryList").clientHeight;
      if (!listHeight) return;
      const nextPageSize = Math.max(5, Math.min(200, Math.floor(listHeight / 26)));
      if (nextPageSize === state.dictionaryLibraryPageSize) return;
      const firstVisibleIndex = (state.dictionaryLibraryPage - 1) * state.dictionaryLibraryPageSize;
      state.dictionaryLibraryPageSize = nextPageSize;
      state.dictionaryLibraryPage = Math.floor(firstVisibleIndex / nextPageSize) + 1;
      if (refresh && !$("dictionaryLibraryModal").hidden) renderDictionaryLibrary();
    }

    function scheduleDictionaryLibraryResize() {
      clearTimeout(dictionaryLibraryResizeTimer);
      dictionaryLibraryResizeTimer = setTimeout(() => updateDictionaryLibraryPageSize(), 100);
    }

    // Word favorites (favoriteWord) keep the learner's choices plus a few dictionary fields used to filter and sort
    // (f); meanings and forms are looked up in the dictionary when shown. The source sentence is a library reference
    // (s), or its text (st / sx) for sentences outside a built-in library.
    let userWordsMemo = { key: "", lists: new Map() };

    function favoriteWordItem(key, value) {
      const facets = value?.f || {};
      const source = resolveLibrarySentence(value?.s);
      return {
        word: String(value?.w || key),
        rating: Math.max(1, Math.min(5, Number(value?.r) || 1)),
        savedAt: new Date((Number(value?.t) || 0) * 1000).toISOString(),
        tag: String(facets.tag || ""),
        oxford: Number(facets.oxford) || 0,
        collins: Number(facets.collins) || 0,
        bnc: Number(facets.bnc) || 0,
        frq: Number(facets.frq) || 0,
        sourceSentence: source?.text || String(value?.st || ""),
        sourceTranslation: source?.translation || String(value?.sx || "")
      };
    }

    function loadUserWords(languageId = state.learningLanguageId) {
      const memoKey = `${userData.version}|${state.library.fingerprint}`;
      if (userWordsMemo.key !== memoKey) userWordsMemo = { key: memoKey, lists: new Map() };
      const scope = languageScope(languageId);
      if (!userWordsMemo.lists.has(scope)) {
        userWordsMemo.lists.set(scope, userData.entries("favoriteWord", scope)
          .map(({ key, value }) => favoriteWordItem(key, value))
          .sort((left, right) => right.savedAt.localeCompare(left.savedAt)));
      }
      return userWordsMemo.lists.get(scope);
    }

    function compactFacets(result) {
      const facets = {
        tag: String(result?.tag || ""),
        oxford: Number(result?.oxford) || 0,
        collins: Number(result?.collins) || 0,
        bnc: Number(result?.bnc) || 0,
        frq: Number(result?.frq) || 0
      };
      return Object.fromEntries(Object.entries(facets).filter(([, value]) => value));
    }

    // Where a word was saved from: the current practice sentence, as a library reference when possible.
    function currentSentenceSourceFields() {
      const item = state.sentences[state.index];
      const ref = librarySentenceRef(item);
      if (ref) return { s: ref };
      const text = currentSentence();
      return text ? { st: text, sx: currentTranslation() } : {};
    }

    function dictionaryFavoriteKey(word) {
      return String(word || "").trim().toLocaleLowerCase("en-US");
    }

    function isDictionaryFavorite(word) {
      const key = dictionaryFavoriteKey(word);
      return loadUserWords().some((item) => dictionaryFavoriteKey(item.word) === key);
    }

    function dictionaryFavoriteButton(word, animateSaved = false, languageId = state.learningLanguageId, words = null) {
      const savedItem = (words || loadUserWords(languageId)).find((item) => dictionaryFavoriteKey(item.word) === dictionaryFavoriteKey(word));
      const rating = savedItem ? Math.max(1, Math.min(5, Number(savedItem.rating) || 1)) : 0;
      const starIcon = '<svg class="dictionary-star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.75 5.57 6.15.89-4.45 4.34 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.26l6.15-.89L12 2.8Z"/></svg>';
      return `<div class="dictionary-rating${animateSaved && rating ? " is-just-saved" : ""}" role="group" aria-label="收藏等级">${[1, 2, 3, 4, 5].map((level) => `<button class="dictionary-favorite-button${level <= rating ? " is-saved" : ""}${level === rating ? " is-current-rating" : ""}" type="button" data-dictionary-favorite data-dictionary-word="${escapeHtml(word)}" data-favorite-language="${escapeHtml(languageId)}" data-dictionary-favorite-level="${level}" aria-label="${level} 星收藏${level === rating ? "，再次点击取消收藏" : ""}" aria-pressed="${level <= rating}">${starIcon}</button>`).join("")}</div>`;
    }

    function syncDictionaryFavoriteButtons(word, languageId, animateSaved = false) {
      const key = dictionaryFavoriteKey(word);
      [...document.querySelectorAll(".dictionary-rating")].forEach((group) => {
        const control = group.querySelector("[data-dictionary-favorite]");
        if (!control) return;
        const controlLanguage = control.dataset.favoriteLanguage || state.learningLanguageId;
        if (controlLanguage !== languageId || dictionaryFavoriteKey(control.dataset.dictionaryWord) !== key) return;
        group.outerHTML = dictionaryFavoriteButton(word, animateSaved, languageId);
      });
    }

    function dictionaryCollinsRating(item) {
      const rating = Math.max(0, Math.min(5, Number(item.collins) || 0));
      if (!rating) return "";
      const starIcon = '<svg class="dictionary-star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.75 5.57 6.15.89-4.45 4.34 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.26l6.15-.89L12 2.8Z"/></svg>';
      return `<div class="dictionary-rating is-collins-rating" aria-label="柯林斯 ${rating} 星">${Array.from({ length: rating }, () => `<span class="dictionary-favorite-button is-saved">${starIcon}</span>`).join("")}</div>`;
    }

    // One button beside a word's stars: 听写 practice of just this word (meanings shown), repeated until closed and never counted.
    function dictionaryPracticeButtons(word) {
      const safeWord = escapeHtml(String(word || "").trim());
      if (!safeWord) return "";
      return `<button class="dictionary-practice-button" type="button" data-dictionary-practice="listen" data-practice-word="${safeWord}" title="练习这个单词：听发音，结合释义写出单词；「下一个」会重新练这个词，不计入学习记录">练习</button>`;
    }

    function dictionaryPronunciationButton(word) {
      const safeWord = escapeHtml(String(word || "").trim());
      return safeWord
        ? `<button class="dictionary-pronunciation-button" type="button" data-dictionary-pronounce="${safeWord}" title="朗读 ${safeWord}" aria-label="朗读 ${safeWord}">🔊</button>`
        : "";
    }

    // Word lookup popover: optional automatic pronunciation whenever a word is looked up (an identity setting).
    function dictionaryAutoSpeakEnabled() {
      // On by default; only an explicit "0" (the learner unticked it) turns it off.
      return userData.get("settings", "dictionaryAutoSpeak", "global") !== "0";
    }

    function dictionaryAutoSpeakToggle() {
      return `<label class="dictionary-auto-speak" title="打开后，每次查询单词都自动朗读一遍"><input type="checkbox" data-dictionary-auto-speak ${dictionaryAutoSpeakEnabled() ? "checked" : ""}>自动发音</label>`;
    }

    function autoSpeakLookedUpWord(word) {
      if (word && dictionaryAutoSpeakEnabled()) speakText(word, { rate: currentReplayRate() });
    }

    function updateDictionaryAutoSpeak(control, word) {
      persistSetting("dictionaryAutoSpeak", control.checked ? "1" : "0");
      document.querySelectorAll("[data-dictionary-auto-speak]").forEach((checkbox) => {
        checkbox.checked = control.checked;
      });
      if (control.checked) autoSpeakLookedUpWord(word);
    }

    function pronounceDictionaryWord(button) {
      const word = String(button?.dataset.dictionaryPronounce || "").trim();
      if (word) speakText(word, { rate: currentReplayRate() });
    }

    function toggleDictionaryFavorite(button, entry = null) {
      const inUserDetail = Boolean(button.closest("#userPhraseDetail"));
      const inUserList = Boolean(button.closest("#userPhrasesList"));
      // The English reference popover saves English words into English favorites, whatever the learning language.
      const englishPopover = button.closest(".english-lookup-popover");
      const inEnglishReference = Boolean(englishPopover);
      const languageId = button.dataset.favoriteLanguage || state.learningLanguageId;
      const words = loadUserWords(languageId);
      const requestedWord = String(button.dataset.dictionaryWord || "").trim();
      const requestedIndex = requestedWord ? words.findIndex((item) => dictionaryFavoriteKey(item.word) === dictionaryFavoriteKey(requestedWord)) : -1;
      const result = requestedIndex >= 0 ? words[requestedIndex] : entry || (inEnglishReference ? englishPopover.lookupEntry : state.dictionaryLookupEntry);
      if (!result) return;
      const word = String(requestedWord || result.word || (inEnglishReference ? englishPopover : $("dictionaryLookupPopover")).dataset.word || "").trim();
      const key = dictionaryFavoriteKey(word);
      const existingIndex = words.findIndex((item) => dictionaryFavoriteKey(item.word) === key);
      const level = Math.max(1, Math.min(5, Number(button.dataset.dictionaryFavoriteLevel) || 1));
      const existingRating = existingIndex >= 0 ? Math.max(1, Math.min(5, Number(words[existingIndex].rating) || 1)) : 0;
      const saved = existingIndex < 0 || level !== existingRating;
      const scope = languageScope(languageId);
      if (existingIndex < 0) {
        const withSource = $("dictionaryLibraryModal").hidden && !inEnglishReference && languageId === state.learningLanguageId;
        userData.put("favoriteWord", key, {
          w: word,
          r: level,
          t: Math.floor(Date.now() / 1000),
          f: compactFacets(result),
          ...(withSource ? currentSentenceSourceFields() : {})
        }, scope);
      } else if (saved) {
        userData.put("favoriteWord", key, { ...(userData.get("favoriteWord", key, scope) || { w: word, t: Math.floor(Date.now() / 1000) }), r: level }, scope);
      } else {
        userData.remove("favoriteWord", key, scope);
      }
      scheduleCloudSync();
      syncDictionaryFavoriteButtons(word, languageId, saved);
      if (!$("userPhrasesModal").hidden) {
        renderUserPhrases();
        if (saved && inUserList) {
          const row = Array.from($("userPhrasesList").querySelectorAll("[data-user-word]")).find((item) => dictionaryFavoriteKey(item.dataset.userWord) === key);
          row?.querySelector(".dictionary-rating")?.classList.add("is-just-saved");
        }
      }
      if (!saved && inUserDetail) {
        $("userPhraseDetail").innerHTML = '<div class="user-phrases-empty">将鼠标移到单词上查看释义。</div>';
      }
    }

    function userWordMatchesCategory(item, category) {
      return languageDictionary().matchesCategory(item, category);
    }

    function filteredAndSortedUserWords(words) {
      const category = $("userWordsCategorySelect").value;
      const sort = $("userWordsSortSelect").value;
      const query = $("userWordsSearchInput").value.trim().toLocaleLowerCase("en-US");
      const filtered = words.filter((item) => {
        if (query && !String(item.word || "").toLocaleLowerCase("en-US").includes(query)) return false;
        return userWordMatchesCategory(item, category);
      });
      const rankedValue = (value) => {
        const rank = Number(value);
        return Number.isFinite(rank) && rank > 0 ? rank : Number.MAX_SAFE_INTEGER;
      };
      const alphabetical = (left, right) => String(left.word).localeCompare(String(right.word), currentLearningLanguage().id, { sensitivity: "base" });
      return filtered.sort((left, right) => {
        if (sort === "alphabetical") return alphabetical(left, right);
        if (sort === "rating") return (Number(right.rating) || 1) - (Number(left.rating) || 1) || alphabetical(left, right);
        if (sort === "bnc") return rankedValue(left.bnc) - rankedValue(right.bnc);
        if (sort === "frq") return rankedValue(left.frq) - rankedValue(right.frq);
        if (sort === "collins") return (Number(right.collins) || 0) - (Number(left.collins) || 0) || alphabetical(left, right);
        return String(right.savedAt || "").localeCompare(String(left.savedAt || ""));
      });
    }

    function renderUserPhrases() {
      const allWords = loadUserWords();
      const words = filteredAndSortedUserWords(allWords);
      const sentences = loadUserSentences();
      const pageCount = Math.max(1, Math.ceil(words.length / state.userWordsPageSize));
      const showCollinsRating = $("userWordsSortSelect").value === "collins";
      state.userWordsPage = Math.max(1, Math.min(state.userWordsPage, pageCount));
      state.userWordsPageCount = pageCount;
      const start = (state.userWordsPage - 1) * state.userWordsPageSize;
      const pageWords = words.slice(start, start + state.userWordsPageSize);
      $("userPhrasesSummary").textContent = `${words.length}/${allWords.length} 个单词 · ${sentences.length} 个句子`;
      $("userWordsCountText").textContent = `0 / ${words.length.toLocaleString()} 个单词`;
      $("userWordsPageInput").value = state.userWordsPage;
      $("userWordsPageInput").max = pageCount;
      $("userWordsPageCount").textContent = `/ ${pageCount.toLocaleString()} 页`;
      $("userWordsFirstPageBtn").disabled = state.userWordsPage <= 1;
      $("userWordsPrevPageBtn").disabled = state.userWordsPage <= 1;
      $("userWordsNextPageBtn").disabled = state.userWordsPage >= pageCount;
      $("userWordsLastPageBtn").disabled = state.userWordsPage >= pageCount;
      updateFavoriteReviewLaunchers();
      const reviewRecords = loadWordReviewRecords();
      const manualMastery = loadWordManualMastery();
      $("userPhrasesList").innerHTML = pageWords.length
        ? pageWords.map((item, index) => `<div class="user-word-item" role="button" tabindex="0" data-user-word="${escapeHtml(item.word)}" data-user-word-index="${start + index + 1}">${dictionaryWordStudyEnabled() ? wordReviewStatusIconsHtml(item.word, reviewRecords, manualMastery) : ""}<span class="user-word-label">${escapeHtml(item.word)}</span>${showCollinsRating ? dictionaryCollinsRating(item) : dictionaryFavoriteButton(item.word)}</div>`).join("")
        : `<div class="user-phrases-empty">${allWords.length ? "当前分类没有收藏单词。" : "还没有收藏单词。"}</div>`;

      const firstVisibleSentenceIndex = state.userSentencesPageRanges[state.userSentencesPage - 1]?.[0] ?? 0;
      const sentencesPageRanges = computeUserSentencesPageRanges(sentences);
      state.userSentencesPageRanges = sentencesPageRanges;
      const sentencesPageCount = sentencesPageRanges.length;
      const restoredPage = sentencesPageRanges.findIndex(([rangeStart, rangeEnd]) => firstVisibleSentenceIndex >= rangeStart && firstVisibleSentenceIndex < rangeEnd);
      state.userSentencesPage = restoredPage >= 0 ? restoredPage + 1 : Math.max(1, Math.min(state.userSentencesPage, sentencesPageCount));
      state.userSentencesPageCount = sentencesPageCount;
      const [sentencesStart, sentencesEnd] = sentencesPageRanges[state.userSentencesPage - 1] || [0, 0];
      const pageSentences = sentences.slice(sentencesStart, sentencesEnd);
      $("userSentencesPageInput").value = state.userSentencesPage;
      $("userSentencesPageInput").max = sentencesPageCount;
      $("userSentencesPageCount").textContent = `/ ${sentencesPageCount.toLocaleString()} 页`;
      $("userSentencesFirstPageBtn").disabled = state.userSentencesPage <= 1;
      $("userSentencesPrevPageBtn").disabled = state.userSentencesPage <= 1;
      $("userSentencesNextPageBtn").disabled = state.userSentencesPage >= sentencesPageCount;
      $("userSentencesLastPageBtn").disabled = state.userSentencesPage >= sentencesPageCount;
      $("userSentencesList").innerHTML = pageSentences.length
        ? pageSentences.map(userSentenceItemHtml).join("")
        : '<div class="user-phrases-empty">还没有收藏句子。</div>';

      $("userPhrasesList").querySelectorAll("[data-user-word]").forEach((button) => {
        const activate = () => {
          const word = button.dataset.userWord;
          const isAlreadyShown = dictionaryFavoriteKey($("userPhraseDetail").dataset.word) === dictionaryFavoriteKey(word);
          if (button.classList.contains("is-current") && isAlreadyShown) return;
          $("userPhrasesList").querySelectorAll(".is-current").forEach((item) => item.classList.remove("is-current"));
          button.classList.add("is-current");
          $("userWordsCountText").textContent = `${Number(button.dataset.userWordIndex).toLocaleString()} / ${words.length.toLocaleString()} 个单词`;
          const item = words.find((entry) => dictionaryFavoriteKey(entry.word) === dictionaryFavoriteKey(word));
          if (item) renderUserWordDetail(item);
        };
        const activateFromPointer = () => {
          const list = $("userPhrasesList");
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && list.contains(focused)) focused.blur();
          list.classList.remove("is-keyboard-navigation");
          activate();
        };
        button.addEventListener("mouseenter", activateFromPointer);
        button.addEventListener("pointermove", () => {
          if ($("userPhrasesList").classList.contains("is-keyboard-navigation")) activateFromPointer();
        });
        button.addEventListener("focus", activate);
      });
      if (state.userWordsSelectFirstAfterRender) {
        state.userWordsSelectFirstAfterRender = false;
        const firstWord = $("userPhrasesList").querySelector("[data-user-word]");
        if (firstWord) firstWord.focus({ preventScroll: true });
      }
    }

    // The saved favorite has no meanings of its own; they are looked up in the dictionary for display.
    let userWordDetailToken = 0;

    async function renderUserWordDetail(favorite) {
      const token = ++userWordDetailToken;
      $("userPhraseDetail").dataset.word = String(favorite.word || "");
      let entry = null;
      try {
        entry = await window.langLSRWDictionary.query(favorite.word, currentDictionaryId());
      } catch {
        entry = null;
      }
      if (token !== userWordDetailToken) return;
      const item = { ...(entry || {}), ...favorite, word: String(favorite.word || entry?.word || "") };
      state.dictionaryLookupEntry = item;
      const translations = dictionaryTextLines(item.translation);
      const definitions = dictionaryTextLines(item.definition);
      const collins = Math.max(0, Math.min(5, Number(item.collins) || 0));
      const tags = dictionaryTags(item.tag);
      const bnc = dictionaryRank(item.bnc);
      const frq = dictionaryRank(item.frq);
      const exchanges = dictionaryExchanges(item.exchange);
      $("userPhraseDetail").innerHTML = `
        <div class="dictionary-lookup-header">
          <div class="dictionary-headword"><strong>${escapeHtml(item.word)}</strong>${item.phonetic ? `<button class="dictionary-phonetic" type="button" data-dictionary-pronounce="${escapeHtml(item.word)}" title="点击朗读" aria-label="朗读 ${escapeHtml(item.word)}">[${escapeHtml(item.phonetic)}]</button>` : ""}${dictionaryPronunciationButton(item.word)}</div>
          <div class="dictionary-lookup-actions">${dictionaryAutoSpeakToggle()}${dictionaryPracticeButtons(item.word)}${dictionaryFavoriteButton(item.word)}</div>
        </div>
        ${item.pos ? `<div class="dictionary-pos">${escapeHtml(item.pos)}</div>` : ""}
        ${translations.length ? `<div class="dictionary-meanings">${translations.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>` : ""}
        ${definitions.length ? `<div class="dictionary-definitions">${definitions.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>` : ""}
        ${collins || Number(item.oxford) > 0 || tags.length ? `<div class="dictionary-badges">
          ${collins ? `<span class="dictionary-collins">柯林斯 <span class="dictionary-collins-stars">${"★".repeat(collins)}</span></span>` : ""}
          ${Number(item.oxford) > 0 ? '<span class="dictionary-level-tag dictionary-level-oxford">Oxford 3000</span>' : ""}
          ${dictionaryTagBadges(tags)}
        </div>` : ""}
        ${dictionaryFrequencyHtml(bnc, frq)}
        ${dictionaryExchangeHtml(exchanges)}
        ${entry ? "" : `<div class="dictionary-lookup-empty">没有查到释义：${escapeHtml(currentLearningLanguage().dictionaryName)}未安装，或词典中没有这个词。</div>`}
        ${item.sourceSentence ? `<div class="user-phrase-source"><div>${escapeHtml(item.sourceSentence)}</div>${item.sourceTranslation ? `<div>${escapeHtml(item.sourceTranslation)}</div>` : ""}</div>` : ""}
        ${dictionaryWordStudyEnabled() ? dictionaryWordMasteryHtml(item.word) : ""}`;
      autoSpeakLookedUpWord(item.word);
    }

    // Sentence favorites (favoriteSentence): a built-in library sentence is saved as a reference
    // { lib, id, lf, fp: null }; other sentences keep their text. Invalid references are left out of the list.
    let userSentencesMemo = { key: "", lists: new Map() };

    function loadUserSentences() {
      const memoKey = `${userData.version}|${state.library.fingerprint}`;
      if (userSentencesMemo.key !== memoKey) userSentencesMemo = { key: memoKey, lists: new Map() };
      const scope = languageScope();
      if (!userSentencesMemo.lists.has(scope)) {
        const items = userData.entries("favoriteSentence", scope).map(({ key, value }) => {
          const resolved = value?.lib ? resolveLibrarySentence(value) : null;
          if (value?.lib && !resolved) return null;
          return {
            recordKey: key,
            sentence: resolved ? resolved.text : String(value?.text || ""),
            translation: resolved ? resolved.translation : String(value?.tr || ""),
            sourceId: resolved ? String(value.id) : "",
            libraryId: resolved ? String(value.lib) : "",
            rating: Math.max(1, Math.min(5, Number(value?.r) || 1)),
            savedAt: new Date((Number(value?.t) || 0) * 1000).toISOString()
          };
        }).filter((item) => item && item.sentence);
        userSentencesMemo.lists.set(scope, items.sort((left, right) => right.savedAt.localeCompare(left.savedAt)));
      }
      return userSentencesMemo.lists.get(scope);
    }

    function userSentenceItemHtml(item) {
      const metaHtml = item.translation
        ? `<div class="user-sentence-meta"><span class="user-sentence-translation">${escapeHtml(item.translation)}</span></div>`
        : "";
      const loadButton = `<button class="user-sentence-load-button" type="button" data-load-sentence="${escapeHtml(item.sentence)}" title="加载到听写练习" aria-label="加载到听写练习">▶</button>`;
      return `<article class="user-sentence-item" tabindex="0"><div class="user-sentence-text">${escapeHtml(item.sentence)}</div>${loadButton}${sentenceFavoriteButton(item.sentence)}${metaHtml}</article>`;
    }

    function loadFavoriteSentenceIntoPractice(sentenceText) {
      const favorites = loadUserSentences();
      if (!favorites.length) return;
      const key = sentenceFavoriteKey(sentenceText);
      const matchIndex = favorites.findIndex((item) => sentenceFavoriteKey(item.sentence) === key);
      state.sentences = normalizeSentenceList(favorites.map((item) => ({
        id: item.sourceId || "",
        libraryId: item.libraryId || "",
        sentence: item.sentence,
        translation: item.translation
      })));
      state.index = Math.max(0, matchIndex);
      setCurrentLibrary("用户收藏", `当前句库：用户收藏（${state.sentences.length.toLocaleString()}句）`);
      closeUserPhrases();
      setActivePage("listenPage");
      resetCurrent(true);
    }

    function computeUserSentencesPageRanges(sentences) {
      if (!sentences.length) return [[0, 0]];
      const container = $("userSentencesList");
      const availableHeight = container.clientHeight;
      if (!availableHeight) return [[0, sentences.length]];
      container.innerHTML = sentences.map(userSentenceItemHtml).join("");
      const rows = [...container.querySelectorAll(".user-sentence-item")];
      const ranges = [];
      let start = 0;
      let accHeight = 0;
      rows.forEach((row, index) => {
        const rowHeight = row.offsetHeight;
        if (accHeight + rowHeight > availableHeight && index > start) {
          ranges.push([start, index]);
          start = index;
          accHeight = 0;
        }
        accHeight += rowHeight;
      });
      ranges.push([start, rows.length]);
      return ranges;
    }

    function sentenceFavoriteKey(sentence) {
      return String(sentence || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
    }

    function sentenceFavoriteButton(sentence, animateSaved = false) {
      if (!currentLearningLanguage().sentenceFavoritesEnabled) return "";
      const key = sentenceFavoriteKey(sentence);
      if (!key) return "";
      const savedItem = loadUserSentences().find((item) => sentenceFavoriteKey(item.sentence) === key);
      const rating = savedItem ? Math.max(1, Math.min(5, Number(savedItem.rating) || 1)) : 0;
      const starIcon = '<svg class="dictionary-star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.75 5.57 6.15.89-4.45 4.34 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.26l6.15-.89L12 2.8Z"/></svg>';
      return `<div class="dictionary-rating sentence-rating${animateSaved && rating ? " is-just-saved" : ""}" role="group" aria-label="句子收藏等级">${[1, 2, 3, 4, 5].map((level) => `<button class="dictionary-favorite-button${level <= rating ? " is-saved" : ""}${level === rating ? " is-current-rating" : ""}" type="button" data-sentence-favorite data-sentence="${escapeHtml(sentence)}" data-sentence-favorite-level="${level}" aria-label="${level} 星收藏句子${level === rating ? "，再次点击取消收藏" : ""}" aria-pressed="${level <= rating}">${starIcon}</button>`).join("")}</div>`;
    }

    function toggleSentenceFavorite(button) {
      const sentence = String(button.dataset.sentence || "").trim();
      const key = sentenceFavoriteKey(sentence);
      if (!key) return;
      const sentences = loadUserSentences();
      const existing = sentences.find((item) => sentenceFavoriteKey(item.sentence) === key);
      const level = Math.max(1, Math.min(5, Number(button.dataset.sentenceFavoriteLevel) || 1));
      const existingRating = existing ? Math.max(1, Math.min(5, Number(existing.rating) || 1)) : 0;
      const saved = !existing || level !== existingRating;
      const scope = languageScope();
      if (!existing) {
        const current = normalizeSentenceItem(state.sentences[state.index]);
        const source = sentenceFavoriteKey(current.text) === key
          ? current
          : normalizeSentenceItem(state.sentences.find((item) => sentenceFavoriteKey(sentenceText(item)) === key));
        const fromPractice = sentenceFavoriteKey(source.text) === key;
        const ref = fromPractice ? librarySentenceRef(source) : null;
        const savedAt = Math.floor(Date.now() / 1000);
        if (ref) {
          userData.put("favoriteSentence", `${ref.lib}#${ref.id}`, { ...ref, fp: null, r: level, t: savedAt }, scope);
        } else {
          userData.put("favoriteSentence", `t:${key}`, { text: sentence, tr: fromPractice ? source.translation : "", fp: null, r: level, t: savedAt }, scope);
        }
      } else if (saved) {
        userData.put("favoriteSentence", existing.recordKey, { ...(userData.get("favoriteSentence", existing.recordKey, scope) || {}), r: level }, scope);
      } else {
        userData.remove("favoriteSentence", existing.recordKey, scope);
      }
      scheduleCloudSync();
      const ratingGroup = button.closest(".dictionary-rating");
      const inTarget = Boolean(button.closest("#target"));
      if (ratingGroup) ratingGroup.outerHTML = sentenceFavoriteButton(sentence, saved);
      if (!inTarget && sentenceFavoriteKey(currentSentence()) === key) renderTarget();
      if (!$("userPhrasesModal").hidden) renderUserPhrases();
    }

    function setUserPhrasesView(view) {
      const showWords = view === "words";
      $("userPhrasesList").hidden = !showWords;
      $("userSentencesList").hidden = showWords;
      $("userWordsControls").hidden = !showWords;
      $("userWordsCount").hidden = !showWords;
      $("userWordsPagination").hidden = !showWords;
      $("userSentencesPagination").hidden = showWords;
      $("userPhrasesModal").querySelector(".user-phrases-layout").classList.toggle("is-sentences-view", !showWords);
      $("userWordsTabBtn").classList.toggle("is-active", showWords);
      $("userSentencesTabBtn").classList.toggle("is-active", !showWords);
      $("userWordsTabBtn").setAttribute("aria-selected", String(showWords));
      $("userSentencesTabBtn").setAttribute("aria-selected", String(!showWords));
      closeDictionaryLookup();
      delete $("userPhraseDetail").dataset.word;
      $("userPhraseDetail").innerHTML = `<div class="user-phrases-empty">${showWords ? "将鼠标移到单词上查看释义。" : "将鼠标移到句子上查看详情。"}</div>`;
    }

    function openUserPhrases() {
      closeTopMenus();
      closeDictionaryLookup();
      $("userPhrasesList").classList.remove("is-keyboard-navigation");
      setUserPhrasesView("words");
      $("userPhrasesModal").hidden = false;
      requestAnimationFrame(() => {
        updateUserWordsPageSize(false);
        renderUserPhrases();
      });
    }

    function closeUserPhrases() {
      $("userPhrasesModal").hidden = true;
      closeEnglishLookup();
    }

    // The interval factor (间隔扩大系数) is stored in hundredths as the record field `e` (250 = 2.5), so every step is
    // exact integer arithmetic and never drifts like 2.3 - 0.2 = 2.0999999999999996. It is divided by 100 only to
    // compute an interval and to display it.
    const WORD_REVIEW_START_EASE = 250;
    const WORD_REVIEW_MIN_EASE = 130;
    const WORD_REVIEW_MAX_EASE = 250;
    const WORD_REVIEW_EASE_RECOVERY = 5;
    const WORD_REVIEW_EASE_PENALTY = 20;

    function wordReviewEase(record) {
      return Number.isInteger(record?.e) ? record.e : WORD_REVIEW_START_EASE;
    }

    function easeText(hundredths) {
      return String(hundredths / 100);
    }
    const WORD_REVIEW_DAY_MS = 24 * 60 * 60 * 1000;
    const WORD_REVIEW_MASTERY_INTERVAL_DAYS = 21;
    const WORD_REVIEW_MASTERY_REPS = 3;
    const WORD_REVIEW_MODES = [
      { id: "recognize", label: "识义", minStars: 1, title: "看英文、听发音，回想意思（1 星及以上的收藏词）" },
      { id: "listen", label: "听写", minStars: 2, title: "只听发音，拼出单词（2 星及以上的收藏词）" },
      { id: "spell", label: "默写", minStars: 3, title: "只看中文，拼出单词（3 星及以上的收藏词）" }
    ];
    const WORD_REVIEW_INTERFACES = {
      recognize: {
        modalId: "wordRecognizeReviewModal",
        titleId: "wordRecognizeReviewTitle",
        progressId: "wordRecognizeReviewProgress",
        cardId: "wordRecognizeReviewCard"
      },
      listen: {
        modalId: "wordListenReviewModal",
        titleId: "wordListenReviewTitle",
        progressId: "wordListenReviewProgress",
        cardId: "wordListenReviewCard"
      },
      spell: {
        modalId: "wordSpellReviewModal",
        titleId: "wordSpellReviewTitle",
        progressId: "wordSpellReviewProgress",
        cardId: "wordSpellReviewCard"
      }
    };

    function wordReviewElements(mode = state.wordReview?.mode) {
      const ids = WORD_REVIEW_INTERFACES[mode];
      return ids ? {
        modal: $(ids.modalId),
        title: $(ids.titleId),
        progress: $(ids.progressId),
        card: $(ids.cardId),
        panel: $(ids.modalId)?.querySelector(".word-review-result-panel")
      } : {};
    }

    // wordProgress: one record per word of the current learning language,
    // { r: { mode: schedule }, m: { mode: manually-mastered time } }. Callers receive copies they may change freely.
    function loadWordReviewRecords() {
      const records = {};
      userData.entries("wordProgress", languageScope()).forEach(({ key, value }) => {
        if (value?.r && Object.keys(value.r).length) records[key] = structuredClone(value.r);
      });
      return records;
    }

    function loadWordManualMastery() {
      const marks = {};
      userData.entries("wordProgress", languageScope()).forEach(({ key, value }) => {
        if (value?.m && Object.keys(value.m).length) marks[key] = structuredClone(value.m);
      });
      return marks;
    }

    // Writes only the words whose part actually changed.
    function writeWordProgress(part, map) {
      const scope = languageScope();
      const keys = new Set([...Object.keys(map), ...userData.entries("wordProgress", scope).map((entry) => entry.key)]);
      keys.forEach((key) => {
        const current = userData.get("wordProgress", key, scope) || {};
        const next = { r: current.r || {}, m: current.m || {}, [part]: map[key] || {} };
        if (JSON.stringify(next) === JSON.stringify({ r: current.r || {}, m: current.m || {} })) return;
        if (!Object.keys(next.r).length && !Object.keys(next.m).length) userData.remove("wordProgress", key, scope);
        else userData.put("wordProgress", key, next, scope);
      });
      scheduleCloudSync();
    }

    function saveWordReviewRecords(records) {
      writeWordProgress("r", records);
    }

    function saveWordManualMastery(marks) {
      writeWordProgress("m", marks);
    }

    function wordModeMastered(key, mode, records, marks) {
      return Boolean(marks?.[key]?.[mode]) || wordReviewMastered(records?.[key]?.[mode]);
    }

    function wordReviewModeLabel(mode) {
      return WORD_REVIEW_MODES.find((item) => item.id === mode)?.label || "";
    }

    function wordReviewModeMinStars(mode) {
      return WORD_REVIEW_MODES.find((item) => item.id === mode)?.minStars || 1;
    }

    function updateFavoriteReviewLaunchers() {
      const category = $("userWordsCategorySelect").value;
      const words = loadUserWords().filter((item) => userWordMatchesCategory(item, category));
      const records = loadWordReviewRecords();
      const marks = loadWordManualMastery();
      document.querySelectorAll("[data-favorite-review-mode]").forEach((button) => {
        const mode = button.dataset.favoriteReviewMode;
        const count = words.filter((item) => wordReviewEligible(item, mode) && wordModeMastered(dictionaryFavoriteKey(item.word), mode, records, marks)).length;
        button.textContent = `${wordReviewModeLabel(mode)} (${count})`;
      });
    }

    // Three fixed-width slots (识义 / 听写 / 默写) left of each list word: 🕗 due, 📕 learning, ✅ mastered, blank untouched.
    function wordReviewStatusIconsHtml(word, records = loadWordReviewRecords(), marks = loadWordManualMastery()) {
      const now = Date.now();
      const modeRecords = records[dictionaryFavoriteKey(word)] || {};
      const modeMarks = marks[dictionaryFavoriteKey(word)] || {};
      return `<span class="word-review-status" role="button" data-word-status="${escapeHtml(word)}" title="点击可把识义、听写、默写标记为手动掌握🟢（例如很熟的词），或取消标记">${WORD_REVIEW_MODES.map(({ id }) => {
        const record = modeRecords[id];
        const icon = modeMarks[id] ? "🟢" : !record ? "" : Number(record.due) <= now ? "🕗" : wordReviewMastered(record) ? "✅" : "📕";
        return `<span>${icon}</span>`;
      }).join("")}</span>`;
    }

    function setWordManualMastery(word, modes, mastered) {
      const marks = loadWordManualMastery();
      const key = dictionaryFavoriteKey(word);
      const wordMarks = { ...(marks[key] || {}) };
      const now = new Date().toISOString();
      modes.forEach((mode) => {
        if (mastered) wordMarks[mode] = wordMarks[mode] || now;
        else delete wordMarks[mode];
      });
      if (Object.keys(wordMarks).length) marks[key] = wordMarks;
      else delete marks[key];
      saveWordManualMastery(marks);
      refreshWordReviewStatusIcons();
      updateFavoriteReviewLaunchers();
      updateDictionaryStudyButton();
      ["dictionaryLibraryDetail", "userPhraseDetail"].forEach((id) => {
        const detail = $(id);
        const mastery = detail?.querySelector(".dictionary-mastery");
        const headword = detail?.querySelector(".dictionary-headword strong")?.textContent;
        if (mastery && headword && dictionaryFavoriteKey(headword) === key) mastery.outerHTML = dictionaryWordMasteryHtml(word);
      });
    }

    function openWordStatusMenu(event, word) {
      event.preventDefault();
      event.stopPropagation();
      const marks = loadWordManualMastery()[dictionaryFavoriteKey(word)] || {};
      const items = WORD_REVIEW_MODES.map(({ id, label }) => marks[id]
        ? `<button type="button" role="menuitem" data-word-status-action="undo" data-mode="${id}" title="取消手动掌握，恢复显示原来的学习状态，并重新参加${label}练习">${label}：取消手动掌握</button>`
        : `<button type="button" role="menuitem" data-word-status-action="master" data-mode="${id}" title="把${label}标记为手动掌握🟢：统计为已掌握，不再出现在${label}练习中；原来的学习记录保留">${label}：标记为手动掌握🟢</button>`);
      const allMarked = WORD_REVIEW_MODES.every(({ id }) => marks[id]);
      const menu = $("wordStatusMenu");
      menu.dataset.word = word;
      menu.innerHTML = `${items.join("")}<div class="grammar-context-separator"></div>${allMarked
        ? '<button type="button" role="menuitem" data-word-status-action="undo-all" title="识义、听写、默写全部取消手动掌握">三项全部取消手动掌握</button>'
        : '<button type="button" role="menuitem" data-word-status-action="master-all" title="识义、听写、默写全部标记为手动掌握">三项全部标记为手动掌握🟢</button>'}`;
      menu.hidden = false;
      const rect = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8))}px`;
    }

    function closeWordStatusMenu() {
      $("wordStatusMenu").hidden = true;
    }

    function refreshWordReviewStatusIcons() {
      const records = loadWordReviewRecords();
      const marks = loadWordManualMastery();
      document.querySelectorAll("#dictionaryLibraryList [data-dictionary-library-word], #userPhrasesList [data-user-word]").forEach((row) => {
        const status = row.querySelector(".word-review-status");
        if (status) status.outerHTML = wordReviewStatusIconsHtml(row.dataset.dictionaryLibraryWord || row.dataset.userWord, records, marks);
      });
    }

    function wordReviewMastered(record) {
      return Number(record?.interval) >= WORD_REVIEW_MASTERY_INTERVAL_DAYS
        && Number(record?.reps) >= WORD_REVIEW_MASTERY_REPS
        && record?.lastGrade === "good";
    }

    function wordReviewEligible(item, mode) {
      const stars = Math.max(1, Math.min(5, Number(item?.rating) || 1));
      return stars >= wordReviewModeMinStars(mode);
    }

    function normalizeReviewAnswer(value) {
      return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
    }

    function wordReviewSourceItems(review = state.wordReview) {
      if (review?.source === "wordList") return review.words || [];
      return filteredAndSortedUserWords(loadUserWords()).filter((item) => wordReviewEligible(item, review?.mode || "recognize"));
    }

    function wordReviewRecord(item, mode, review = state.wordReview) {
      return review?.records?.[dictionaryFavoriteKey(item?.word)]?.[mode] || null;
    }

    function buildWordReviewQueue(mode, review = state.wordReview) {
      const now = Date.now();
      const marks = loadWordManualMastery();
      const words = (review?.source === "wordList"
        ? wordReviewSourceItems(review)
        : filteredAndSortedUserWords(loadUserWords()).filter((item) => wordReviewEligible(item, mode)))
        .filter((item) => !marks[dictionaryFavoriteKey(item.word)]?.[mode]);
      const dueReviewed = words
        .filter((item) => wordReviewRecord(item, mode, review) && Number(wordReviewRecord(item, mode, review).due) <= now)
        .sort((a, b) => Number(wordReviewRecord(a, mode, review).due) - Number(wordReviewRecord(b, mode, review).due));
      // New words are drawn at random from all not-yet-practised words in scope, not taken in list order.
      const fresh = shuffledWordReviewItems(words.filter((item) => !wordReviewRecord(item, mode, review))).slice(0, practiceGroupSize("wordGroupSize"));
      // New words form groups of the 单词练习每组 setting; the group number counts what this scope has already learned.
      const learned = words.filter((item) => wordReviewRecord(item, mode, review)).length;
      if (review) review.queueParts = { due: dueReviewed.length, fresh: fresh.length, group: Math.floor(learned / practiceGroupSize("wordGroupSize")) + 1 };
      return [...dueReviewed, ...fresh].map((item) => dictionaryFavoriteKey(item.word));
    }

    function wordReviewResultSummary(review) {
      return `答对 ${review.results.good} · 答错 ${review.results.again}`;
    }

    function wordReviewProgressText(review) {
      const position = review.index + 1;
      if (review.source === "single") return `单词练习 · 「下一个」重新练这个词 · 不计入记忆`;
      if (review.free) return `自由练习 · 第 ${position} / ${review.queue.length} 个 · 不计入记忆`;
      const { due = 0, fresh = 0, group = 1 } = review.queueParts || {};
      if (review.index < due) return `到期复习 · 第 ${position} / ${due} 个`;
      if (review.index < due + fresh) return `新词学习 · 第 ${group} 组 · 第 ${review.index - due + 1} / ${fresh} 个`;
      return `忘了再练 · 第 ${review.index - due - fresh + 1} / ${review.queue.length - due - fresh} 个`;
    }

    // Free practice: already-learned words of this mode in the active scope, regardless of due time.
    // Results are never saved, so it cannot change the spaced-repetition schedule.
    function buildFreeWordReviewQueue(mode, review = state.wordReview) {
      const learned = wordReviewSourceItems(review).filter((item) => wordReviewRecord(item, mode, review));
      return shuffledWordReviewItems(learned).slice(0, practiceGroupSize("wordGroupSize")).map((item) => dictionaryFavoriteKey(item.word));
    }

    function nextWordReviewDue(mode, review = state.wordReview) {
      const words = review?.source === "wordList"
        ? wordReviewSourceItems(review)
        : loadUserWords().filter((item) => wordReviewEligible(item, mode));
      const upcoming = words
        .map((item) => Number(wordReviewRecord(item, mode, review)?.due))
        .filter((due) => Number.isFinite(due) && due > Date.now())
        .sort((a, b) => a - b);
      return upcoming[0] || 0;
    }

    function scheduleWordReview(record, grade) {
      const now = Date.now();
      const next = {
        interval: Number(record?.interval) || 0,
        e: wordReviewEase(record),
        reps: Number(record?.reps) || 0,
        lapses: Number(record?.lapses) || 0
      };
      if (grade === "again") {
        next.reps = 0;
        next.lapses += 1;
        next.interval = 0;
        next.e = Math.max(WORD_REVIEW_MIN_EASE, next.e - WORD_REVIEW_EASE_PENALTY);
        return { ...next, lastGrade: grade, due: now + 10 * 60 * 1000, lastReviewedAt: new Date(now).toISOString() };
      }
      next.interval = next.reps === 0 ? 1 : next.reps === 1 ? 3 : Math.round(next.interval * next.e / 100);
      // A clean recall slowly restores the factor, so early lapses do not slow the word down forever.
      next.e = Math.min(WORD_REVIEW_MAX_EASE, next.e + WORD_REVIEW_EASE_RECOVERY);
      next.reps += 1;
      return { ...next, lastGrade: grade, due: now + next.interval * WORD_REVIEW_DAY_MS, lastReviewedAt: new Date(now).toISOString() };
    }

    function saveWordReviewGrade(key, mode, grade) {
      const review = state.wordReview;
      if (!review) return;
      const existing = review.records[key] && typeof review.records[key] === "object" ? review.records[key] : {};
      review.records[key] = {
        ...existing,
        [mode]: scheduleWordReview(existing[mode], grade)
      };
      saveWordReviewRecords(review.records);
    }

    async function clearWordReviewMemory(mode, source) {
      const label = wordReviewModeLabel(mode);
      if (!label) return;
      let items;
      let sourceLabel;
      if (source === "wordList") {
        const category = $("dictionaryCategorySelect").value;
        if (state.dictionaryLibraryType !== "words" || category === "all") return;
        sourceLabel = $("dictionaryCategorySelect").selectedOptions[0]?.textContent || category;
        try {
          items = await loadDictionaryStudyWords(category, $("dictionarySortSelect").value);
        } catch (error) {
          alert(`无法读取${sourceLabel}词表：${error.message || error}`);
          return;
        }
      } else {
        items = loadUserWords();
        sourceLabel = "收藏";
      }
      if (!confirm(`清除“${sourceLabel}”范围内所有单词的“${label}”学习记录？这些单词在其他词表和收藏中的同一掌握记录也会被清除，无法撤销。`)) return;
      const records = loadWordReviewRecords();
      items.forEach((item) => {
        const key = dictionaryFavoriteKey(item.word);
        if (!records[key]) return;
        delete records[key][mode];
        if (!Object.keys(records[key]).length) delete records[key];
      });
      saveWordReviewRecords(records);
      const marks = loadWordManualMastery();
      items.forEach((item) => {
        const key = dictionaryFavoriteKey(item.word);
        if (!marks[key]) return;
        delete marks[key][mode];
        if (!Object.keys(marks[key]).length) delete marks[key];
      });
      saveWordManualMastery(marks);
      updateFavoriteReviewLaunchers();
      updateDictionaryStudyButton();
      refreshWordReviewStatusIcons();
    }

    function openWordReviewLauncherMenu(event, mode, source) {
      const label = wordReviewModeLabel(mode);
      if (!label) return;
      event.preventDefault();
      const menu = $("wordReviewLauncherMenu");
      menu.dataset.mode = mode;
      menu.dataset.source = source;
      $("wordReviewFreeBtn").textContent = `自由练习${label}（不计入记忆）`;
      $("wordReviewClearBtn").textContent = `清除${label}记忆`;
      menu.hidden = false;
      const rect = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8))}px`;
      $("wordReviewFreeBtn").focus();
    }

    // Controls keep their explanation in `title`; the shared tooltip takes it over on first hover
    // so it appears after CONTROL_TOOLTIP_DELAY_MS instead of the browser's slower native tooltip.
    const CONTROL_TOOLTIP_DELAY_MS = 300;
    let controlTooltipTimer = 0;
    let controlTooltipTarget = null;
    let controlTooltipPoint = { x: 0, y: 0 };

    function hideControlTooltip() {
      clearTimeout(controlTooltipTimer);
      controlTooltipTarget = null;
      $("controlTooltip").hidden = true;
    }

    function showControlTooltip() {
      const target = controlTooltipTarget;
      if (!target?.isConnected || !target.dataset.tooltip) return;
      const tooltip = $("controlTooltip");
      tooltip.textContent = target.dataset.tooltip;
      tooltip.hidden = false;
      const rect = tooltip.getBoundingClientRect();
      const { x, y } = controlTooltipPoint;
      const top = y + 20 + rect.height <= window.innerHeight - 8 ? y + 20 : y - rect.height - 10;
      tooltip.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
      tooltip.style.top = `${Math.max(8, top)}px`;
    }

    function handleControlTooltipOver(event) {
      if (event.pointerType === "touch") return;
      const target = event.target.closest?.("[title], [data-tooltip]");
      if (target && target === controlTooltipTarget && !target.hasAttribute("title")) return;
      hideControlTooltip();
      if (!target) return;
      if (target.hasAttribute("title")) {
        const text = target.getAttribute("title");
        target.removeAttribute("title");
        if (text) target.dataset.tooltip = text;
      }
      if (!target.dataset.tooltip) return;
      controlTooltipTarget = target;
      controlTooltipPoint = { x: event.clientX, y: event.clientY };
      controlTooltipTimer = setTimeout(showControlTooltip, CONTROL_TOOLTIP_DELAY_MS);
    }

    // Hovering a 背单词 launcher replaces the word detail pane with that mode's memory rules. The help stays
    // after the pointer leaves so it can be scrolled; hovering a word replaces it, and pressing a launcher restores the detail.
    let wordReviewHelpSaved = null;
    let wordReviewHelpToken = 0;

    async function wordReviewHelpStats(mode, source) {
      let words;
      if (source === "favorites") {
        const category = $("userWordsCategorySelect").value;
        words = loadUserWords().filter((item) => userWordMatchesCategory(item, category) && wordReviewEligible(item, mode));
      } else {
        const category = $("dictionaryCategorySelect").value;
        if (state.dictionaryLibraryType !== "words" || category === "all") return null;
        try {
          words = await loadDictionaryStudyWords(category, $("dictionarySortSelect").value);
        } catch {
          return null;
        }
      }
      const records = loadWordReviewRecords();
      const marks = loadWordManualMastery();
      const now = Date.now();
      const stats = { fresh: 0, learning: 0, mastered: 0, due: 0 };
      words.forEach((item) => {
        const key = dictionaryFavoriteKey(item.word);
        const record = records[key]?.[mode];
        if (marks[key]?.[mode]) stats.mastered += 1;
        else if (!record) stats.fresh += 1;
        else if (wordReviewMastered(record)) stats.mastered += 1;
        else stats.learning += 1;
        if (record && !marks[key]?.[mode] && Number(record.due) <= now) stats.due += 1;
      });
      return stats;
    }

    function wordReviewHelpHtml(mode, source, stats) {
      const label = wordReviewModeLabel(mode);
      const scope = source === "favorites"
        ? `收藏中 ${wordReviewModeMinStars(mode)} 星及以上的单词，按收藏页当前分类（${escapeHtml($("userWordsCategorySelect").selectedOptions[0]?.textContent || "全部")}）统计。`
        : `词表【${escapeHtml($("dictionaryCategorySelect").selectedOptions[0]?.textContent || "当前分类")}】中的全部单词。`;
      const statItems = [["未学习", "fresh", " is-new"], ["学习中📕", "learning", " is-learning"], ["已掌握✅", "mastered", " is-mastered"], ["已到期🕗", "due", " is-due"]];
      const statsHtml = stats
        ? `<div class="dictionary-mastery-items">${statItems.map(([name, key, cls]) => `<div class="dictionary-mastery-item${cls}"><div class="dictionary-mastery-head"><b>${name}</b><span>${stats[key].toLocaleString()}</span></div></div>`).join("")}</div>`
        : '<div class="small-note">正在统计…（词库请先选一个词表）</div>';
      const { wordLabel, meaningLabel } = currentLearningLanguage();
      const method = {
        recognize: `看${wordLabel}单词和音标（自动朗读），从 5 个选项中选出正确的${meaningLabel}意思。`,
        listen: `只听发音（自动朗读），看字母格和字母数，拼写出这个单词；答完后才显示${meaningLabel}释义。`,
        spell: `只看${meaningLabel}释义和词性，拼写出这个单词；答完之前不朗读，避免发音泄露拼写。`
      }[mode];
      return `
        <div class="word-review-help">
          <div class="word-review-help-title"><strong>${label}</strong><span>记忆机制</span></div>
          <section><div class="dictionary-section-label">1. 练习范围</div><ul><li>${scope}</li></ul>${statsHtml}</section>
          <section><div class="dictionary-section-label">2. 练习方式</div><ul><li>${method}</li></ul></section>
          <section><div class="dictionary-section-label">3. 练习组题</div><ul>
            <li><b>到期复习</b>：已到复习时间的词，最早到期的排最前，不限数量。</li>
            <li><b>新词学习</b>：从没练过的词，每轮最多 ${practiceGroupSize("wordGroupSize")} 个；每 ${practiceGroupSize("wordGroupSize")} 个新词为一组，进度栏显示第几组。</li>
            <li><b>忘了再练</b>：本轮答错的词追加到队尾，本轮再考一次。</li>
          </ul></section>
          <section><div class="dictionary-section-label">4. 复习时间怎么定</div>
            <ul>
            <li>如果本次<b>答对</b>：<b>下次间隔天数 = 上次间隔天数 × 间隔扩大系数</b>（从答题那一刻算起）。</li>
            <li><b>前两次例外</b>：新词或答错后，第 1 次答对隔 1 天，第 2 次隔 3 天，第 3 次起用上面的公式。</li>
            <li><b>答错</b>：间隔天数清零，10 分钟后本轮再考；之后重新从 1 天、3 天开始。</li>
            </ul>
            <p><b>间隔扩大系数</b></p><ul>
            <li>起始＝${easeText(WORD_REVIEW_START_EASE)}；答错 −${easeText(WORD_REVIEW_EASE_PENALTY)}，答对 +${easeText(WORD_REVIEW_EASE_RECOVERY)}；范围：${easeText(WORD_REVIEW_MIN_EASE)}~${easeText(WORD_REVIEW_MAX_EASE)}。</li>
            <li>最低 1.3，保证答对后，间隔天数至少增加 30%，不会永远卡在原地。</li>
            <li>越常答错的词间隔扩大系数越低、考得越勤；之后一直答对，间隔扩大系数会慢慢恢复。</li>
            </ul>
            <p><b>连续答对次数</b></p><ul>
            <li>答对 +1，答错清零。不影响间隔天数，是判断是否达到掌握标准的条件之一。</li>
            </ul>
          </section>
          <section><div class="dictionary-section-label">5. 掌握</div><ul>
            <li>同时满足以下两条才算已掌握：复习间隔天数 ≥ ${WORD_REVIEW_MASTERY_INTERVAL_DAYS}；连续答对 ≥ ${WORD_REVIEW_MASTERY_REPS} 次。答错一次会立即取消掌握。</li>
            <li>按钮“${label}”上的数字就是当前范围内已掌握的词数。</li>
            <li>很熟的词可以点列表里的状态图标，标记为<b>手动掌握🟢</b>：算作已掌握，不再出现在${label}练习中；随时可以取消。</li>
          </ul></section>
          <section><div class="dictionary-section-label">6. 其他</div><ul>
            <li>识义、听写、默写的记录相互独立，互不影响。</li>
            <li>同一个单词在收藏和各个词表中共用一份记录，在任一处练习都会更新。</li>
            <li>右键按钮：<b>自由练习</b>（练已学过的词，不影响复习安排）或<b>清除${label}记忆</b>。</li>
          </ul></section>
        </div>`;
    }

    async function showWordReviewHelp(button) {
      const mode = button.dataset.favoriteReviewMode || button.dataset.dictionaryStudyMode;
      const source = button.dataset.favoriteReviewMode ? "favorites" : "wordList";
      const detail = $(source === "favorites" ? "userPhraseDetail" : "dictionaryLibraryDetail");
      if (!detail || !wordReviewModeLabel(mode)) return;
      if (!detail.querySelector(".word-review-help")) wordReviewHelpSaved = { detail, html: detail.innerHTML, entry: state.dictionaryLookupEntry, scrollTop: detail.scrollTop };
      const token = ++wordReviewHelpToken;
      detail.innerHTML = wordReviewHelpHtml(mode, source, null);
      detail.scrollTop = 0;
      const stats = await wordReviewHelpStats(mode, source);
      if (token !== wordReviewHelpToken || !stats || !detail.querySelector(".word-review-help")) return;
      const scrollTop = detail.scrollTop;
      detail.innerHTML = wordReviewHelpHtml(mode, source, stats);
      detail.scrollTop = scrollTop;
    }

    function hideWordReviewHelp() {
      wordReviewHelpToken += 1;
      const saved = wordReviewHelpSaved;
      wordReviewHelpSaved = null;
      if (!saved || !saved.detail.querySelector(".word-review-help")) return;
      saved.detail.innerHTML = saved.html;
      saved.detail.scrollTop = saved.scrollTop;
      state.dictionaryLookupEntry = saved.entry;
    }

    function closeWordReviewLauncherMenu() {
      $("wordReviewLauncherMenu").hidden = true;
    }

    function currentWordReviewItem() {
      return state.wordReview?.currentItem || null;
    }

    // Spelling cards cover the whole word with one mask; the first `revealed` letters (typed correctly so far or shown by
    // hints) are uncovered one by one. A non-letter (space, hyphen, apostrophe) uncovers once every letter before it does.
    // With `typed` (after answering), letters that differ from the learner's input at the same letter position are red.
    function wordReviewPatternHtml(word, revealed, typed = null) {
      const rules = languageText();
      const typedLetters = typed === null ? null : Array.from(String(typed)).filter(rules.isLetterChar).map(rules.normalizeChar);
      let letters = 0;
      return Array.from(word).map((char) => {
        const isLetter = rules.isLetterChar(char);
        const shown = isLetter ? letters < revealed : letters <= revealed;
        const wrong = Boolean(typedLetters) && isLetter && typedLetters[letters] !== rules.normalizeChar(char);
        if (isLetter) letters += 1;
        return `<span class="word-review-letter${shown ? " is-shown" : ""}${wrong ? " is-wrong-letter" : ""}">${escapeHtml(char === " " ? "\u00a0" : char)}</span>`;
      }).join("");
    }

    // Letters typed correctly from the start of the word (case-insensitive, accents strict per language rules).
    function wordReviewTypedLetters(word, input) {
      const rules = languageText();
      const target = Array.from(String(word || "")).filter(rules.isLetterChar).map(rules.normalizeChar);
      const typed = Array.from(String(input || "")).filter(rules.isLetterChar).map(rules.normalizeChar);
      let count = 0;
      while (count < target.length && count < typed.length && typed[count] === target[count]) count += 1;
      return count;
    }

    function wordReviewLetterCount(word) {
      return Array.from(String(word || "")).filter(languageText().isLetterChar).length;
    }

    function wordReviewRevealedLetters(review, word) {
      if (review.answered) return wordReviewLetterCount(word);
      return Math.max(review.hints || 0, wordReviewTypedLetters(word, review.input));
    }

    // Typing uncovers the mask live, without re-rendering the card (so the input keeps its focus and caret).
    function updateWordReviewMask(input) {
      const review = state.wordReview;
      const item = currentWordReviewItem();
      if (!review || review.answered || review.mode === "recognize" || !item) return;
      review.input = input.value;
      const pattern = input.closest(".word-review-card, [id$='ReviewCard']")?.querySelector("[data-word-review-pattern]")
        || document.querySelector("[data-word-review-pattern]");
      if (pattern) pattern.innerHTML = wordReviewPatternHtml(String(item.word || ""), wordReviewRevealedLetters(review, item.word));
      const main = document.querySelector(".word-review-modal:not([hidden]) [data-word-review-main]");
      if (main) main.innerHTML = wordReviewMainButtonHtml(review, item);
      // 听写: a fully correct spelling is answered at once, so the result panel shows the word without pressing Enter.
      if (review.mode === "listen" && wordReviewInputCorrect(review, item)) {
        answerWordReview();
        return;
      }
      // 默写: say the word as soon as it is spelled right, once per card, without waiting for Enter.
      if (review.mode === "spell" && review.spokenIndex !== review.index && wordReviewInputCorrect(review, item)) {
        review.spokenIndex = review.index;
        speakReviewWord(item.word);
      }
    }

    function speakReviewWord(word) {
      if (word) speakText(word, { rate: currentReplayRate() });
    }

    function wordReviewMeaningsHtml(item) {
      const meanings = dictionaryTextLines(item.translation).slice(0, 3);
      return `${item.pos ? `<div class="word-review-pos">${escapeHtml(item.pos)}</div>` : ""}
        <div class="word-review-meanings">${meanings.length ? meanings.map((line) => `<div>${escapeHtml(line)}</div>`).join("") : `<div>（该词条暂无${currentLearningLanguage().meaningLabel}释义）</div>`}</div>`;
    }

    function wordReviewAnswerHtml(item) {
      return `<div class="word-review-answer"><strong>${escapeHtml(item.word)}</strong>${item.phonetic ? ` <button type="button" class="dictionary-phonetic" data-word-review-action="speak" title="点击朗读">[${escapeHtml(item.phonetic)}]</button>` : ""}</div>
        ${item.sourceSentence ? `<div class="word-review-source">${escapeHtml(item.sourceSentence)}</div>` : ""}`;
    }

    function wordReviewChoiceText(item) {
      const translations = dictionaryTextLines(item?.translation);
      if (translations.length) return translations.slice(0, 2).join("；");
      return dictionaryTextLines(item?.definition)[0] || "";
    }

    function shuffledWordReviewItems(items) {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [result[index], result[target]] = [result[target], result[index]];
      }
      return result;
    }

    // Extra 识义 distractor words when the favorites are too few: a word-list category where the dictionary has one
    // (English: Oxford 3000), otherwise one random page of ordinary words from the learning language's dictionary.
    const reviewFallbackPageCounts = new Map();

    async function loadReviewFallbackWords() {
      const category = currentLearningLanguage().reviewDistractorCategory;
      if (category) return loadDictionaryStudyWords(category, "alphabetical");
      const dictionaryId = currentDictionaryId();
      const pageSize = 60;
      if (!reviewFallbackPageCounts.has(dictionaryId)) {
        const first = await window.langLSRWDictionary.list({ entryType: "words", page: 1, pageSize }, dictionaryId);
        reviewFallbackPageCounts.set(dictionaryId, first.pageCount);
      }
      const page = 1 + Math.floor(Math.random() * reviewFallbackPageCounts.get(dictionaryId));
      return (await window.langLSRWDictionary.list({ entryType: "words", page, pageSize }, dictionaryId)).rows;
    }

    async function loadRecognizeDistractors(review, item) {
      const currentKey = dictionaryFavoriteKey(item.word);
      const correctText = wordReviewChoiceText(item);
      const sourceItems = wordReviewSourceItems(review);
      let fallbackItems = [];
      if (sourceItems.length < 16) {
        try {
          fallbackItems = await loadReviewFallbackWords();
        } catch {
          fallbackItems = [];
        }
      }
      const seenWords = new Set([currentKey]);
      const candidates = shuffledWordReviewItems([...sourceItems, ...fallbackItems]).filter((candidate) => {
        const key = dictionaryFavoriteKey(candidate?.word);
        if (!key || seenWords.has(key)) return false;
        seenWords.add(key);
        return true;
      }).slice(0, 18);
      const resolved = candidates.filter((candidate) => wordReviewChoiceText(candidate));
      const unresolved = candidates.filter((candidate) => !wordReviewChoiceText(candidate));
      if (unresolved.length) {
        try {
          resolved.push(...await window.langLSRWDictionary.queryMany(unresolved.map((candidate) => candidate.word), currentDictionaryId()));
        } catch {
          // The choices below can still use any already-resolved collection entries.
        }
      }
      const seenMeanings = new Set([normalizeReviewAnswer(correctText)]);
      return resolved.reduce((choices, candidate) => {
        if (choices.length >= 3) return choices;
        const text = wordReviewChoiceText(candidate);
        const normalized = normalizeReviewAnswer(text);
        if (!text || seenMeanings.has(normalized)) return choices;
        seenMeanings.add(normalized);
        choices.push(text);
        return choices;
      }, []);
    }

    async function prepareRecognizeChoices(review, item, loadToken) {
      const correctText = wordReviewChoiceText(item) || "该词条暂无释义";
      const distractors = await loadRecognizeDistractors(review, item);
      if (state.wordReview !== review || review.loadToken !== loadToken) return;
      const choices = distractors.slice(0, 3);
      while (choices.length < 3) choices.push("暂无其他候选释义");
      const includeCorrect = Math.random() < 0.75;
      const correctIndex = includeCorrect ? Math.floor(Math.random() * 3) : 3;
      if (includeCorrect) choices[correctIndex] = correctText;
      review.recognizeChoices = choices;
      review.recognizeCorrectIndex = correctIndex;
      renderWordReview();
    }

    function renderRecognizeHeader(item) {
      const word = String(item.word || "");
      return `<div class="word-review-recognize-header"><div class="word-review-headword"><strong>${escapeHtml(word)}</strong>${item.phonetic ? `<button type="button" class="word-review-phonetic" data-word-review-action="speak" title="点击朗读">[${escapeHtml(item.phonetic)}]</button>` : ""}<button type="button" class="word-review-sound" data-word-review-action="speak" title="朗读">🔊</button></div><div class="word-review-rating">${dictionaryFavoriteButton(word)}</div></div>`;
    }

    function renderRecognizeCard(item) {
      const review = state.wordReview;
      const word = String(item.word || "");
      if (!review.recognizeChoices) {
        return `${renderRecognizeHeader(item)}<div class="word-review-choice-loading">正在准备释义选项...</div>`;
      }
      const choices = [
        ...review.recognizeChoices,
        "以上都不是",
        "不认识"
      ];
      return `
        ${renderRecognizeHeader(item)}
        <div class="word-review-choices">${choices.map((choice, index) => {
          const isCorrect = index === review.recognizeCorrectIndex;
          const isSelected = index === review.recognizeSelectedIndex;
          const isFocused = index === review.recognizeFocusedIndex;
          const stateClass = review.answered
            ? `${isCorrect ? " is-correct" : ""}${isSelected && !isCorrect ? " is-wrong" : ""}`
            : `${isFocused ? " is-focused" : ""}`;
          return `<button type="button" class="word-review-choice${stateClass}" data-word-review-choice="${index}" ${review.answered ? "disabled" : ""}><span>${index + 1}</span><span>${escapeHtml(choice)}</span></button>`;
        }).join("")}</div>
        ${wordReviewFooterHtml(review.answered, "Esc=关闭；按1–5或↑↓选择答案；Enter=下一个")}`;
    }

    function renderWordReviewResultPanel(item, mode) {
      const review = state.wordReview;
      let verdict;
      let body;
      if (mode === "recognize") {
        verdict = review.correct ? "回答正确" : review.recognizeSelectedIndex === 4 ? "已记为不认识" : "回答错误";
        body = `${wordReviewMeaningsHtml(item)}
          ${item.sourceSentence ? `<div class="word-review-source">${escapeHtml(item.sourceSentence)}</div>` : ""}`;
      } else {
        verdict = review.correct ? "正确" : review.revealed ? "已显示答案" : review.spelledRight ? "拼对了，但用了提示，算答错" : "拼写错误";
        body = `${wordReviewAnswerHtml(item)}
          ${mode === "listen" ? wordReviewMeaningsHtml(item) : ""}`;
      }
      return `
        <div class="word-review-result ${review.correct ? "is-correct" : "is-wrong"}">
          <div class="word-review-verdict">${verdict}</div>
          ${body}
        </div>`;
    }

    // Bottom row of every review card: key hints on the left, 下一个 at the bottom right (disabled until answered).
    function wordReviewFooterHtml(answered, keys) {
      return `<div class="word-review-footer"><span class="word-review-keys small-note">${keys}</span><button type="button" class="primary" data-word-review-action="next" title="${answered ? "进入下一个（Enter）" : "先作答，再进入下一个"}" ${answered ? "" : "disabled"}>下一个</button></div>`;
    }

    function renderSpellingCard(item, mode) {
      const review = state.wordReview;
      const word = String(item.word || "");
      const answered = review.answered;
      const correct = review.correct;
      const showSound = mode === "listen" || answered;
      return `
        <div class="word-review-prompt">
          ${mode === "spell" ? wordReviewMeaningsHtml(item) : ""}
          <div class="word-review-pattern-row">
            <span class="word-review-pattern" data-word-review-pattern aria-hidden="true">${wordReviewPatternHtml(word, wordReviewRevealedLetters(review, word), answered ? review.input : null)}</span>
            ${review.source === "single" && answered && item.phonetic ? `<button type="button" class="word-review-phonetic" data-word-review-action="speak" title="点击朗读">[${escapeHtml(item.phonetic)}]</button>` : ""}
            ${showSound ? '<button type="button" class="word-review-sound" data-word-review-action="speak" title="朗读">🔊</button>' : ""}
          </div>
          ${mode === "listen" && review.source === "single" ? wordReviewMeaningsHtml(item) + wordSpeakHtml(review) : ""}
        </div>
        <input class="word-review-input${answered ? (correct ? " is-correct" : " is-wrong") : ""}" data-word-review-input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="拼写这个单词" value="${escapeHtml(review.input)}" ${answered ? "readonly" : ""}>
        <div class="word-review-footer">
          <span class="word-review-keys small-note">Esc=退出；Tab=补一个字母；Enter=不会/下一个。</span>
          <div class="word-review-actions">
            <button type="button" data-word-review-action="hint" title="补出下一个字母（Tab）；用了提示，本题算答错" ${answered ? "disabled" : ""}>提示</button>
            <span class="word-review-main" data-word-review-main>${wordReviewMainButtonHtml(review, item)}</span>
          </div>
        </div>`;
    }

    // 单词练习: hold the button and say the word; the recognised word is shown with a right / wrong mark.
    // Nothing is recorded, and it is independent of the 说 page's recording state.
    function wordSpeakResultHtml(review) {
      const speech = review.speech;
      if (!speech) return '<span class="word-speak-hint">按住按钮，说出这个单词</span>';
      if (speech.listening) return '<span class="word-speak-hint">正在听……</span>';
      if (speech.error) return `<span class="word-speak-hint">${escapeHtml(speech.error)}</span>`;
      if (!speech.text) return '<span class="word-speak-hint">没有听到，再按住说一次</span>';
      return `<span class="word-speak-mark ${speech.correct ? "is-correct" : "is-wrong"}">${speech.correct ? "✓ 说对了" : "✗ 再试一次"}</span>`;
    }

    function wordSpeakHtml(review) {
      const supported = Boolean(speechRecognitionCtor());
      return `<div class="word-review-speak">
        <button type="button" class="primary hold-speak-button word-speak-button" data-word-speak ${supported ? "" : "disabled"} title="${supported ? `按住说出这个单词（或按住快捷键 ${state.shortcuts.holdSpeaking || "未设置"}），松开后识别；识别到的词会写入下面的输入框（先清空原来的内容）；不计入学习记录` : "当前浏览器不支持语音识别"}">按住说话</button>
        <strong>识别结果</strong>
        <span class="word-speak-result" data-word-speak-result>${wordSpeakResultHtml(review)}</span>
      </div>`;
    }

    function updateWordSpeakResult() {
      const review = state.wordReview;
      const target = document.querySelector("[data-word-speak-result]");
      if (review && target) target.innerHTML = wordSpeakResultHtml(review);
      document.querySelector("[data-word-speak]")?.classList.toggle("is-listening", Boolean(review?.speech?.listening));
    }

    let wordSpeakRecognition = null;
    let wordSpeakStopTimer = 0;

    function startWordSpeak() {
      const review = state.wordReview;
      const item = currentWordReviewItem();
      const Recognition = speechRecognitionCtor();
      if (!review || review.source !== "single" || !item || !Recognition) return;
      window.speechSynthesis?.cancel();
      abortWordSpeak();
      // Pressing the button always starts a fresh attempt: an answered card is unlocked and its box, hints and result
      // are cleared, then whatever is recognised is written into the box.
      if (review.answered || review.input || review.hints) {
        review.answered = false;
        review.correct = null;
        review.revealed = false;
        review.hints = 0;
        review.input = "";
        renderWordReview();
      }
      const recognition = new Recognition();
      wordSpeakRecognition = recognition;
      recognition.lang = ttsAccent() || "en-GB";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 5;
      review.speech = { listening: true, text: "", correct: false, error: "" };
      updateWordSpeakResult();
      const target = normalizeReviewAnswer(item.word).replace(/[^\p{L}\p{N}' -]/gu, "");
      recognition.onresult = (event) => {
        const alternatives = [];
        Array.from(event.results).forEach((result) => {
          Array.from(result).forEach((alternative) => alternatives.push(String(alternative.transcript || "").trim()));
        });
        const clean = (text) => normalizeReviewAnswer(text).replace(/[^\p{L}\p{N}' -]/gu, "");
        const match = alternatives.find((text) => clean(text) === target);
        if (state.wordReview !== review || wordSpeakRecognition !== recognition) return;
        // The recognizer adds capitals and punctuation ("Promptly."); only lower-case letters, digits, apostrophes, hyphens and spaces are kept.
        const spoken = clean(alternatives[0] || "");
        review.speech = { listening: false, text: match ? item.word.toLocaleLowerCase("en-US") : spoken, correct: Boolean(match), error: "" };
        // The recognised word (right or wrong) goes into the spelling box below, as if typed; a correct word is answered at once.
        const input = document.querySelector("#wordListenReviewCard [data-word-review-input]");
        if (input && review.speech.text) {
          input.value = review.speech.text;
          updateWordReviewMask(input);
        }
      };
      recognition.onerror = (event) => {
        if (state.wordReview !== review || wordSpeakRecognition !== recognition) return;
        review.speech = { listening: false, text: "", correct: false, error: event.error === "no-speech" ? "" : `识别失败：${event.error || "未知错误"}` };
      };
      recognition.onend = () => {
        if (wordSpeakRecognition !== recognition) return;
        wordSpeakRecognition = null;
        if (state.wordReview !== review) return;
        if (review.speech?.listening) review.speech = { listening: false, text: "", correct: false, error: "" };
        updateWordSpeakResult();
      };
      try {
        recognition.start();
      } catch (error) {
        wordSpeakRecognition = null;
        review.speech = { listening: false, text: "", correct: false, error: `无法启动识别：${error.message || error}` };
        updateWordSpeakResult();
      }
    }

    // Stops shortly after release so the last syllable is not cut off.
    function stopWordSpeak(delay = 300) {
      clearTimeout(wordSpeakStopTimer);
      wordSpeakStopTimer = setTimeout(() => {
        try { wordSpeakRecognition?.stop(); } catch {}
      }, delay);
    }

    function abortWordSpeak() {
      clearTimeout(wordSpeakStopTimer);
      try { wordSpeakRecognition?.abort(); } catch {}
      wordSpeakRecognition = null;
    }

    document.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("[data-word-speak]");
      if (!button || event.button !== 0 || button.disabled) return;
      event.preventDefault();
      startWordSpeak();
    });
    ["pointerup", "pointercancel"].forEach((type) => {
      document.addEventListener(type, () => {
        if (wordSpeakRecognition) stopWordSpeak();
      });
    });

    function wordReviewInputCorrect(review, item) {
      return normalizeReviewAnswer(review.input) === normalizeReviewAnswer(item?.word);
    }

    // The second button: 不会 (show the answer, counts as wrong) until the input spells the word correctly without
    // hints, then 下一个. After a hint it stays 不会 and turns red. Enter always does what this button shows.
    function wordReviewMainButtonHtml(review, item) {
      if (review.answered && review.hints && !review.correct) return '<button type="button" class="is-hinted" data-word-review-action="next" title="用了提示，本题算答错；进入下一个（Enter）">下一个</button>';
      if (review.answered) return '<button type="button" class="primary" data-word-review-action="next" title="进入下一个（Enter）">下一个</button>';
      if (review.hints) return '<button type="button" class="is-hinted" data-word-review-action="reveal" title="已用提示，本题算答错；看答案（Enter）">不会</button>';
      if (wordReviewInputCorrect(review, item)) return '<button type="button" class="primary" data-word-review-action="accept" title="拼写正确，进入下一个（Enter）">下一个</button>';
      return '<button type="button" data-word-review-action="reveal" title="不会拼，直接看答案，算答错（Enter）">不会</button>';
    }

    function renderWordReview() {
      const review = state.wordReview;
      const elements = wordReviewElements(review?.mode);
      const card = elements.card;
      if (!review || !card) return;
      const panel = elements.panel;
      if (panel) panel.hidden = true;
      const total = review.queue.length;
      if (review.index >= total) {
        const label = wordReviewModeLabel(review.mode);
        if (review.free) {
          elements.progress.textContent = total ? `自由练习完成 ${total} 个` : "没有可自由练习的单词";
          card.innerHTML = `
            <div class="word-review-done">
              <strong>${total ? "自由练习完成" : `还没有学过${label}的单词`}</strong>
              ${total ? `<div>${wordReviewResultSummary(review)}</div>` : ""}
              <div class="small-note">自由练习不计入练习记忆，不改变复习安排</div>
              <div class="word-review-actions">
                ${total ? '<button type="button" data-word-review-action="free">再来一轮</button>' : ""}
                <button type="button" data-word-review-action="close">完成</button>
              </div>
            </div>`;
          card.focus();
          return;
        }
        elements.progress.textContent = total ? `本轮完成 ${total} 个` : "没有待复习的单词";
        const due = nextWordReviewDue(review.mode, review);
        const scopeNote = review.source === "wordList"
          ? `${review.sourceLabel}共 ${review.words.length.toLocaleString()} 个词；每轮最多加入 ${practiceGroupSize("wordGroupSize")} 个新词`
          : `${label}只包含 ${wordReviewModeMinStars(review.mode)} 星及以上的收藏词`;
        const nextNote = due
          ? `下一个单词将在 ${new Date(due).toLocaleString()} 到期`
          : review.source === "wordList"
            ? `${review.sourceLabel}当前没有待复习或尚未学习的单词`
            : "收藏新单词后会自动加入复习";
        card.innerHTML = `
          <div class="word-review-done">
            <strong>${total ? "本轮复习完成" : `今天没有需要${label}的单词`}</strong>
            ${total ? `<div>${wordReviewResultSummary(review)}</div>` : ""}
            <div class="small-note">${nextNote}</div>
            <div class="small-note">${scopeNote}</div>
            <div class="word-review-actions">
              <button type="button" data-word-review-action="free" title="练习已学过的词，不管是否到期；结果不计入练习记忆，不改变复习安排">自由练习</button>
              <button type="button" data-word-review-action="close">完成</button>
            </div>
            <div class="small-note">自由练习不计入练习记忆</div>
          </div>`;
        card.focus();
        return;
      }
      const item = currentWordReviewItem();
      if (!item) {
        card.innerHTML = '<div class="word-review-done"><strong>正在读取单词...</strong></div>';
        return;
      }
      elements.progress.textContent = wordReviewProgressText(review);
      elements.modal.classList.toggle("is-single-word", review.source === "single");
      card.classList.toggle("is-recognize", review.mode === "recognize");
      card.innerHTML = review.mode === "recognize" ? renderRecognizeCard(item) : renderSpellingCard(item, review.mode);
      // 单词练习 (opened from a word's 练习 button) shows no result panel: the unmasked word and the red letters are the feedback.
      if (panel && review.answered && review.source !== "single") {
        panel.className = `word-review-result-panel ${review.correct ? "is-correct" : "is-wrong"}`;
        panel.innerHTML = renderWordReviewResultPanel(item, review.mode);
        panel.hidden = false;
      }
      const input = card.querySelector("[data-word-review-input]");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      } else {
        card.focus();
      }
    }

    async function startWordReviewCard() {
      const review = state.wordReview;
      if (!review) return;
      review.hints = 0;
      review.answered = false;
      review.correct = null;
      review.revealed = false;
      review.input = "";
      review.recognizeChoices = null;
      review.recognizeCorrectIndex = -1;
      review.recognizeSelectedIndex = -1;
      review.recognizeFocusedIndex = -1;
      review.currentItem = null;
      review.speech = null;
      abortWordSpeak();
      if (review.index >= review.queue.length) {
        renderWordReview();
        return;
      }
      const key = review.queue[review.index];
      const loadToken = (review.loadToken || 0) + 1;
      review.loadToken = loadToken;
      renderWordReview();
      let item;
      if (review.source === "single") {
        let entry = null;
        try {
          entry = await window.langLSRWDictionary.query(review.singleWord, currentDictionaryId());
        } catch {
          entry = null;
        }
        item = { ...(entry || {}), word: review.singleWord };
      } else if (review.source === "wordList") {
        try {
          item = await window.langLSRWDictionary.query(review.wordIndex.get(key)?.word || key, currentDictionaryId());
        } catch {
          item = null;
        }
        item = item || review.wordIndex.get(key) || { word: key };
      } else {
        const favorite = loadUserWords().find((word) => dictionaryFavoriteKey(word.word) === key) || null;
        if (favorite) {
          let entry = null;
          try {
            entry = await window.langLSRWDictionary.query(favorite.word, currentDictionaryId());
          } catch {
            entry = null;
          }
          item = { ...(entry || {}), ...favorite, word: favorite.word };
        }
      }
      if (state.wordReview !== review || review.loadToken !== loadToken) return;
      if (!item) {
        review.index += 1;
        startWordReviewCard();
        return;
      }
      review.currentItem = item;
      if (review.source !== "single") state.dictionaryLookupEntry = item;
      renderWordReview();
      if (review.mode === "recognize") prepareRecognizeChoices(review, item, loadToken);
      if (item && review.mode !== "spell") speakReviewWord(item.word);
    }

    function switchWordReviewMode(mode, context = state.wordReview, free = false) {
      window.speechSynthesis?.cancel();
      const source = context?.source === "wordList" ? "wordList" : context?.source === "single" ? "single" : "favorites";
      state.wordReview = {
        source,
        singleWord: source === "single" ? context.word : "",
        sourceLabel: source === "wordList" || source === "single" ? context.sourceLabel : "收藏",
        deckCategory: source === "wordList" ? context.deckCategory : "",
        words: source === "wordList" ? context.words : [],
        wordIndex: source === "wordList" ? context.wordIndex : new Map(),
        records: loadWordReviewRecords(),
        mode,
        free: free || source === "single",
        queue: [],
        index: 0,
        hints: 0,
        answered: false,
        correct: null,
        revealed: false,
        input: "",
        recognizeChoices: null,
        recognizeCorrectIndex: -1,
        recognizeSelectedIndex: -1,
        recognizeFocusedIndex: -1,
        results: { good: 0, again: 0 }
      };
      state.wordReview.queue = source === "single"
        ? [dictionaryFavoriteKey(context.word)]
        : free ? buildFreeWordReviewQueue(mode, state.wordReview) : buildWordReviewQueue(mode, state.wordReview);
      startWordReviewCard();
    }

    function openWordReview(mode, context = null, free = false) {
      if (!WORD_REVIEW_INTERFACES[mode]) return;
      const sourceContext = context?.source === "wordList" || context?.source === "single" ? context : { source: "favorites", sourceLabel: "收藏" };
      document.querySelectorAll(".word-review-modal").forEach((modal) => { modal.hidden = true; });
      const elements = wordReviewElements(mode);
      elements.title.textContent = sourceContext.source === "single"
        ? `${sourceContext.sourceLabel} · 练习`
        : sourceContext.source === "wordList"
        ? `${sourceContext.sourceLabel} · ${wordReviewModeLabel(mode)}`
        : `收藏 · ${wordReviewModeLabel(mode)}`;
      elements.modal.hidden = false;
      switchWordReviewMode(mode, sourceContext, free);
    }

    // 听写 / 默写 of one looked-up word, opened from the buttons beside a word's stars; nothing is saved.
    function openSingleWordPractice(mode, word) {
      const text = String(word || "").trim();
      if (!text || !WORD_REVIEW_INTERFACES[mode]) return;
      closeDictionaryLookup();
      closeEnglishLookup();
      openWordReview(mode, { source: "single", sourceLabel: "单词", word: text });
    }

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-dictionary-practice]");
      if (!button) return;
      event.preventDefault();
      openSingleWordPractice(button.dataset.dictionaryPractice, button.dataset.practiceWord);
    });

    function closeWordReview() {
      abortWordSpeak();
      document.querySelectorAll(".word-review-modal").forEach((modal) => { modal.hidden = true; });
      window.speechSynthesis?.cancel();
      state.wordReview = null;
      updateDictionaryStudyButton();
      if (!$("userPhrasesModal").hidden) renderUserPhrases();
      refreshWordReviewStatusIcons();
    }

    function gradeWordReview(grade) {
      const review = state.wordReview;
      const item = currentWordReviewItem();
      if (!review || !item) return;
      const key = dictionaryFavoriteKey(item.word);
      review.results[grade] += 1;
      userData.append("reviewEvent", [key, review.mode, grade === "good" ? 1 : 0, review.hints ? 1 : 0, review.free ? 1 : 0, Math.floor(Date.now() / 1000)], languageScope());
      if (!review.free) saveWordReviewGrade(key, review.mode, grade);
      if (grade === "again" && review.source !== "single") review.queue.push(key);
    }

    function answerRecognizeChoice(index) {
      const review = state.wordReview;
      if (!review || review.mode !== "recognize" || review.answered || !review.recognizeChoices) return;
      const selectedIndex = Number(index);
      if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 4) return;
      review.recognizeSelectedIndex = selectedIndex;
      review.correct = selectedIndex === review.recognizeCorrectIndex;
      review.answered = true;
      gradeWordReview(review.correct ? "good" : "again");
      renderWordReview();
    }

    function moveRecognizeChoice(step) {
      const review = state.wordReview;
      if (!review || review.mode !== "recognize" || review.answered || !review.recognizeChoices) return;
      const current = review.recognizeFocusedIndex;
      review.recognizeFocusedIndex = current < 0 ? (step > 0 ? 0 : 4) : (current + step + 5) % 5;
      renderWordReview();
      wordReviewElements("recognize").card?.querySelector(`[data-word-review-choice="${review.recognizeFocusedIndex}"]`)?.focus();
    }

    function answerWordReview(forceReveal = false) {
      const review = state.wordReview;
      if (!review || review.mode === "recognize" || review.answered) return;
      const item = currentWordReviewItem();
      if (!item) return;
      const input = wordReviewElements(review.mode).card?.querySelector("[data-word-review-input]");
      review.input = input ? input.value : "";
      if (!forceReveal && !review.input.trim()) return;
      const correct = !forceReveal && normalizeReviewAnswer(review.input) === normalizeReviewAnswer(item.word);
      review.answered = true;
      // Any hint means the word was not recalled on its own, so a hinted correct spelling still counts as wrong.
      review.spelledRight = correct;
      review.correct = correct && !review.hints;
      review.revealed = forceReveal;
      gradeWordReview(review.correct ? "good" : "again");
      renderWordReview();
      if (review.spokenIndex !== review.index) speakReviewWord(item.word);
    }

    // A correct spelling without hints: record it and go straight to the next word.
    function acceptWordReview() {
      const review = state.wordReview;
      if (!review || review.answered) return;
      answerWordReview();
      if (review.answered) nextWordReview();
    }

    function hintWordReview() {
      const review = state.wordReview;
      if (!review || review.mode === "recognize" || review.answered) return;
      const item = currentWordReviewItem();
      if (!item) return;
      const input = wordReviewElements(review.mode).card?.querySelector("[data-word-review-input]");
      review.input = input ? input.value : review.input;
      review.hints = Math.min(wordReviewLetterCount(item.word), wordReviewRevealedLetters(review, item.word) + 1);
      // 听写: once hints have revealed every letter, show the answer (counts as wrong).
      if (review.mode === "listen" && review.hints >= wordReviewLetterCount(item.word)) {
        answerWordReview(true);
        return;
      }
      renderWordReview();
    }

    function nextWordReview() {
      const review = state.wordReview;
      if (!review || !review.answered) return;
      if (review.source !== "single") review.index += 1;
      startWordReviewCard();
    }

    function handleWordReviewAction(action) {
      if (action === "check") answerWordReview();
      else if (action === "accept") acceptWordReview();
      else if (action === "reveal") answerWordReview(true);
      else if (action === "hint") hintWordReview();
      else if (action === "next") nextWordReview();
      else if (action === "speak") speakReviewWord(currentWordReviewItem()?.word);
      else if (action === "close") closeWordReview();
      else if (action === "free" && state.wordReview) switchWordReviewMode(state.wordReview.mode, state.wordReview, true);
    }

    function handleWordReviewKeydown(event) {
      const review = state.wordReview;
      if (!review || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target.closest("button:not([data-word-review-choice])") && (event.key === "Enter" || event.key === " ")) return;
      const finished = review.index >= review.queue.length;
      if (finished) {
        if (event.key === "Enter") {
          event.preventDefault();
          closeWordReview();
        }
        return;
      }
      if (review.mode === "recognize") {
        if (!review.answered && ["1", "2", "3", "4", "5"].includes(event.key)) {
          event.preventDefault();
          answerRecognizeChoice(Number(event.key) - 1);
        } else if (!review.answered && ["ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          moveRecognizeChoice(event.key === "ArrowUp" ? -1 : 1);
        } else if (!review.answered && event.key === "Enter") {
          event.preventDefault();
          if (review.recognizeFocusedIndex >= 0) answerRecognizeChoice(review.recognizeFocusedIndex);
        } else if (review.answered && event.key === "Enter") {
          event.preventDefault();
          nextWordReview();
        }
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const input = wordReviewElements(review.mode).card?.querySelector("[data-word-review-input]");
        if (input) review.input = input.value;
        if (review.answered) nextWordReview();
        else if (!review.hints && wordReviewInputCorrect(review, currentWordReviewItem())) acceptWordReview();
        else answerWordReview(true);
      } else if (event.key === "Tab" && !review.answered) {
        event.preventDefault();
        hintWordReview();
      }
    }

    function resetUserPhrasesSize() {
      const dialog = $("userPhrasesModal").querySelector(".user-phrases-dialog");
      dialog.style.removeProperty("width");
      dialog.style.removeProperty("height");
      requestAnimationFrame(() => updateUserWordsPageSize());
    }

    function goToUserWordsPage(page) {
      const target = Math.max(1, Math.min(Number(page) || 1, state.userWordsPageCount));
      if (target === state.userWordsPage) return;
      state.userWordsPage = target;
      state.userWordsSelectFirstAfterRender = true;
      renderUserPhrases();
    }

    function goToEnteredUserWordsPage() {
      goToUserWordsPage(Number.parseInt($("userWordsPageInput").value, 10));
    }

    let userWordsResizeTimer;
    function updateUserWordsPageSize(refresh = true) {
      const height = $("userPhrasesList").clientHeight;
      if (!height) return;
      const nextSize = Math.max(5, Math.min(200, Math.floor(height / 26)));
      if (nextSize === state.userWordsPageSize) return;
      const firstIndex = (state.userWordsPage - 1) * state.userWordsPageSize;
      state.userWordsPageSize = nextSize;
      state.userWordsPage = Math.floor(firstIndex / nextSize) + 1;
      if (refresh && !$("userPhrasesModal").hidden) renderUserPhrases();
    }

    function goToUserSentencesPage(page) {
      const target = Math.max(1, Math.min(Number(page) || 1, state.userSentencesPageCount));
      if (target === state.userSentencesPage) return;
      state.userSentencesPage = target;
      renderUserPhrases();
      $("userSentencesList").scrollTop = 0;
    }

    function goToEnteredUserSentencesPage() {
      goToUserSentencesPage(Number.parseInt($("userSentencesPageInput").value, 10));
    }

    let userSentencesResizeTimer;
    function updateUserSentencesPageSize() {
      if (!$("userSentencesList").clientHeight || $("userPhrasesModal").hidden) return;
      renderUserPhrases();
    }

    function handleUserWordsKeys(event) {
      if ($("userPhrasesModal").hidden || $("userPhrasesList").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.matches("input, select, textarea")) return;
      if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        $("userPhrasesList").classList.add("is-keyboard-navigation");
        goToUserWordsPage(state.userWordsPage + (event.key === "ArrowLeft" ? -1 : 1));
        return;
      }
      if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
      const buttons = [...$("userPhrasesList").querySelectorAll("[data-user-word]")];
      if (!buttons.length) return;
      event.preventDefault();
      $("userPhrasesList").classList.add("is-keyboard-navigation");
      const current = buttons.findIndex((button) => button.classList.contains("is-current"));
      const next = current < 0 ? (event.key === "ArrowDown" ? 0 : buttons.length - 1) : Math.max(0, Math.min(buttons.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)));
      buttons[next].focus({ preventScroll: true });
    }

    async function lookupTargetWord(wordEl, anchor) {
      if (!wordEl) return;
      const word = String(wordEl.dataset.word || wordEl.textContent || "").trim();
      if (!word) return;
      const popover = $("dictionaryLookupPopover");
      const wordRect = wordEl.getBoundingClientRect();
      const sourceLineRect = wordEl.closest(".target-english")?.getBoundingClientRect() || wordRect;
      const lookupAnchor = {
        clientX: anchor?.clientX ?? wordRect.left,
        avoidRect: sourceLineRect
      };
      await lookupLearningWord(word, lookupAnchor);
    }

    // Looks a word up in the learning language's dictionary and shows it in the lookup popover.
    async function lookupLearningWord(word, lookupAnchor) {
      const popover = $("dictionaryLookupPopover");
      state.dictionaryLookupEntry = null;
      popover.hidden = false;
      popover.innerHTML = `<div class="dictionary-lookup-loading">正在查询 ${escapeHtml(word)}...</div>`;
      positionDictionaryLookup(lookupAnchor);
      popover.dataset.word = word;
      try {
        const result = await window.langLSRWDictionary.query(word);
        if (popover.dataset.word !== word) return;
        if (!result) {
          popover.innerHTML = `<div class="dictionary-lookup-header"><strong>${escapeHtml(word)}</strong><button type="button" data-dictionary-close aria-label="关闭">×</button></div><div class="dictionary-lookup-empty">本地词典中未找到该词。</div>`;
        } else {
          renderDictionaryLookupResult(result, word);
          autoSpeakLookedUpWord(String(result.word || word));
        }
      } catch (error) {
        if (popover.dataset.word !== word) return;
        const unavailable = String(error?.message || error).includes("尚未安装");
        popover.innerHTML = `<div class="dictionary-lookup-header"><strong>${escapeHtml(word)}</strong><button type="button" data-dictionary-close aria-label="关闭">×</button></div><div class="dictionary-lookup-empty">${unavailable ? `${escapeHtml(currentLearningLanguage().dictionaryName)}尚未安装，请先在设置中安装。` : `查询失败：${escapeHtml(error?.message || String(error))}`}</div>`;
      }
      positionDictionaryLookup(lookupAnchor);
    }

    function lookupCurrentWord() {
      const wordEl = getActiveTargetWordEl();
      if (!wordEl) return;
      lookupTargetWord(wordEl, wordEl.getBoundingClientRect());
    }

    function getTargetWordEndingAt(position) {
      const target = currentSentence();
      const wordPattern = languageText().typedWordRegex();
      let match;
      while ((match = wordPattern.exec(target)) !== null) {
        const word = match[0];
        const end = match.index + word.length;
        if (end === position) {
          return { word, key: `${word.toLowerCase()}@${end}` };
        }
      }
      return null;
    }

    function maybeSpeakCompletedWord(inputType) {
      if (!$("speakWordToggle").checked) return;
      if (inputType && inputType.startsWith("delete")) return;
      const completed = getTargetWordEndingAt(typingBox.value.length);
      if (!completed || completed.key === state.lastSpokenWordKey) return;
      state.lastSpokenWordKey = completed.key;
      speakText(completed.word, { rate: 0.86 });
    }

    function escapeHtml(value) {
      return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function charLabel(char) {
      if (char === " ") return "空格";
      if (char === "\n") return "换行";
      if (!char) return "空";
      return char;
    }

    // Word splitting and dictation comparison come from the current learning language's own text rules
    // (src/languages/<id>/text.js); English and Spanish use separate algorithms.
    function languageText() {
      const languages = window.langLSRWLanguages || {};
      return languages[state.learningLanguageId]?.text || languages.en.text;
    }

    function languageDictionary() {
      const languages = window.langLSRWLanguages || {};
      return languages[state.learningLanguageId]?.dictionary || languages.en.dictionary;
    }

    function isCheckChar(char) {
      return languageText().isCheckChar(char);
    }

    function getCheckChars(text) {
      const chars = [];
      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (isCheckChar(char)) {
          chars.push({ char, normalized: languageText().normalizeChar(char), pos: i + 1 });
        }
      }
      return chars;
    }

    function normalizeCheckText(text) {
      return getCheckChars(text).map((item) => item.normalized).join("");
    }

    function getWordMatches(text) {
      const words = [];
      const wordPattern = languageText().wordRegex();
      let match;
      while ((match = wordPattern.exec(text)) !== null) {
        const value = match[0];
        words.push({
          text: value,
          normalized: normalizeCheckText(value),
          start: match.index,
          end: match.index + value.length
        });
      }
      return words;
    }

    function alignInputWords(input, target) {
      const inputWords = getWordMatches(input);
      const targetWords = getWordMatches(target);
      const pairs = [];
      let targetIndex = 0;
      const trailingWord = languageText().endsInWord(input);

      inputWords.forEach((inputWord, inputIndex) => {
        let foundIndex = -1;
        for (let i = targetIndex; i < targetWords.length; i += 1) {
          if (targetWords[i].normalized === inputWord.normalized) {
            foundIndex = i;
            break;
          }
        }

        if (foundIndex >= 0) {
          pairs.push({ inputIndex, targetIndex: foundIndex, status: "correct" });
          targetIndex = foundIndex + 1;
          return;
        }

        const targetWord = targetWords[targetIndex];
        const isLastInputWord = inputIndex === inputWords.length - 1;
        if (
          trailingWord &&
          isLastInputWord &&
          targetWord &&
          targetWord.normalized.startsWith(inputWord.normalized)
        ) {
          pairs.push({ inputIndex, targetIndex, status: "partial" });
          return;
        }

        pairs.push({ inputIndex, targetIndex, status: "wrong" });
        if (targetIndex < targetWords.length) targetIndex += 1;
      });

      return { inputWords, targetWords, pairs };
    }

    function getTargetWordPieces(target) {
      const pieces = [];
      const wordPattern = languageText().wordRegex();
      let lastIndex = 0;
      let match;
      while ((match = wordPattern.exec(target)) !== null) {
        if (match.index > lastIndex) {
          pieces.push({ type: "text", text: target.slice(lastIndex, match.index) });
        }
        const word = match[0];
        pieces.push({
          type: "word",
          text: word,
          normalized: normalizeCheckText(word)
        });
        lastIndex = match.index + word.length;
      }
      if (lastIndex < target.length) {
        pieces.push({ type: "text", text: target.slice(lastIndex) });
      }
      return pieces;
    }

    function getRevealedWordCount(input, target) {
      const typed = normalizeCheckText(input);
      const words = getTargetWordPieces(target).filter((piece) => piece.type === "word");
      let offset = 0;
      let revealed = 0;
      for (const word of words) {
        const nextOffset = offset + word.normalized.length;
        if (typed.length < nextOffset) break;
        if (typed.slice(offset, nextOffset) !== word.normalized) break;
        revealed += 1;
        offset = nextOffset;
      }
      return revealed;
    }

    function compareText(input, target) {
      const alignment = alignInputWords(input, target);
      const errors = [];
      let correct = 0;

      alignment.pairs.forEach((pair) => {
        const inputWord = alignment.inputWords[pair.inputIndex];
        const targetWord = alignment.targetWords[pair.targetIndex];
        if (pair.status === "correct") {
          correct += inputWord.normalized.length;
        } else if (pair.status === "wrong") {
          errors.push({
            pos: targetWord ? targetWord.start + 1 : inputWord.start + 1,
            expected: targetWord ? targetWord.text : "",
            actual: inputWord.text
          });
        }
      });

      return {
        correct,
        errors,
        inputLength: normalizeCheckText(input).length,
        targetLength: normalizeCheckText(target).length
      };
    }

    function compareSpeakingText(target, spoken) {
      const alignment = alignInputWords(spoken, target);
      const targetWords = alignment.targetWords;
      const spokenWords = alignment.inputWords;
      const matchedTarget = new Set();
      const compareByTarget = new Map();
      const extraItems = [];
      let correct = 0;
      let wrong = 0;
      let extra = 0;

      alignment.pairs.forEach((pair) => {
        const inputWord = spokenWords[pair.inputIndex];
        const targetWord = targetWords[pair.targetIndex];
        if (pair.status === "correct" && targetWord) {
          matchedTarget.add(pair.targetIndex);
          correct += 1;
          compareByTarget.set(pair.targetIndex, { type: "correct", text: targetWord.text });
          return;
        }
        if (targetWord) {
          matchedTarget.add(pair.targetIndex);
          wrong += 1;
          compareByTarget.set(pair.targetIndex, { type: "wrong", text: targetWord.text, actual: inputWord.text });
          return;
        }
        extra += 1;
        extraItems.push({ type: "extra", text: inputWord.text });
      });

      const compareItems = [];
      targetWords.forEach((word, index) => {
        compareItems.push(compareByTarget.get(index) || { type: "missing", text: word.text });
      });
      compareItems.push(...extraItems);

      const missing = targetWords.length - matchedTarget.size;
      const denominator = Math.max(targetWords.length, spokenWords.length, 1);
      const score = Math.max(0, Math.round((correct / denominator) * 100));
      return { score, correct, wrong, extra, missing, compareItems };
    }

    function speechRecognitionCtor() {
      return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    }

    function ttsCacheKey() {
      return [currentSentence(), $("accentSelect").value, $("voiceSelect").value, currentReplayRate()].join("||");
    }

    function waitMs(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function clearSharedTtsAudioStream() {
      const stream = state.speaking.ttsShareStream;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      state.speaking.ttsShareStream = null;
    }

    async function getSharedTtsAudioStream() {
      const existing = state.speaking.ttsShareStream;
      if (existing && existing.getAudioTracks().some((track) => track.readyState === "live")) {
        return existing;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("当前浏览器不支持共享标签页音频，无法录制范读。");
      }
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = displayStream.getAudioTracks();
      displayStream.getVideoTracks().forEach((track) => track.stop());
      if (!audioTracks.length) {
        displayStream.getTracks().forEach((track) => track.stop());
        throw new Error("共享时没有勾选“分享音频”，无法录制范读。");
      }
      const audioTrack = audioTracks[0];
      const audioOnlyStream = new MediaStream([audioTrack]);
      audioTrack.addEventListener("ended", () => {
        if (state.speaking.ttsShareStream === audioOnlyStream) state.speaking.ttsShareStream = null;
      });
      state.speaking.ttsShareStream = audioOnlyStream;
      return audioOnlyStream;
    }

    async function captureTtsPlayback() {
      const audioOnlyStream = await getSharedTtsAudioStream();
      const preferredMimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(audioOnlyStream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.start();
      await waitMs(150);
      try {
        await speakTextAndWait(currentSentence(), { rate: currentReplayRate() });
      } finally {
        await waitMs(150);
        recorder.stop();
        await stopped;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (!blob.size) throw new Error("没有录到范读音频，请重新共享此标签页并勾选“分享音频”。");
      return blob;
    }

    async function getOrCaptureTtsAudio() {
      const key = ttsCacheKey();
      const cached = state.speaking.ttsAudioCache.get(key);
      if (cached) return cached;
      const blob = await captureTtsPlayback();
      state.speaking.ttsAudioCache.set(key, blob);
      return blob;
    }

    function medianValue(values) {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }

    function downmixAudioBuffer(audioBuffer) {
      const mono = new Float32Array(audioBuffer.length);
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
        const samples = audioBuffer.getChannelData(channel);
        for (let i = 0; i < samples.length; i += 1) mono[i] += samples[i] / audioBuffer.numberOfChannels;
      }
      return mono;
    }

    function resampleAudio(samples, sourceRate, targetRate = 16000) {
      if (sourceRate <= targetRate) return { samples, sampleRate: sourceRate };
      const length = Math.max(1, Math.floor(samples.length * targetRate / sourceRate));
      const output = new Float32Array(length);
      const ratio = sourceRate / targetRate;
      for (let i = 0; i < length; i += 1) {
        const sourceIndex = i * ratio;
        const left = Math.floor(sourceIndex);
        const right = Math.min(samples.length - 1, left + 1);
        const mix = sourceIndex - left;
        output[i] = samples[left] * (1 - mix) + samples[right] * mix;
      }
      return { samples: output, sampleRate: targetRate };
    }

    function detectPitchYin(frame, sampleRate) {
      let mean = 0;
      let energy = 0;
      for (let i = 0; i < frame.length; i += 1) mean += frame[i];
      mean /= frame.length;
      const centered = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i += 1) {
        centered[i] = frame[i] - mean;
        energy += centered[i] * centered[i];
      }
      if (Math.sqrt(energy / frame.length) < 0.006) return null;

      const minLag = Math.max(2, Math.floor(sampleRate / 500));
      const maxLag = Math.min(Math.floor(sampleRate / 55), Math.floor(frame.length / 2));
      const difference = new Float32Array(maxLag + 1);
      const normalized = new Float32Array(maxLag + 1);
      for (let lag = 1; lag <= maxLag; lag += 1) {
        let sum = 0;
        for (let i = 0; i < frame.length - lag; i += 1) {
          const delta = centered[i] - centered[i + lag];
          sum += delta * delta;
        }
        difference[lag] = sum;
      }
      normalized[0] = 1;
      let runningSum = 0;
      for (let lag = 1; lag <= maxLag; lag += 1) {
        runningSum += difference[lag];
        normalized[lag] = runningSum ? difference[lag] * lag / runningSum : 1;
      }

      let bestLag = -1;
      for (let lag = minLag; lag < maxLag; lag += 1) {
        if (normalized[lag] < 0.2) {
          while (lag + 1 <= maxLag && normalized[lag + 1] < normalized[lag]) lag += 1;
          bestLag = lag;
          break;
        }
      }
      if (bestLag < 0) {
        let bestValue = 1;
        for (let lag = minLag; lag <= maxLag; lag += 1) {
          if (normalized[lag] < bestValue) {
            bestValue = normalized[lag];
            bestLag = lag;
          }
        }
        if (bestValue > 0.45) return null;
      }

      const left = normalized[bestLag - 1] || normalized[bestLag];
      const center = normalized[bestLag];
      const right = normalized[bestLag + 1] || normalized[bestLag];
      const denominator = 2 * (2 * center - left - right);
      const refinedLag = denominator ? bestLag + (right - left) / denominator : bestLag;
      const frequency = sampleRate / refinedLag;
      return frequency >= 55 && frequency <= 500 ? frequency : null;
    }

    function detectPitchAutocorrelation(frame, sampleRate) {
      let mean = 0;
      for (let i = 0; i < frame.length; i += 1) mean += frame[i];
      mean /= frame.length;
      let energy = 0;
      const centered = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i += 1) {
        centered[i] = frame[i] - mean;
        energy += centered[i] * centered[i];
      }
      if (Math.sqrt(energy / frame.length) < 0.006) return null;

      const minLag = Math.max(2, Math.floor(sampleRate / 500));
      const maxLag = Math.min(Math.floor(sampleRate / 55), Math.floor(frame.length / 2));
      const scores = new Float32Array(maxLag + 1);
      let bestLag = -1;
      let bestScore = 0;
      for (let lag = minLag; lag <= maxLag; lag += 1) {
        let product = 0;
        let leftEnergy = 0;
        let rightEnergy = 0;
        for (let i = 0; i < frame.length - lag; i += 1) {
          product += centered[i] * centered[i + lag];
          leftEnergy += centered[i] * centered[i];
          rightEnergy += centered[i + lag] * centered[i + lag];
        }
        const score = product / Math.sqrt(Math.max(leftEnergy * rightEnergy, 1e-12));
        scores[lag] = score;
        if (score > bestScore) {
          bestScore = score;
          bestLag = lag;
        }
      }
      if (bestLag < 0 || bestScore < 0.42) return null;
      const left = scores[bestLag - 1] || scores[bestLag];
      const center = scores[bestLag];
      const right = scores[bestLag + 1] || scores[bestLag];
      const denominator = 2 * (2 * center - left - right);
      const refinedLag = denominator ? bestLag + (right - left) / denominator : bestLag;
      const frequency = sampleRate / refinedLag;
      return frequency >= 55 && frequency <= 500 ? frequency : null;
    }

    function stabilizePitchContour(contour) {
      const voiced = contour.filter((point) => point.freq).map((point) => point.freq);
      if (!voiced.length) return contour;
      const globalMedian = medianValue(voiced);
      let previous = globalMedian;
      let gapFrames = 0;
      const corrected = contour.map((point) => {
        if (!point.freq) {
          gapFrames += 1;
          return { ...point };
        }
        const candidates = [point.freq / 2, point.freq, point.freq * 2]
          .filter((frequency) => frequency >= 55 && frequency <= 500);
        const afterPause = gapFrames >= 8;
        const reference = afterPause ? globalMedian : (previous || globalMedian);
        const frequency = candidates.reduce((best, candidate) => (
          Math.abs(12 * Math.log2(candidate / reference)) < Math.abs(12 * Math.log2(best / reference)) ? candidate : best
        ), candidates[0]);
        const jump = Math.abs(12 * Math.log2(frequency / reference));
        if (jump > (afterPause ? 12 : 7)) {
          gapFrames += 1;
          return { ...point, freq: null };
        }
        previous = frequency;
        gapFrames = 0;
        return { ...point, freq: frequency };
      });

      return corrected.map((point, index) => {
        if (!point.freq) return point;
        const nearby = corrected
          .slice(Math.max(0, index - 2), index + 3)
          .filter((item) => item.freq)
          .map((item) => Math.log2(item.freq));
        return { ...point, freq: 2 ** medianValue(nearby) };
      });
    }

    async function decodeAudioForAnalysis(blob) {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      let audioBuffer;
      try {
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      } finally {
        audioContext.close().catch(() => {});
      }
      const rawChannelData = downmixAudioBuffer(audioBuffer);
      let peak = 0;
      for (let i = 0; i < rawChannelData.length; i += 1) {
        const abs = Math.abs(rawChannelData[i]);
        if (abs > peak) peak = abs;
      }
      if (peak < 0.0001) return { samples: new Float32Array(), sampleRate: 16000, duration: 0 };
      const gain = 0.9 / peak;
      const normalizedData = gain === 1 ? rawChannelData : Float32Array.from(rawChannelData, (sample) => sample * gain);
      const resampled = resampleAudio(normalizedData, audioBuffer.sampleRate);
      return {
        samples: resampled.samples,
        sampleRate: resampled.sampleRate,
        duration: resampled.samples.length / resampled.sampleRate
      };
    }

    function extractPitchContour(audio) {
      const channelData = audio.samples;
      const sampleRate = audio.sampleRate;
      const windowSize = 1024;
      const hopSize = Math.round(sampleRate * 0.01);
      const contour = [];
      for (let start = 0; start + windowSize <= channelData.length; start += hopSize) {
        const frame = channelData.subarray(start, start + windowSize);
        const frequency = detectPitchYin(frame, sampleRate) || detectPitchAutocorrelation(frame, sampleRate);
        contour.push({ t: (start + windowSize / 2) / sampleRate, freq: frequency });
      }
      return { contour: fillShortPitchGaps(stabilizePitchContour(contour)), duration: audio.duration };
    }

    function fillShortPitchGaps(contour, maxGapSeconds = 0.06) {
      const filled = contour.map((point) => ({ ...point }));
      let i = 0;
      while (i < filled.length) {
        if (filled[i].freq !== null) {
          i += 1;
          continue;
        }
        let j = i;
        while (j < filled.length && filled[j].freq === null) j += 1;
        const prev = i > 0 ? filled[i - 1] : null;
        const next = j < filled.length ? filled[j] : null;
        if (prev && next && (next.t - prev.t) <= maxGapSeconds) {
          for (let k = i; k < j; k += 1) {
            const ratio = (filled[k].t - prev.t) / (next.t - prev.t);
            filled[k].freq = prev.freq + (next.freq - prev.freq) * ratio;
            filled[k].filled = true;
          }
        }
        i = j;
      }
      return filled;
    }

    function normalizePitchContour({ contour }) {
      const voicedPoints = contour.filter((point) => point.freq);
      if (!voicedPoints.length) return [];
      const freqs = voicedPoints.map((point) => point.freq).sort((a, b) => a - b);
      const median = medianValue(freqs);
      const startT = voicedPoints[0].t;
      const endT = voicedPoints[voicedPoints.length - 1].t;
      const span = Math.max(endT - startT, 0.05);
      return contour
        .filter((point) => point.t >= startT && point.t <= endT)
        .map((point) => ({
          tPct: ((point.t - startT) / span) * 100,
          semitone: point.freq ? 12 * Math.log2(point.freq / median) : null,
          filled: Boolean(point.filled)
        }));
    }

    function pitchContourDuration({ contour }) {
      const voicedPoints = contour.filter((point) => point.freq);
      if (voicedPoints.length < 2) return 0;
      return Math.max(0, voicedPoints[voicedPoints.length - 1].t - voicedPoints[0].t);
    }

    function formatPitchTime(seconds) {
      const safeSeconds = Math.max(0, Number(seconds) || 0);
      if (safeSeconds < 60) return `${safeSeconds.toFixed(1)}s`;
      const minutes = Math.floor(safeSeconds / 60);
      return `${minutes}:${String(Math.round(safeSeconds % 60)).padStart(2, "0")}`;
    }

    function pitchTimeScale(label, source, duration) {
      return `<div class="pitch-compare-time-row pitch-compare-time-${source}">
        <span class="pitch-compare-time-label">${label}</span>
        <span>${formatPitchTime(0)}</span>
        <span>${formatPitchTime(duration / 2)}</span>
        <span>${formatPitchTime(duration)}</span>
      </div>`;
    }

    function smoothNumberSeries(values, radius = 2) {
      return values.map((_, index) => {
        const nearby = values.slice(Math.max(0, index - radius), index + radius + 1);
        return nearby.reduce((sum, value) => sum + value, 0) / nearby.length;
      });
    }

    function extractEnergyAnalysis(audio) {
      const frameSize = Math.max(1, Math.round(audio.sampleRate * 0.025));
      const hopSize = Math.max(1, Math.round(audio.sampleRate * 0.01));
      const frames = [];
      for (let start = 0; start + frameSize <= audio.samples.length; start += hopSize) {
        let sum = 0;
        for (let i = start; i < start + frameSize; i += 1) sum += audio.samples[i] * audio.samples[i];
        frames.push({ t: (start + frameSize / 2) / audio.sampleRate, rms: Math.sqrt(sum / frameSize) });
      }
      const maxRms = Math.max(...frames.map((frame) => frame.rms), 1e-6);
      const values = smoothNumberSeries(frames.map((frame) => {
        const db = 20 * Math.log10(Math.max(frame.rms / maxRms, 1e-4));
        return Math.max(0, Math.min(1, (db + 36) / 36));
      }));
      const active = values.map((value) => value >= 0.16);
      for (let i = 0; i < active.length;) {
        if (active[i]) { i += 1; continue; }
        let end = i;
        while (end < active.length && !active[end]) end += 1;
        if (i > 0 && end < active.length && end - i <= 8) {
          for (let j = i; j < end; j += 1) active[j] = true;
        }
        i = end;
      }
      for (let i = 0; i < active.length;) {
        if (!active[i]) { i += 1; continue; }
        let end = i;
        while (end < active.length && active[end]) end += 1;
        if (end - i < 4) {
          for (let j = i; j < end; j += 1) active[j] = false;
        }
        i = end;
      }
      const firstActive = active.findIndex(Boolean);
      const lastActive = active.lastIndexOf(true);
      if (firstActive < 0 || lastActive <= firstActive) return { points: [], segments: [], duration: 0, pauseCount: 0 };
      const startT = frames[firstActive].t;
      const endT = frames[lastActive].t;
      const span = Math.max(0.05, endT - startT);
      const points = frames.slice(firstActive, lastActive + 1).map((frame, index) => ({
        tPct: ((frame.t - startT) / span) * 100,
        value: values[firstActive + index]
      }));
      const segments = [];
      for (let i = firstActive; i <= lastActive;) {
        if (!active[i]) { i += 1; continue; }
        let end = i;
        while (end <= lastActive && active[end]) end += 1;
        segments.push({
          startPct: ((frames[i].t - startT) / span) * 100,
          endPct: ((frames[Math.min(end - 1, lastActive)].t - startT) / span) * 100
        });
        i = end;
      }
      return { points, segments, duration: span, pauseCount: Math.max(0, segments.length - 1) };
    }

    function fftPowerSpectrum(frame, fftSize = 512) {
      const real = new Float64Array(fftSize);
      const imaginary = new Float64Array(fftSize);
      const usable = Math.min(frame.length, fftSize);
      for (let i = 0; i < usable; i += 1) {
        const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / Math.max(1, usable - 1));
        real[i] = frame[i] * window;
      }
      for (let i = 1, j = 0; i < fftSize; i += 1) {
        let bit = fftSize >> 1;
        while (j & bit) { j ^= bit; bit >>= 1; }
        j ^= bit;
        if (i < j) {
          [real[i], real[j]] = [real[j], real[i]];
          [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
        }
      }
      for (let length = 2; length <= fftSize; length <<= 1) {
        const angle = -2 * Math.PI / length;
        const baseReal = Math.cos(angle);
        const baseImaginary = Math.sin(angle);
        for (let offset = 0; offset < fftSize; offset += length) {
          let phaseReal = 1;
          let phaseImaginary = 0;
          for (let i = 0; i < length / 2; i += 1) {
            const even = offset + i;
            const odd = even + length / 2;
            const oddReal = real[odd] * phaseReal - imaginary[odd] * phaseImaginary;
            const oddImaginary = real[odd] * phaseImaginary + imaginary[odd] * phaseReal;
            real[odd] = real[even] - oddReal;
            imaginary[odd] = imaginary[even] - oddImaginary;
            real[even] += oddReal;
            imaginary[even] += oddImaginary;
            const nextPhaseReal = phaseReal * baseReal - phaseImaginary * baseImaginary;
            phaseImaginary = phaseReal * baseImaginary + phaseImaginary * baseReal;
            phaseReal = nextPhaseReal;
          }
        }
      }
      const spectrum = new Float32Array(fftSize / 2 + 1);
      for (let i = 0; i < spectrum.length; i += 1) spectrum[i] = real[i] * real[i] + imaginary[i] * imaginary[i];
      return spectrum;
    }

    function melFilterBins(sampleRate, fftSize, count = 20) {
      const hzToMel = (hz) => 2595 * Math.log10(1 + hz / 700);
      const melToHz = (mel) => 700 * (10 ** (mel / 2595) - 1);
      const minMel = hzToMel(80);
      const maxMel = hzToMel(Math.min(7600, sampleRate / 2));
      const bins = Array.from({ length: count + 2 }, (_, index) => {
        const mel = minMel + ((maxMel - minMel) * index) / (count + 1);
        return Math.max(0, Math.min(fftSize / 2, Math.floor(((fftSize + 1) * melToHz(mel)) / sampleRate)));
      });
      return Array.from({ length: count }, (_, index) => ({ left: bins[index], center: bins[index + 1], right: bins[index + 2] }));
    }

    function extractMfccFrames(audio) {
      const fftSize = 512;
      const frameSize = Math.min(fftSize, Math.max(1, Math.round(audio.sampleRate * 0.025)));
      const hopSize = Math.max(1, Math.round(audio.sampleRate * 0.02));
      const filters = melFilterBins(audio.sampleRate, fftSize);
      const frames = [];
      for (let start = 0; start + frameSize <= audio.samples.length; start += hopSize) {
        const spectrum = fftPowerSpectrum(audio.samples.subarray(start, start + frameSize), fftSize);
        const logMel = filters.map(({ left, center, right }) => {
          let energy = 0;
          for (let bin = left; bin < center; bin += 1) energy += spectrum[bin] * ((bin - left) / Math.max(1, center - left));
          for (let bin = center; bin <= right; bin += 1) energy += spectrum[bin] * ((right - bin) / Math.max(1, right - center));
          return Math.log(Math.max(energy, 1e-10));
        });
        const vector = Array.from({ length: 12 }, (_, coefficient) => {
          const order = coefficient + 1;
          return logMel.reduce((sum, value, index) => (
            sum + value * Math.cos((Math.PI * order * (index + 0.5)) / logMel.length)
          ), 0);
        });
        frames.push({ t: (start + frameSize / 2) / audio.sampleRate, vector });
      }
      if (!frames.length) return [];
      for (let coefficient = 0; coefficient < frames[0].vector.length; coefficient += 1) {
        const values = frames.map((frame) => frame.vector[coefficient]);
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) || 1;
        frames.forEach((frame) => { frame.vector[coefficient] = (frame.vector[coefficient] - mean) / deviation; });
      }
      const stride = Math.max(1, Math.ceil(frames.length / 500));
      return frames.filter((_, index) => index % stride === 0);
    }

    function featureDistance(left, right) {
      let sum = 0;
      for (let i = 0; i < left.length; i += 1) sum += (left[i] - right[i]) ** 2;
      return Math.sqrt(sum / left.length);
    }

    function compareAcousticFeatures(referenceFrames, ownFrames) {
      const rows = referenceFrames.length;
      const columns = ownFrames.length;
      if (!rows || !columns) return [];
      const width = columns + 1;
      const costs = new Float64Array((rows + 1) * (columns + 1));
      costs.fill(Number.POSITIVE_INFINITY);
      costs[0] = 0;
      const directions = new Uint8Array(costs.length);
      const band = Math.max(Math.abs(rows - columns) + 2, Math.ceil(Math.max(rows, columns) * 0.28));
      for (let row = 1; row <= rows; row += 1) {
        const expectedColumn = (row * columns) / rows;
        const startColumn = Math.max(1, Math.floor(expectedColumn - band));
        const endColumn = Math.min(columns, Math.ceil(expectedColumn + band));
        for (let column = startColumn; column <= endColumn; column += 1) {
          const index = row * width + column;
          const diagonal = costs[(row - 1) * width + column - 1];
          const up = costs[(row - 1) * width + column];
          const left = costs[row * width + column - 1];
          let previous = diagonal;
          let direction = 1;
          if (up < previous) { previous = up; direction = 2; }
          if (left < previous) { previous = left; direction = 3; }
          costs[index] = featureDistance(referenceFrames[row - 1].vector, ownFrames[column - 1].vector) + previous;
          directions[index] = direction;
        }
      }
      if (!Number.isFinite(costs[rows * width + columns])) return [];
      const path = [];
      let row = rows;
      let column = columns;
      while (row > 0 && column > 0) {
        const distance = featureDistance(referenceFrames[row - 1].vector, ownFrames[column - 1].vector);
        const progress = ((row - 1) / Math.max(1, rows - 1) + (column - 1) / Math.max(1, columns - 1)) / 2;
        path.push({ progress, distance });
        const direction = directions[row * width + column];
        if (direction === 1) { row -= 1; column -= 1; }
        else if (direction === 2) row -= 1;
        else if (direction === 3) column -= 1;
        else break;
      }
      if (!path.length) return [];
      const distances = path.map((item) => item.distance);
      const upper = [...distances].sort((a, b) => a - b)[Math.floor(distances.length * 0.9)] || 1;
      const bins = Array.from({ length: 80 }, () => ({ total: 0, count: 0 }));
      path.forEach((item) => {
        const index = Math.min(bins.length - 1, Math.max(0, Math.floor(item.progress * bins.length)));
        bins[index].total += Math.min(1, item.distance / upper);
        bins[index].count += 1;
      });
      const values = bins.map((bin, index) => {
        if (bin.count) return bin.total / bin.count;
        const previous = bins.slice(0, index).reverse().find((item) => item.count);
        const next = bins.slice(index + 1).find((item) => item.count);
        const fallback = previous || next;
        return fallback ? fallback.total / fallback.count : 0;
      });
      return smoothNumberSeries(values, 2);
    }

    function pitchContourToSegments(points) {
      const clamp = (value) => Math.max(-12, Math.min(12, value));
      const toXY = (point) => `${point.tPct.toFixed(2)},${(50 - clamp(point.semitone) * (40 / 12)).toFixed(2)}`;
      const runs = [];
      let current = [];
      points.forEach((point) => {
        if (point.semitone === null || !Number.isFinite(point.semitone)) {
          if (current.length > 1) runs.push(current);
          current = [];
          return;
        }
        current.push(point);
      });
      if (current.length > 1) runs.push(current);
      const segments = [];
      runs.forEach((run) => {
        let piece = [];
        let pieceType = null;
        run.forEach((point) => {
          const type = point.filled ? "filled" : "real";
          if (pieceType && type !== pieceType) {
            piece.push(point);
            if (piece.length > 1) segments.push({ type: pieceType, points: piece });
            piece = [point];
          } else {
            piece.push(point);
          }
          pieceType = type;
        });
        if (piece.length > 1) segments.push({ type: pieceType, points: piece });
      });
      return segments.map((segment) => ({
        type: segment.type,
        d: `M${segment.points.map(toXY).join(" L")}`
      }));
    }

    function pitchSegmentsToSvg(points, source) {
      return pitchContourToSegments(points).map((segment) => {
        const cls = `pitch-compare-line pitch-compare-line-${source}${segment.type === "filled" ? " is-estimated" : ""}`;
        return `<path d="${segment.d}" class="${cls}" />`;
      }).join("");
    }

    function comparisonTabsHtml() {
      const tabs = [
        ["pitch", "语调"],
        ["energy", "重音"],
        ["rhythm", "节奏"],
        ["acoustic", "发音对比"]
      ];
      return `<div class="pitch-compare-tabs" role="tablist" aria-label="声音对比视图">${tabs.map(([value, label]) => (
        `<button type="button" role="tab" data-pitch-compare-view="${value}" aria-selected="${state.speaking.pitchCompareView === value}">${label}</button>`
      )).join("")}</div>`;
    }

    function compareTimeScalesHtml(durations) {
      return `<div class="pitch-compare-time-scales" aria-label="录音时间刻度">
        ${pitchTimeScale("范读", "tts", durations.tts)}
        ${pitchTimeScale("我的", "own", durations.own)}
      </div>`;
    }

    function energySeriesPath(points) {
      if (points.length < 2) return "";
      return `M${points.map((point) => (
        `${point.tPct.toFixed(2)},${(90 - Math.max(0, Math.min(1, point.value)) * 80).toFixed(2)}`
      )).join(" L")}`;
    }

    function rhythmLaneHtml(label, source, analysis) {
      return `<div class="pitch-rhythm-row pitch-rhythm-${source}">
        <span>${label}</span>
        <div class="pitch-rhythm-track">${analysis.segments.map((segment) => (
          `<i style="left:${segment.startPct.toFixed(2)}%;width:${Math.max(1, segment.endPct - segment.startPct).toFixed(2)}%"></i>`
        )).join("")}</div>
        <b>${analysis.pauseCount} 次停顿</b>
      </div>`;
    }

    function acousticDifferenceHtml(values) {
      if (!values.length) {
        return `<div class="pitch-analysis-empty">未提取到足够的声学特征，请重新录音并保持声音清晰。</div>`;
      }
      return `<div class="pitch-acoustic-strip" aria-label="声学差异沿句子进度分布">${values.map((value) => {
        const hue = Math.round(188 - Math.max(0, Math.min(1, value)) * 158);
        return `<i style="background:hsl(${hue} 82% 52%)"></i>`;
      }).join("")}</div>`;
    }

    function renderPitchCompareChart(result = state.speaking.pitchCompareResult) {
      const chart = $("pitchCompareChart");
      if (!chart || !result) return;
      const tabs = comparisonTabsHtml();
      const timeScales = compareTimeScalesHtml(result.durations);
      if (state.speaking.pitchCompareView === "energy") {
        chart.innerHTML = `${tabs}
          <div class="pitch-compare-head">
            <span>相对音量</span>
            <div class="pitch-compare-legend">
              <span class="pitch-compare-legend-item pitch-compare-legend-tts">范读</span>
              <span class="pitch-compare-legend-item pitch-compare-legend-own">我的录音</span>
            </div>
          </div>
          <div class="pitch-compare-plot">
            <div class="pitch-compare-scale" aria-hidden="true"><span>强</span><span>中</span><span>弱</span></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="pitch-compare-svg" role="img" aria-label="范读与我的录音相对音量曲线">
              <line x1="0" y1="10" x2="100" y2="10" class="pitch-compare-grid" />
              <line x1="0" y1="50" x2="100" y2="50" class="pitch-compare-grid is-baseline" />
              <line x1="0" y1="90" x2="100" y2="90" class="pitch-compare-grid" />
              <path d="${energySeriesPath(result.energy.tts.points)}" class="pitch-compare-line pitch-compare-line-tts" />
              <path d="${energySeriesPath(result.energy.own.points)}" class="pitch-compare-line pitch-compare-line-own" />
            </svg>
          </div>
          ${timeScales}`;
      } else if (state.speaking.pitchCompareView === "rhythm") {
        chart.innerHTML = `${tabs}
          <div class="pitch-compare-head"><span>发声与停顿</span><span class="pitch-compare-head-note">色块为发声段</span></div>
          <div class="pitch-rhythm-lanes">
            ${rhythmLaneHtml("范读", "tts", result.energy.tts)}
            ${rhythmLaneHtml("我的", "own", result.energy.own)}
          </div>
          ${timeScales}`;
      } else if (state.speaking.pitchCompareView === "acoustic") {
        chart.innerHTML = `${tabs}
          <div class="pitch-compare-head"><span>声学差异</span><span class="pitch-compare-head-note">暖色表示差异更明显</span></div>
          ${acousticDifferenceHtml(result.acoustic)}
          <div class="pitch-acoustic-labels"><span>较接近</span><span>差异较大</span></div>
          ${timeScales}`;
      } else {
        chart.innerHTML = `${tabs}
        <div class="pitch-compare-head">
          <span>相对音高</span>
          <div class="pitch-compare-legend">
            <span class="pitch-compare-legend-item pitch-compare-legend-tts">范读</span>
            <span class="pitch-compare-legend-item pitch-compare-legend-own">我的录音</span>
          </div>
        </div>
        <div class="pitch-compare-plot">
          <div class="pitch-compare-scale" aria-hidden="true"><span>+12</span><span>0</span><span>−12</span></div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="pitch-compare-svg" role="img" aria-label="范读与我的录音相对音高曲线">
            <line x1="0" y1="10" x2="100" y2="10" class="pitch-compare-grid" />
            <line x1="0" y1="50" x2="100" y2="50" class="pitch-compare-grid is-baseline" />
            <line x1="0" y1="90" x2="100" y2="90" class="pitch-compare-grid" />
            ${pitchSegmentsToSvg(result.pitch.tts, "tts")}
            ${pitchSegmentsToSvg(result.pitch.own, "own")}
          </svg>
        </div>
        ${timeScales}`;
      }
      chart.hidden = false;
    }

    function setPitchCompareStatus(message) {
      const status = $("pitchCompareStatus");
      if (!status) return;
      status.textContent = message;
      status.hidden = !message;
    }

    async function comparePitchWithOriginal() {
      if (state.speaking.pitchCompareBusy) return;
      if (!state.speaking.recordedAudioBlob) {
        setPitchCompareStatus("请先录音，再跟原声对比。");
        return;
      }
      state.speaking.pitchCompareBusy = true;
      const button = $("pitchCompareBtn");
      const buttonText = button?.textContent || "跟原声对比";
      if (button) {
        button.disabled = true;
        button.textContent = "分析中…";
      }
      setPitchCompareStatus("正在获取原声…");
      try {
        const ttsBlob = await getOrCaptureTtsAudio();
        setPitchCompareStatus("正在分析声音…");
        const [ttsAudio, ownAudio] = await Promise.all([
          decodeAudioForAnalysis(ttsBlob),
          decodeAudioForAnalysis(state.speaking.recordedAudioBlob)
        ]);
        await waitMs(0);
        const ttsContour = extractPitchContour(ttsAudio);
        const ownContour = extractPitchContour(ownAudio);
        const ttsPoints = normalizePitchContour(ttsContour);
        const ownPoints = normalizePitchContour(ownContour);
        if (ttsPoints.length < 2) {
          state.speaking.ttsAudioCache.delete(ttsCacheKey());
          clearSharedTtsAudioStream();
          throw new Error("范读音频没有捕获到有效声音，已清除本次共享，请重新选择此标签页并保持“分享音频”开启。");
        }
        if (ownPoints.length < 2) throw new Error("你的录音中没有检测到稳定音高，请重新录音并保持声音清晰。");
        const ttsEnergy = extractEnergyAnalysis(ttsAudio);
        const ownEnergy = extractEnergyAnalysis(ownAudio);
        const acoustic = compareAcousticFeatures(extractMfccFrames(ttsAudio), extractMfccFrames(ownAudio));
        state.speaking.pitchCompareResult = {
          pitch: { tts: ttsPoints, own: ownPoints },
          energy: { tts: ttsEnergy, own: ownEnergy },
          acoustic,
          durations: {
            tts: ttsEnergy.duration || pitchContourDuration(ttsContour),
            own: ownEnergy.duration || pitchContourDuration(ownContour)
          }
        };
        renderPitchCompareChart();
        setPitchCompareStatus("本地对比显示语调、重音、节奏和声学差异，不代表发音评分。");
      } catch (error) {
        const message = error?.name === "NotAllowedError"
          ? "已取消共享，未生成对比图。"
          : `对比失败：${error.message || error}`;
        setPitchCompareStatus(message);
      } finally {
        state.speaking.pitchCompareBusy = false;
        if (button) {
          button.disabled = false;
          button.textContent = buttonText;
        }
      }
    }

    function speakingCapabilityText() {
      const notes = [];
      if (!speechRecognitionCtor()) notes.push("当前浏览器不支持自动识别，可先使用录音回放练习。");
      if (!navigator.mediaDevices || !window.MediaRecorder) notes.push("当前浏览器不支持录音回放。");
      return notes.join(" ");
    }

    function setSpeakingStatus(message = "") {
      const capability = speakingCapabilityText();
      $("speakingStatus").innerHTML = [message, capability].filter(Boolean).join(" ");
    }

    function renderSpeakingPage() {
      if (!$("speakingCompare")) return;
      const target = currentSentence();
      const metrics = state.speaking.spokenText
        ? (state.speaking.metrics || compareSpeakingText(target, state.speaking.spokenText))
        : { score: 0, wrong: 0, extra: 0, missing: 0, compareItems: [] };
      $("speakingScore").textContent = `${metrics.score}%`;
      $("speakingVolume").textContent = Math.round(state.speaking.volumeSamples ? state.speaking.volumeTotal / state.speaking.volumeSamples : state.speaking.volumeLevel);
      $("speakingMissing").textContent = metrics.missing;
      $("speakingWrong").textContent = metrics.wrong;
      $("speakingExtra").textContent = metrics.extra;
      $("speakingCompare").innerHTML = metrics.compareItems.length
        ? metrics.compareItems.map((item) => renderSpeakingCompareItem(item)).join(" ")
        : '<span class="empty">请说话 ...</span>';
      const holdButton = $("startSpeakingBtn");
      const isListening = state.speaking.holdActive || state.speaking.permissionLock || state.speaking.isStarting || state.speaking.isRecognizing || state.speaking.isRecording;
      holdButton.textContent = isListening ? "正在聆听" : "按住说话";
      holdButton.classList.toggle("is-listening", isListening);
      $("speakingAudio").src = state.speaking.recordedAudioUrl || "";
      $("recordingStatus").textContent = state.speaking.recordedAudioUrl
        ? "已生成本次录音，可直接回放。"
        : "录音完成后会出现在这里。";
      setSpeakingStatus();
      renderVolumeMeter();
      setLoopCompareButtonState();
    }

    function renderVolumeMeter() {
      const meter = $("speakingVolumeMeter");
      if (!meter) return;
      const level = Math.max(0, Math.min(100, state.speaking.volumeLevel || 0));
      const barCount = 12;
      const activeCount = Math.round((level / 100) * barCount);
      meter.classList.toggle("is-active", state.speaking.isRecording || state.speaking.isRecognizing || state.speaking.isStarting);
      meter.innerHTML = Array.from({ length: barCount }, (_, index) => (
        `<span class="${index < activeCount ? "active" : ""}"></span>`
      )).join("");
    }

    function renderSpeakingCompareItem(item) {
      if (item.type === "wrong") {
        return `<span class="speech-word wrong">${escapeHtml(item.text)} <span class="expected">(<span class="actual">${escapeHtml(item.actual)}</span>)</span></span>`;
      }
      if (item.type === "missing") {
        return `<span class="speech-word missing">${escapeHtml(item.text)} <span class="expected">(<span class="actual">X</span>)</span></span>`;
      }
      return `<span class="speech-word ${item.type}">${escapeHtml(item.text)}</span>`;
    }

    function resetSpeakingResult() {
      stopLoopCompare();
      state.speaking.spokenText = "";
      state.speaking.metrics = null;
      state.speaking.volumeLevel = 0;
      state.speaking.volumeTotal = 0;
      state.speaking.volumeSamples = 0;
      if (state.speaking.recordedAudioUrl) URL.revokeObjectURL(state.speaking.recordedAudioUrl);
      state.speaking.recordedAudioUrl = "";
      state.speaking.recordedAudioBlob = null;
      state.speaking.audioChunks = [];
      if ($("pitchCompareChart")) $("pitchCompareChart").hidden = true;
      state.speaking.pitchCompareResult = null;
      state.speaking.pitchCompareView = "pitch";
      setPitchCompareStatus("");
      renderSpeakingPage();
    }

    function stopVolumeMeter() {
      if (state.speaking.volumeFrame) {
        cancelAnimationFrame(state.speaking.volumeFrame);
        state.speaking.volumeFrame = 0;
      }
      if (state.speaking.audioContext) {
        state.speaking.audioContext.close().catch(() => {});
        state.speaking.audioContext = null;
      }
      state.speaking.volumeAnalyser = null;
    }

    function startVolumeMeter(stream) {
      stopVolumeMeter();
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      state.speaking.audioContext = audioContext;
      state.speaking.volumeAnalyser = analyser;

      const tick = () => {
        if (!state.speaking.volumeAnalyser) return;
        state.speaking.volumeAnalyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const centered = (sample - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        const level = Math.max(0, Math.min(100, Math.round(rms * 240)));
        state.speaking.volumeLevel = level;
        state.speaking.volumeTotal += level;
        state.speaking.volumeSamples += 1;
        if ($("speakingVolume")) $("speakingVolume").textContent = Math.round(state.speaking.volumeTotal / state.speaking.volumeSamples);
        renderVolumeMeter();
        state.speaking.volumeFrame = requestAnimationFrame(tick);
      };
      tick();
    }

    function startSpeechRecognition() {
      const Recognition = speechRecognitionCtor();
      if (!Recognition) return false;
      const recognition = new Recognition();
      state.speaking.recognition = recognition;
      recognition.lang = ttsAccent() || "en-GB";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        state.speaking.permissionLock = false;
        state.speaking.isRecognizing = true;
        renderSpeakingPage();
      };
      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0] ? result[0].transcript : "")
          .join(" ")
          .trim();
        state.speaking.spokenText = text;
        state.speaking.metrics = compareSpeakingText(currentSentence(), text);
        renderSpeakingPage();
      };
      recognition.onerror = (event) => {
        state.speaking.permissionLock = false;
        setSpeakingStatus(`识别失败：${event.error || "未知错误"}`);
      };
      recognition.onend = () => {
        state.speaking.permissionLock = false;
        state.speaking.isRecognizing = false;
        state.speaking.recognition = null;
        state.speaking.metrics = compareSpeakingText(currentSentence(), state.speaking.spokenText);
        renderSpeakingPage();
      };
      state.speaking.permissionLock = true;
      renderSpeakingPage();
      recognition.start();
      return true;
    }

    async function startRecording() {
      if (!navigator.mediaDevices || !window.MediaRecorder) return false;
      state.speaking.permissionLock = true;
      renderSpeakingPage();
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } finally {
        state.speaking.permissionLock = false;
      }
      const recorder = new MediaRecorder(stream);
      state.speaking.mediaStream = stream;
      state.speaking.mediaRecorder = recorder;
      state.speaking.audioChunks = [];
      startVolumeMeter(stream);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) state.speaking.audioChunks.push(event.data);
      };
      recorder.onstop = () => {
        stopVolumeMeter();
        if (state.speaking.recordedAudioUrl) URL.revokeObjectURL(state.speaking.recordedAudioUrl);
        const blob = new Blob(state.speaking.audioChunks, { type: recorder.mimeType || "audio/webm" });
        state.speaking.recordedAudioUrl = URL.createObjectURL(blob);
        state.speaking.recordedAudioBlob = blob;
        state.speaking.isRecording = false;
        state.speaking.mediaRecorder = null;
        if (state.speaking.mediaStream) {
          state.speaking.mediaStream.getTracks().forEach((track) => track.stop());
          state.speaking.mediaStream = null;
        }
        renderSpeakingPage();
      };
      recorder.start();
      state.speaking.isRecording = true;
      renderSpeakingPage();
      return true;
    }

    async function startSpeakingPractice() {
      clearScheduledSpeakingStop();
      if (state.speaking.isStarting || state.speaking.isRecognizing || state.speaking.isRecording) return;
      state.speaking.isStarting = true;
      state.speaking.stopAfterStart = false;
      resetSpeakingResult();
      let startedRecognition = false;
      let startedRecording = false;
      try {
        startedRecognition = startSpeechRecognition();
      } catch (error) {
        setSpeakingStatus(`无法启动识别：${error.message || error}`);
      }
      try {
        startedRecording = await startRecording();
      } catch (error) {
        setSpeakingStatus(`无法启动录音：${error.message || "请检查麦克风权限"}`);
      }
      if (!startedRecognition && !startedRecording) {
        setSpeakingStatus("当前浏览器无法启动识别或录音。");
      }
      state.speaking.isStarting = false;
      renderSpeakingPage();
      if (state.speaking.stopAfterStart) stopSpeakingPractice();
    }

    function clearScheduledSpeakingStop() {
      if (!state.speaking.stopTimer) return;
      clearTimeout(state.speaking.stopTimer);
      state.speaking.stopTimer = null;
    }

    function scheduleStopSpeakingPractice(delay = 300) {
      clearScheduledSpeakingStop();
      state.speaking.holdActive = false;
      state.speaking.stopTimer = setTimeout(() => {
        state.speaking.stopTimer = null;
        stopSpeakingPractice();
      }, delay);
      renderSpeakingPage();
    }

    function stopRecording() {
      if (state.speaking.mediaRecorder && state.speaking.mediaRecorder.state !== "inactive") {
        state.speaking.mediaRecorder.stop();
        return;
      }
      if (state.speaking.mediaStream) {
        state.speaking.mediaStream.getTracks().forEach((track) => track.stop());
        state.speaking.mediaStream = null;
      }
      stopVolumeMeter();
      state.speaking.isRecording = false;
    }

    function stopSpeakingPractice() {
      clearScheduledSpeakingStop();
      if (state.speaking.permissionLock) {
        state.speaking.holdActive = true;
        state.speaking.stopAfterStart = false;
        renderSpeakingPage();
        return;
      }
      if (state.speaking.isStarting) {
        state.speaking.holdActive = false;
        state.speaking.stopAfterStart = true;
        renderSpeakingPage();
        return;
      }
      state.speaking.holdActive = false;
      state.speaking.stopAfterStart = false;
      state.speaking.isStarting = false;
      if (state.speaking.recognition) {
        try { state.speaking.recognition.stop(); } catch {}
      }
      stopRecording();
      state.speaking.isRecognizing = false;
      state.speaking.metrics = compareSpeakingText(currentSentence(), state.speaking.spokenText);
      renderSpeakingPage();
    }

    function getTypingIntervals() {
      const inputEvents = state.events.filter((event) => event.type === "input");
      const intervals = [];
      for (let i = 1; i < inputEvents.length; i += 1) {
        intervals.push(inputEvents[i].time - inputEvents[i - 1].time);
      }
      return intervals;
    }

    function calculateMetrics() {
      const target = currentSentence();
      const input = typingBox.value;
      const elapsedMs = state.startedAt ? Math.max(1, performance.now() - state.startedAt) : 0;
      const minutes = elapsedMs / 60000;
      const typedChars = input.length;
      const words = input.trim() ? input.trim().split(/\s+/).length : 0;
      const { correct, errors, inputLength, targetLength } = compareText(input, target);
      const accuracyBase = Math.max(inputLength, targetLength, 1);
      const accuracy = Math.max(0, Math.round((correct / accuracyBase) * 100));
      const intervals = getTypingIntervals();
      const avgInterval = intervals.length ? intervals.reduce((sum, item) => sum + item, 0) / intervals.length : 0;
      const pauseCount = intervals.filter((item) => item > 1200).length;
      const cpm = minutes ? Math.round(typedChars / minutes) : 0;
      const wpm = minutes ? Math.round(words / minutes) : 0;
      const variance = intervals.length
        ? intervals.reduce((sum, item) => sum + Math.pow(item - avgInterval, 2), 0) / intervals.length
        : 0;
      const stabilityPenalty = Math.min(28, Math.sqrt(variance) / 35);
      const pausePenalty = Math.min(30, pauseCount * 7);
      const errorPenalty = Math.min(35, errors.length * 8);
      const speedBonus = Math.min(14, cpm / 25);
      const fluency = Math.max(0, Math.min(100, Math.round(78 + speedBonus - stabilityPenalty - pausePenalty - errorPenalty)));

      return { accuracy, cpm, wpm, pauseCount, fluency, errors, typedChars, targetLength: target.length, avgInterval };
    }

    function renderTarget() {
      const target = currentSentence();
      const translation = currentTranslation();
      const hasGrammarCache = Boolean(currentGrammar());
      $("analyzeGrammarBtn").classList.toggle("has-cache", hasGrammarCache);
      const grammarAvailable = currentLearningLanguage().grammarAnalysisEnabled;
      if (!state.grammarLoading) $("analyzeGrammarBtn").disabled = !grammarAvailable;
      $("analyzeGrammarBtn").title = !grammarAvailable
        ? `${currentLearningLanguage().label}的 Ai 语法分析稍后接入`
        : hasGrammarCache
          ? "当前句已有缓存：左键查看，右键更多选项"
          : "左键分析当前句，右键更多选项";
      const showTranslation = $("showTranslationToggle").checked;
      const translationText = translation ? escapeHtml(displayedTranslation(translation)) : "暂无翻译";
      const languageToggle = chineseTranslationToggle(translation);
      const translationHtml = state.translationEditing
        ? `<div class="translation-prompt translation-editor">
            <textarea id="translationInlineInput" spellcheck="false" aria-label="编辑当前句翻译">${escapeHtml(state.translationDraft)}</textarea>
            <div class="translation-editor-actions">
              <button type="button" data-translation-action="save">保存</button>
              <button type="button" data-translation-action="cancel">取消</button>
            </div>
          </div>`
        : `<div class="translation-prompt ${showTranslation ? "" : "is-hidden"}${languageToggle ? " has-language-toggle" : ""}">
            <span aria-hidden="${showTranslation ? "false" : "true"}">${translationText}</span>
            <div class="translation-actions">${hasGrammarCache ? grammarToggleButton(state.grammarVisible) : ""}${languageToggle}<button class="translation-edit-button" type="button" data-translation-action="edit">编辑</button></div>
          </div>`;
      const grammarHtml = renderGrammarAnalysis();
      const input = typingBox.value;
      const inputChars = getCheckChars(input);
      let checkIndex = 0;
      let html = "";

      if (!$("showSourceToggle").checked) {
        targetEl.className = "target hidden-source";
        const revealedCount = getRevealedWordCount(input, target);
        let wordIndex = 0;
        html = getTargetWordPieces(target).map((piece) => {
          if (piece.type === "text") return escapeHtml(piece.text);
          const isRevealed = wordIndex < revealedCount;
          const currentWordIndex = wordIndex;
          wordIndex += 1;
          if (isRevealed) {
            return `<span class="target-word revealed-word" data-word="${escapeHtml(piece.text)}" data-word-index="${currentWordIndex}">${escapeHtml(piece.text)}</span>`;
          }
          return `<span class="target-word covered-word" data-word="${escapeHtml(piece.text)}" data-word-index="${currentWordIndex}">${escapeHtml(piece.text)}</span>`;
        }).join("");
        placeTargetContent(`<span class="target-english"><span class="target-english-text">${html || "&nbsp;"}</span>${sentenceFavoriteButton(target)}</span>${translationHtml}${grammarHtml}`, true);
        return;
      }

      const alignment = alignInputWords(input, target);
      const correctTargetWords = new Set(
        alignment.pairs
          .filter((pair) => pair.status === "correct")
          .map((pair) => pair.targetIndex)
      );
      const wrongTargetWords = new Set(
        alignment.pairs
          .filter((pair) => pair.status === "wrong" && pair.targetIndex < alignment.targetWords.length)
          .map((pair) => pair.targetIndex)
      );
      let targetWordIndex = 0;

      html = getTargetWordPieces(target).map((piece) => {
        if (piece.type === "text") return escapeHtml(piece.text);
        const isWrong = wrongTargetWords.has(targetWordIndex);
        const isDone = correctTargetWords.has(targetWordIndex);
        const currentWordIndex = targetWordIndex;
        targetWordIndex += 1;
        const className = isWrong ? "wrong" : (isDone ? "done" : "pending");
        return `<span class="target-word ${className}" data-word="${escapeHtml(piece.text)}" data-word-index="${currentWordIndex}">${escapeHtml(piece.text)}</span>`;
      }).join("");

      placeTargetContent(`<span class="target-english"><span class="target-english-text">${html || "&nbsp;"}</span>${sentenceFavoriteButton(target)}</span>${translationHtml}${grammarHtml}`, false);
    }

    // The current sentence keeps its full dictation view (word states, covered words, favorite, translation editor,
    // grammar) in both layouts; 长文显示 only adds plain neighbouring sentences around it.
    // 单句显示 (single) / 长文显示 (long) / 长文聚焦 (focus: current sentence always centred, others dimmed).
    function sourceDisplayMode() {
      const value = $("displayModeSelect").value;
      return ["long", "focus"].includes(value) ? value : "single";
    }

    function isLongTextDisplay() {
      return sourceDisplayMode() !== "single";
    }

    function placeTargetContent(currentHtml, hiddenSource) {
      // The long-text views use a smaller source font; the dictation input follows it so typed text still wraps like the source.
      $("typingShell").classList.toggle("is-long-text", isLongTextDisplay());
      if (isLongTextDisplay()) {
        renderLongTextTarget(currentHtml, hiddenSource);
      } else {
        targetEl.className = hiddenSource ? "target hidden-source" : "target";
        targetEl.innerHTML = currentHtml;
      }
      updateCounter();
      syncTypingShellHeight();
    }

    const LONG_TEXT_CONTEXT_SIZE = 15;

    function longTextEnglishHtml(text) {
      return getTargetWordPieces(text).map((piece) => (
        piece.type === "text"
          ? escapeHtml(piece.text)
          : `<span class="target-word" data-word="${escapeHtml(piece.text)}">${escapeHtml(piece.text)}</span>`
      )).join("");
    }

    // Both long-text modes show a window of sentences around the current one and keep the current sentence centred;
    // 长文聚焦 additionally fades the other sentences.
    function renderLongTextTarget(currentHtml, hiddenSource) {
      const total = state.sentences.length;
      const half = Math.floor(LONG_TEXT_CONTEXT_SIZE / 2);
      const lastStart = Math.max(0, total - LONG_TEXT_CONTEXT_SIZE);
      const focus = sourceDisplayMode() === "focus";
      const start = Math.max(0, Math.min(state.index - half, lastStart));
      const end = Math.min(total, start + LONG_TEXT_CONTEXT_SIZE);
      const wasLongText = targetEl.classList.contains("long-text-target");
      const previousScroll = targetEl.scrollTop;
      const showSource = $("showSourceToggle").checked;
      const showTranslation = $("showTranslationToggle").checked;
      const analysedKeys = grammarCacheKeySet();
      const rows = [];
      for (let index = start; index < end; index += 1) {
        if (index === state.index) {
          rows.push(`<div class="long-text-item is-current" data-long-text-index="${index}">${currentHtml}</div>`);
          continue;
        }
        const item = normalizeSentenceItem(state.sentences[index]);
        const languageToggle = chineseTranslationToggle(item.translation);
        rows.push(`<div class="long-text-item" data-long-text-index="${index}" title="点击切换到这一句">
          <span class="target-english"><span class="target-english-text${showSource ? "" : " long-text-hidden-note"}">${showSource ? longTextEnglishHtml(item.text) : "原文已隐藏"}</span>${sentenceFavoriteButton(item.text)}</span>
          <div class="translation-prompt ${showTranslation ? "" : "is-hidden"}${languageToggle ? " has-language-toggle" : ""}"><span aria-hidden="${showTranslation ? "false" : "true"}">${escapeHtml(item.translation || "暂无翻译")}</span><div class="translation-actions">${sentenceHasGrammar(item, analysedKeys) ? grammarToggleButton(false) : ""}${languageToggle}<button class="translation-edit-button" type="button" data-translation-action="edit" title="切换到这一句并编辑翻译">编辑</button></div></div>
        </div>`);
      }
      targetEl.className = `target long-text-target${focus ? " is-focus" : ""}${hiddenSource ? " hidden-source" : ""}`;
      targetEl.style.scrollBehavior = "auto";
      targetEl.innerHTML = rows.join("");
      if (wasLongText) targetEl.scrollTop = previousScroll;
      requestAnimationFrame(() => {
        const current = targetEl.querySelector(".long-text-item.is-current");
        if (!current) return;
        // Measured from the rendered boxes: .target is not positioned, so offsetTop would be relative to an outer element.
        const top = current.getBoundingClientRect().top - targetEl.getBoundingClientRect().top;
        targetEl.scrollTop += top - (targetEl.clientHeight - current.offsetHeight) / 2;
      });
    }

    // The dictation box mirrors a source row: typed text on the left, and on the right #typingSide, a placeholder
    // column matching the source's favorite-star column (reserved for future input controls). Its width is measured
    // rather than fixed because the source sits in a differently padded box (and a scrollbar in 长文显示), so the
    // typed text gets exactly the source text's width and wraps at the same word. The box starts as one line and
    // grows only when the typed text wraps onto another line.
    function alignTypingWidthWithSource() {
      const text = targetEl.querySelector(".long-text-item.is-current .target-english-text") || targetEl.querySelector(".target-english-text");
      const shellWidth = $("typingShell").getBoundingClientRect().width;
      const horizontalPadding = 20;
      const sideWidth = text && shellWidth
        ? Math.max(0, shellWidth - horizontalPadding - text.getBoundingClientRect().width)
        : 0;
      $("typingSide").style.width = `${sideWidth}px`;
      typingBox.style.overflow = "hidden";
    }

    function syncTypingShellHeight() {
      alignTypingWidthWithSource();
      typingBox.style.minHeight = "0px";
      typingBox.style.height = "0px";
      const height = `${Math.max(typingBox.scrollHeight, 42)}px`;
      $("typingShell").style.minHeight = height;
      $("typingShell").style.height = height;
      typingBox.style.minHeight = height;
      typingBox.style.height = height;
      $("typedPreview").style.minHeight = height;
    }

    function renderTypedPreview() {
      const input = typingBox.value;
      if (!input) {
        typedPreviewEl.innerHTML = "";
        return;
      }

      const alignment = alignInputWords(input, currentSentence());
      const inputStatus = new Map(alignment.pairs.map((pair) => [pair.inputIndex, pair.status]));
      let html = "";
      let cursor = 0;

      alignment.inputWords.forEach((word, index) => {
        if (word.start > cursor) html += escapeHtml(input.slice(cursor, word.start));
        const pairStatus = inputStatus.get(index);
        const status = pairStatus === "wrong" ? "typed-error" : "typed-ok";
        html += `<span class="${status}">${escapeHtml(input.slice(word.start, word.end))}</span>`;
        cursor = word.end;
      });

      if (cursor < input.length) html += escapeHtml(input.slice(cursor));

      typedPreviewEl.innerHTML = html;
    }

    function renderErrors(metrics = calculateMetrics()) {
      if (!errorsEl) return;
      if (!metrics.errors.length) {
        errorsEl.innerHTML = '<div class="empty">目前没有发现拼写错误。</div>';
        return;
      }

      errorsEl.innerHTML = metrics.errors.map((error) => `
        <div class="error-item">
          <span class="error-pos">#${error.pos}</span>
          <span class="error-text">
            应为 <span class="kbd">${escapeHtml(charLabel(error.expected))}</span>
            ，输入 <span class="kbd">${escapeHtml(charLabel(error.actual))}</span>
          </span>
        </div>
      `).join("");
    }

    function renderMetrics(metrics = calculateMetrics()) {
      $("accuracy").textContent = `${metrics.accuracy}%`;
      $("wpm").textContent = metrics.wpm;
      $("cpm").textContent = metrics.cpm;
      $("pauseCount").textContent = metrics.pauseCount;
      $("fluencyText").textContent = metrics.fluency;
      $("errorCount").textContent = metrics.errors.length;
      renderErrors(metrics);
    }

    function render() {
      renderTarget();
      renderTypedPreview();
      renderErrors();
      renderSpeakingPage();
    }

    function switchSpeakingSentence(nextIndex, shouldSpeak = false) {
      stopFullTextReading();
      stopSpeakingPractice();
      stopSentenceAudio();
      state.index = (nextIndex + state.sentences.length) % state.sentences.length;
      state.translationEditing = false;
      state.translationDraft = "";
      state.grammarVisible = false;
      resetGrammarInteraction();
      typingBox.value = "";
      state.events = [];
      state.startedAt = 0;
      state.finished = false;
      state.lastSpokenWordKey = "";
      state.replayRate = 1;
      updateSpeechRateIndicator();
      resetSpeakingResult();
      render();
      saveLastPosition();
      if (shouldSpeak) autoSpeakCurrentSentence();
    }

    function resetCurrent(shouldSpeak = false) {
      if (!state.fullTextAdvancing) {
        stopFullTextReading();
        stopSentenceAudio();
      }
      closeDictionaryLookup();
      state.translationEditing = false;
      state.translationDraft = "";
      state.grammarVisible = false;
      resetGrammarInteraction();
      typingBox.value = "";
      state.events = [];
      state.startedAt = 0;
      state.finished = false;
      state.lastSpokenWordKey = "";
      state.replayRate = 1;
      updateSpeechRateIndicator();
      render();
      saveLastPosition();
      if (shouldSpeak) autoSpeakCurrentSentence();
    }

    // Sentences with a mistake in any recorded practice event of the current language.
    function mistakeSentenceIndices() {
      const refs = new Set();
      const texts = new Set();
      userData.entries("practiceEvent", languageScope()).forEach(({ value }) => {
        if (!Array.isArray(value) || !(Number(value[7]) > 0)) return;
        if (value[1]) refs.add(`${value[1]}#${value[2]}`);
        else if (value[4]) texts.add(value[4]);
      });
      return state.sentences
        .map((item, index) => {
          const normalized = normalizeSentenceItem(item);
          return refs.has(`${normalized.libraryId}#${normalized.id}`) || texts.has(normalized.text) ? index : -1;
        })
        .filter((index) => index >= 0);
    }

    const RANDOM_HISTORY_LIMIT = 10;

    function pickSentenceIndex(direction = 1) {
      const mode = $("modeSelect").value;
      if (mode === "random") {
        if (!Array.isArray(state.randomHistory)) state.randomHistory = [];
        if (!Array.isArray(state.randomForwardStack)) state.randomForwardStack = [];
        if (direction < 0) {
          if (!state.randomHistory.length) return state.index;
          state.randomForwardStack.push(state.index);
          if (state.randomForwardStack.length > RANDOM_HISTORY_LIMIT) state.randomForwardStack.shift();
          return state.randomHistory.pop();
        }
        if (state.randomForwardStack.length) {
          state.randomHistory.push(state.index);
          if (state.randomHistory.length > RANDOM_HISTORY_LIMIT) state.randomHistory.shift();
          return state.randomForwardStack.pop();
        }
        if (state.sentences.length <= 1) return 0;
        state.randomHistory.push(state.index);
        if (state.randomHistory.length > RANDOM_HISTORY_LIMIT) state.randomHistory.shift();
        let next = state.index;
        while (next === state.index) {
          next = Math.floor(Math.random() * state.sentences.length);
        }
        return next;
      }

      if (mode === "mistakes") {
        const indices = mistakeSentenceIndices();
        if (indices.length) {
          const currentPosition = indices.indexOf(state.index);
          if (currentPosition < 0) return direction < 0 ? indices[indices.length - 1] : indices[0];
          return indices[(currentPosition + direction + indices.length) % indices.length];
        }
      }

      return (state.index + direction + state.sentences.length) % state.sentences.length;
    }

    function pickNextIndex() {
      return pickSentenceIndex(1);
    }

    function toggleSourceVisibility() {
      $("showSourceToggle").checked = !$("showSourceToggle").checked;
      saveSpeechSettings();
      renderTarget();
    }

    function toggleTranslationVisibility() {
      $("showTranslationToggle").checked = !$("showTranslationToggle").checked;
      saveSpeechSettings();
      renderTarget();
    }

    function goNextSentence() {
      state.index = pickNextIndex();
      resetCurrent(true);
    }

    function goPreviousSentence() {
      state.index = pickSentenceIndex(-1);
      resetCurrent(true);
    }

    // Up / Down keys: the neighbouring sentence in library order, whatever the practice mode, so random practice can
    // still step through the text around the current sentence.
    function goSentenceInOrder(direction) {
      const total = state.sentences.length;
      if (!total) return;
      state.index = (state.index + direction + total) % total;
      resetCurrent(true);
    }

    function stopSpeech() {
      stopFullTextReading();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      stopSentenceAudio();
    }

    function closeTopMenus(exceptMenu = null) {
      document.querySelectorAll(".font-menu, .user-menu").forEach((menu) => {
        if (menu !== exceptMenu) menu.removeAttribute("open");
      });
    }

    function finishCurrent() {
      if (!typingBox.value.trim() && !state.startedAt) return;
      state.finished = true;
      const metrics = calculateMetrics();
      renderMetrics(metrics);
      // The home-page dictation is not recorded (it will be removed); practice events come from sentence review.
      state.index = pickNextIndex();
      resetCurrent(true);
    }

    typingBox.addEventListener("keydown", (event) => {
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key === "Escape") {
        event.preventDefault();
        typingBox.blur();
        return;
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key === "-") {
        event.preventDefault();
        replaySlower();
        return;
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key === "=") {
        event.preventDefault();
        replayCurrentSpeed();
        return;
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && (event.key === "`" || event.code === "Backquote")) {
        event.preventDefault();
        replayNormalSpeed();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        finishCurrent();
        return;
      }
      if (event.ctrlKey && event.key === "Backspace") {
        event.preventDefault();
        resetCurrent();
      }
    });

    typingBox.addEventListener("input", syncTypingShellHeight);
    typingBox.addEventListener("input", (event) => {
      if (!state.startedAt) state.startedAt = performance.now();
      const inputType = event.inputType || "";
      state.events.push({
        type: inputType.startsWith("delete") ? "delete" : "input",
        value: typingBox.value,
        time: performance.now()
      });
      state.finished = false;
      maybeSpeakCompletedWord(inputType);
      render();
    });

    typingBox.addEventListener("scroll", () => {
      typedPreviewEl.scrollTop = typingBox.scrollTop;
      typedPreviewEl.scrollLeft = typingBox.scrollLeft;
    });

    $("fileInput").addEventListener("change", async (event) => {
      // 自定义句库 imports text only; audio + subtitle materials are imported in the 音频字幕 panel.
      await importSentenceFile(event.target.files[0]);
      event.target.value = "";
    });

    $("useTextBtn").addEventListener("click", () => {
      const sentences = parseSentences($("sentenceInput").value);
      if (!sentences.length) return;
      fillTranslationsFromCache(sentences);
      state.sentences = sentences;
      state.index = 0;
      setCurrentLibrary("自定义句库", sentenceSourceLabel("粘贴内容", sentences));
      resetCurrent(true);
    });

    $("saveAiSettingsBtn").addEventListener("click", saveAiSettings);
    document.addEventListener("input", (event) => {
      if (event.target.matches?.("[data-word-review-input]")) updateWordReviewMask(event.target);
    });
    ["wordGroupSizeInput", "sentenceGroupSizeInput"].forEach((id) => $(id).addEventListener("change", savePracticeSettings));
    $("googleLoginBtn").addEventListener("click", signInWithGoogle);
    $("syncCloudBtn").addEventListener("click", pushCloudState);
    $("cloudLogoutBtn").addEventListener("click", signOutCloudUser);
    $("dictionarySettingsList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-dictionary-action]");
      if (!button) return;
      const dictionaryId = button.dataset.dictionaryId || "ecdict";
      if (button.dataset.dictionaryAction === "install") installDictionary(dictionaryId);
      if (button.dataset.dictionaryAction === "test") testDictionary(dictionaryId);
      if (button.dataset.dictionaryAction === "remove") removeDictionary(dictionaryId);
    });
    $("clearTranslationCacheBtn").addEventListener("click", clearTranslationCache);
    $("openLibraryBtn").addEventListener("click", openLibraryModal);
    $("openDictionaryLibraryBtn").addEventListener("click", openDictionaryLibrary);
    $("userPhrasesBtn").addEventListener("click", openUserPhrases);
    $("closeLibraryBtn").addEventListener("click", closeLibraryModal);
    $("closeDictionaryLibraryBtn").addEventListener("click", closeDictionaryLibrary);
    $("resetDictionaryLibrarySizeBtn").addEventListener("click", resetDictionaryLibrarySize);
    $("dictionaryWordsTabBtn").addEventListener("click", () => setDictionaryLibraryType("words"));
    $("dictionarySuffixesTabBtn").addEventListener("click", () => setDictionaryLibraryType("suffixes"));
    $("dictionaryPhrasesTabBtn").addEventListener("click", () => setDictionaryLibraryType("phrases"));
    $("dictionarySpecialTabBtn").addEventListener("click", () => setDictionaryLibraryType("special"));
    $("dictionaryCategorySelect").addEventListener("change", () => {
      rememberDictionaryWordCategory();
      state.dictionaryLibraryPage = 1;
      updateDictionaryStudyButton();
      renderDictionaryLibrary();
    });
    $("dictionarySortSelect").addEventListener("change", () => {
      state.dictionaryLibraryPage = 1;
      renderDictionaryLibrary();
    });
    let dictionaryLibrarySearchTimer;
    $("dictionaryLibrarySearchInput").addEventListener("input", () => {
      clearTimeout(dictionaryLibrarySearchTimer);
      dictionaryLibrarySearchTimer = setTimeout(() => {
        state.dictionaryLibraryPage = 1;
        renderDictionaryLibrary();
      }, 250);
    });
    $("dictionaryPrevPageBtn").addEventListener("click", () => {
      goToDictionaryLibraryPage(state.dictionaryLibraryPage - 1);
    });
    $("dictionaryNextPageBtn").addEventListener("click", () => {
      goToDictionaryLibraryPage(state.dictionaryLibraryPage + 1);
    });
    $("dictionaryFirstPageBtn").addEventListener("click", () => goToDictionaryLibraryPage(1));
    $("dictionaryLastPageBtn").addEventListener("click", () => goToDictionaryLibraryPage(state.dictionaryLibraryPageCount));
    $("dictionaryPageInput").addEventListener("change", goToEnteredDictionaryPage);
    $("dictionaryPageInput").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      goToEnteredDictionaryPage();
      $("dictionaryPageInput").select();
    });
    document.querySelectorAll("[data-dictionary-study-mode]").forEach((button) => {
      button.addEventListener("click", () => openDictionaryWordStudy(button.dataset.dictionaryStudyMode));
    });
    $("dictionaryLibraryDetail").addEventListener("click", (event) => {
      const formButton = event.target.closest("[data-dictionary-form]");
      if (formButton) {
        openDictionaryFormDetail(formButton);
        return;
      }
      const pronunciationButton = event.target.closest("[data-dictionary-pronounce]");
      if (pronunciationButton) {
        pronounceDictionaryWord(pronunciationButton);
        return;
      }
      const button = event.target.closest("[data-dictionary-favorite]");
      if (button) toggleDictionaryFavorite(button);
    });
    $("dictionaryLibraryDetail").addEventListener("change", (event) => {
      if (!event.target.matches("[data-dictionary-auto-speak]")) return;
      updateDictionaryAutoSpeak(event.target, $("dictionaryLibraryDetail").dataset.word || "");
    });
    $("dictionaryLibraryList").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-dictionary-favorite]");
      if (!button) return;
      event.stopPropagation();
      const word = String(button.dataset.dictionaryWord || "").trim();
      const languageId = button.dataset.favoriteLanguage || state.learningLanguageId;
      const isSaved = loadUserWords(languageId).some((item) => dictionaryFavoriteKey(item.word) === dictionaryFavoriteKey(word));
      let entry = null;
      if (!isSaved) {
        try {
          entry = await window.langLSRWDictionary.query(word, currentDictionaryId());
        } catch {
          return;
        }
      }
      if (!button.isConnected || (!isSaved && !entry)) return;
      toggleDictionaryFavorite(button, entry);
    });
    $("dictionaryLibraryModal").addEventListener("pointerdown", (event) => {
      if (event.target === $("dictionaryLibraryModal")) closeDictionaryLibrary();
    });
    new ResizeObserver(scheduleDictionaryLibraryResize).observe($("dictionaryLibraryList"));
    $("closeUserPhrasesBtn").addEventListener("click", closeUserPhrases);
    $("resetUserPhrasesSizeBtn").addEventListener("click", resetUserPhrasesSize);
    $("userWordsTabBtn").addEventListener("click", () => setUserPhrasesView("words"));
    $("userSentencesTabBtn").addEventListener("click", () => {
      setUserPhrasesView("sentences");
      renderUserPhrases();
    });
    $("userWordsCategorySelect").addEventListener("change", () => {
      state.userWordsPage = 1;
      renderUserPhrases();
    });
    $("userWordsSortSelect").addEventListener("change", () => {
      state.userWordsPage = 1;
      renderUserPhrases();
    });
    $("userWordsSearchInput").addEventListener("input", () => {
      state.userWordsPage = 1;
      renderUserPhrases();
    });
    $("userWordsFirstPageBtn").addEventListener("click", () => goToUserWordsPage(1));
    $("userWordsPrevPageBtn").addEventListener("click", () => goToUserWordsPage(state.userWordsPage - 1));
    $("userWordsNextPageBtn").addEventListener("click", () => goToUserWordsPage(state.userWordsPage + 1));
    $("userWordsLastPageBtn").addEventListener("click", () => goToUserWordsPage(state.userWordsPageCount));
    $("userWordsPageInput").addEventListener("change", goToEnteredUserWordsPage);
    $("userWordsPageInput").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      goToEnteredUserWordsPage();
      $("userWordsPageInput").select();
    });
    $("userPhraseDetail").addEventListener("click", (event) => {
      const formButton = event.target.closest("[data-dictionary-form]");
      if (formButton) {
        openDictionaryFormDetail(formButton);
        return;
      }
      const pronunciationButton = event.target.closest("[data-dictionary-pronounce]");
      if (pronunciationButton) {
        pronounceDictionaryWord(pronunciationButton);
        return;
      }
      const button = event.target.closest("[data-dictionary-favorite]");
      if (button) toggleDictionaryFavorite(button);
    });
    $("userPhraseDetail").addEventListener("change", (event) => {
      if (!event.target.matches("[data-dictionary-auto-speak]")) return;
      updateDictionaryAutoSpeak(event.target, $("userPhraseDetail").dataset.word || "");
    });
    ["dictionaryLibraryList", "userPhrasesList"].forEach((id) => {
      $(id).addEventListener("click", (event) => {
        const status = event.target.closest("[data-word-status]");
        if (status) openWordStatusMenu(event, status.dataset.wordStatus);
      }, true);
    });
    $("wordStatusMenu").addEventListener("click", (event) => {
      const button = event.target.closest("[data-word-status-action]");
      if (!button || button.disabled) return;
      const word = $("wordStatusMenu").dataset.word;
      const action = button.dataset.wordStatusAction;
      closeWordStatusMenu();
      if (action === "master-all" || action === "undo-all") setWordManualMastery(word, WORD_REVIEW_MODES.map((mode) => mode.id), action === "master-all");
      else setWordManualMastery(word, [button.dataset.mode], action === "master");
    });
    document.addEventListener("pointerdown", (event) => {
      if (!$("wordStatusMenu").contains(event.target) && !event.target.closest("[data-word-status]")) closeWordStatusMenu();
    });
    $("userPhrasesList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-dictionary-favorite]");
      if (!button) return;
      event.stopPropagation();
      toggleDictionaryFavorite(button);
    });
    $("userSentencesList").addEventListener("click", (event) => {
      const favoriteButton = event.target.closest("[data-sentence-favorite]");
      if (favoriteButton) {
        toggleSentenceFavorite(favoriteButton);
        return;
      }
      const loadButton = event.target.closest("[data-load-sentence]");
      if (loadButton) loadFavoriteSentenceIntoPractice(loadButton.dataset.loadSentence);
    });
    document.querySelectorAll("[data-favorite-review-mode]").forEach((button) => {
      button.addEventListener("click", () => openWordReview(button.dataset.favoriteReviewMode));
    });
    document.querySelectorAll("[data-favorite-review-mode], [data-dictionary-study-mode]").forEach((button) => {
      button.addEventListener("pointerenter", () => showWordReviewHelp(button));
      button.addEventListener("pointerdown", hideWordReviewHelp);
      button.addEventListener("contextmenu", (event) => {
        const mode = button.dataset.favoriteReviewMode || button.dataset.dictionaryStudyMode;
        openWordReviewLauncherMenu(event, mode, button.dataset.favoriteReviewMode ? "favorites" : "wordList");
      });
    });
    $("wordReviewFreeBtn").addEventListener("click", () => {
      const menu = $("wordReviewLauncherMenu");
      closeWordReviewLauncherMenu();
      if (menu.dataset.source === "wordList") openDictionaryWordStudy(menu.dataset.mode, true);
      else openWordReview(menu.dataset.mode, null, true);
    });
    $("wordReviewClearBtn").addEventListener("click", () => {
      const menu = $("wordReviewLauncherMenu");
      closeWordReviewLauncherMenu();
      clearWordReviewMemory(menu.dataset.mode, menu.dataset.source);
    });
    document.addEventListener("pointerdown", (event) => {
      if (!$("wordReviewLauncherMenu").contains(event.target)) closeWordReviewLauncherMenu();
    });
    document.querySelectorAll(".word-review-modal").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        const favoriteButton = event.target.closest("[data-dictionary-favorite]");
        if (favoriteButton) {
          toggleDictionaryFavorite(favoriteButton);
          return;
        }
        const actionButton = event.target.closest("[data-word-review-action]");
        if (actionButton) {
          handleWordReviewAction(actionButton.dataset.wordReviewAction);
          return;
        }
        const choiceButton = event.target.closest("[data-word-review-choice]");
        if (choiceButton) answerRecognizeChoice(choiceButton.dataset.wordReviewChoice);
      });
      modal.addEventListener("keydown", handleWordReviewKeydown);
      modal.addEventListener("pointerdown", (event) => {
        if (event.target === modal) closeWordReview();
      });
    });
    $("userPhrasesModal").addEventListener("pointerdown", (event) => {
      if (event.target === $("userPhrasesModal")) closeUserPhrases();
    });
    new ResizeObserver(() => {
      clearTimeout(userWordsResizeTimer);
      userWordsResizeTimer = setTimeout(() => updateUserWordsPageSize(), 100);
    }).observe($("userPhrasesList"));
    new ResizeObserver(() => {
      clearTimeout(userSentencesResizeTimer);
      userSentencesResizeTimer = setTimeout(() => updateUserSentencesPageSize(), 100);
    }).observe($("userSentencesList"));
    $("userSentencesFirstPageBtn").addEventListener("click", () => goToUserSentencesPage(1));
    $("userSentencesPrevPageBtn").addEventListener("click", () => goToUserSentencesPage(state.userSentencesPage - 1));
    $("userSentencesNextPageBtn").addEventListener("click", () => goToUserSentencesPage(state.userSentencesPage + 1));
    $("userSentencesLastPageBtn").addEventListener("click", () => goToUserSentencesPage(state.userSentencesPageCount));
    $("userSentencesPageInput").addEventListener("change", goToEnteredUserSentencesPage);
    $("userSentencesPageInput").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      goToEnteredUserSentencesPage();
      $("userSentencesPageInput").select();
    });
    $("commonLibraryTabBtn").addEventListener("click", () => setLibraryView("common"));
    $("librarySettingsTabBtn").addEventListener("click", () => setLibraryView("settings"));
    $("audioLibraryTabBtn").addEventListener("click", () => setLibraryView("audio"));
    document.querySelectorAll("[data-free-translate]").forEach((button) => {
      button.addEventListener("click", translateCurrentLibraryForFree);
    });
    document.querySelectorAll("[data-subtitle-translate]").forEach((button) => {
      button.addEventListener("click", translateSubtitleFile);
    });
    document.querySelectorAll("[data-subtitle-write]").forEach((button) => {
      button.addEventListener("click", writePendingSubtitle);
    });
    document.querySelectorAll("[data-subtitle-save-as]").forEach((button) => {
      button.addEventListener("click", savePendingSubtitleAs);
    });
    $("audioLibraryList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-audio-library]");
      if (button) loadAudioLibraryMaterial(button.dataset.audioLibrary);
    });
    $("audioLibraryFileInput").addEventListener("change", async (event) => {
      await importAudioLibraryFiles(event.target.files);
      event.target.value = "";
    });
    $("libraryModal").addEventListener("pointerdown", (event) => {
      if (event.target === $("libraryModal")) closeLibraryModal();
    });
    $("librarySearchInput").addEventListener("input", filterLibrary);
    $("libraryFirstPageBtn").addEventListener("click", () => goToLibraryPage(0));
    $("libraryPreviousPageBtn").addEventListener("click", () => goToLibraryPage(state.library.page - 1));
    $("libraryNextPageBtn").addEventListener("click", () => goToLibraryPage(state.library.page + 1));
    $("libraryLastPageBtn").addEventListener("click", () => goToLibraryPage(Number.MAX_SAFE_INTEGER));
    $("libraryPageInput").addEventListener("change", goToEnteredLibraryPage);
    $("libraryPageInput").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      goToEnteredLibraryPage();
      $("libraryPageInput").select();
    });
    $("useLibraryBtn").addEventListener("click", useCommonLibrary);
    $("librarySentenceList").addEventListener("click", (event) => {
      const loadButton = event.target.closest("[data-load-library-sentence]");
      if (loadButton) loadLibrarySentenceIntoPractice(loadButton.dataset.loadLibrarySentence);
    });
    $("currentLibrarySelect").addEventListener("change", async () => {
      const value = $("currentLibrarySelect").value;
      if (value === "common") {
        if (!state.library.items.length) await loadCommonLibrary();
        useCommonLibrary();
      } else if (value === "favorites") {
        useFavoritesLibrary();
      } else if (value === "audio") {
        // Choosing 音频字幕 in the toolbar loads the default material (Audio_Example) and stays on the current page.
        await loadAudioLibraryMaterial(AUDIO_LIBRARY_DEFAULT_ID, { navigate: false });
      }
    });
    counterIndexInput.addEventListener("change", jumpToEnteredCounterIndex);
    counterIndexInput.addEventListener("pointerdown", (event) => {
      if (event.detail > 1) return;
      event.preventDefault();
      counterIndexInput.focus();
      placeCounterCaretAtEnd();
    });
    counterIndexInput.addEventListener("focus", placeCounterCaretAtEnd);
    counterIndexInput.addEventListener("dblclick", (event) => {
      event.preventDefault();
      counterIndexInput.select();
    });
    counterIndexInput.addEventListener("input", () => {
      const digitsOnly = counterIndexInput.value.replace(/\D+/g, "");
      if (digitsOnly !== counterIndexInput.value) counterIndexInput.value = digitsOnly;
      fitCounterIndexInputWidth();
    });
    counterIndexInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      jumpToEnteredCounterIndex();
      counterIndexInput.select();
    });
    $("increaseSentenceIndexBtn").addEventListener("click", () => adjustCounterIndex(1));
    $("decreaseSentenceIndexBtn").addEventListener("click", () => adjustCounterIndex(-1));
    $("analyzeGrammarBtn").addEventListener("click", () => analyzeCurrentGrammar());
    $("analyzeGrammarBtn").addEventListener("contextmenu", openGrammarContextMenu);
    $("traditionalGrammarMenuBtn").addEventListener("click", closeGrammarContextMenu);
    $("showAiPromptMenuBtn").addEventListener("click", () => {
      closeGrammarContextMenu();
      showCurrentAiPrompt();
    });
    $("showAiResponseMenuBtn").addEventListener("click", () => {
      closeGrammarContextMenu();
      showCurrentAiResponse();
    });
    $("reanalyzeGrammarBtn").addEventListener("click", () => {
      closeGrammarContextMenu();
      analyzeCurrentGrammar({ force: true });
    });
    $("copyAiTextBtn").addEventListener("click", copyAiText);
    $("closeAiTextModalBtn").addEventListener("click", closeAiTextModal);
    $("aiTextModal").addEventListener("pointerdown", (event) => {
      if (event.target === $("aiTextModal")) closeAiTextModal();
    });

    $("speakBtn").addEventListener("click", () => {
      saveSpeechSettings();
      speakCurrentSentence();
    });
    $("increaseSpeechRateBtn").addEventListener("click", () => {
      setReplayRate(currentReplayRate() + 0.1);
    });
    $("decreaseSpeechRateBtn").addEventListener("click", () => {
      setReplayRate(currentReplayRate() - 0.1);
    });

    const holdSpeakBtn = $("startSpeakingBtn");
    holdSpeakBtn.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      if (state.speaking.holdActive || state.speaking.isStarting || state.speaking.isRecognizing || state.speaking.isRecording) return;
      state.speaking.holdActive = true;
      if (holdSpeakBtn.setPointerCapture) holdSpeakBtn.setPointerCapture(event.pointerId);
      startSpeakingPractice();
    });
    const releaseHoldSpeak = (event) => {
      if (event) event.preventDefault();
      scheduleStopSpeakingPractice();
    };
    holdSpeakBtn.addEventListener("pointerup", releaseHoldSpeak);
    holdSpeakBtn.addEventListener("pointercancel", releaseHoldSpeak);
    holdSpeakBtn.addEventListener("lostpointercapture", () => {
      scheduleStopSpeakingPractice();
    });
    holdSpeakBtn.addEventListener("click", (event) => event.preventDefault());
    $("pitchCompareBtn").addEventListener("click", comparePitchWithOriginal);
    $("loopCompareBtn").addEventListener("click", toggleLoopCompare);
    $("pitchCompareChart").addEventListener("click", (event) => {
      const button = event.target.closest("[data-pitch-compare-view]");
      if (!button || !state.speaking.pitchCompareResult) return;
      state.speaking.pitchCompareView = button.dataset.pitchCompareView;
      renderPitchCompareChart();
    });
    $("previousUnifiedBtn").addEventListener("click", (event) => {
      switchSpeakingSentence(pickSentenceIndex(-1), true);
      event.currentTarget.blur();
    });
    $("nextUnifiedBtn").addEventListener("click", (event) => {
      switchSpeakingSentence(pickSentenceIndex(1), true);
      event.currentTarget.blur();
    });

    targetEl.addEventListener("mousedown", (event) => {
      const wordEl = targetWordFromEvent(event);
      if (!wordEl) return;

      if (event.button === 1) {
        event.preventDefault();
        speakTargetWord(wordEl);
        return;
      }

      if (event.button === 0 && targetEl.classList.contains("hidden-source")) {
        clearPeekedWord();
        wordEl.classList.add("peek-word");
        document.body.classList.add("hide-cursor");
      }
    });

    targetEl.addEventListener("contextmenu", (event) => {
      const wordEl = targetWordFromEvent(event);
      if (!wordEl) return;
      event.preventDefault();
      lookupTargetWord(wordEl, event);
    });

    targetEl.addEventListener("click", (event) => {
      const sentenceFavorite = event.target.closest("[data-sentence-favorite]");
      if (sentenceFavorite) {
        toggleSentenceFavorite(sentenceFavorite);
        return;
      }

      const translationAction = event.target.closest("[data-translation-action]");
      if (translationAction) {
        const action = translationAction.dataset.translationAction;
        const row = translationAction.closest(".long-text-item:not(.is-current)");
        const rowIndex = row ? Number(row.dataset.longTextIndex) : state.index;
        if (row && Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < state.sentences.length && rowIndex !== state.index) {
          state.index = rowIndex;
          resetCurrent(true);
        }
        if (action === "edit") beginTranslationEdit();
        if (action === "save") saveCurrentTranslation();
        if (action === "cancel") cancelTranslationEdit();
        if (action === "language") toggleChineseTranslation();
        return;
      }

      const grammarToggle = event.target.closest("[data-grammar-toggle]");
      if (grammarToggle) {
        const row = grammarToggle.closest(".long-text-item:not(.is-current)");
        const index = row ? Number(row.dataset.longTextIndex) : state.index;
        if (row && Number.isInteger(index) && index !== state.index) {
          state.index = index;
          resetCurrent(true);
          state.grammarVisible = true;
        } else {
          state.grammarVisible = !state.grammarVisible;
        }
        renderTarget();
        return;
      }

      // Long-text views: clicking another sentence makes it the current one (not when text is being selected).
      const longTextRow = event.target.closest(".long-text-item:not(.is-current)");
      if (longTextRow) {
        if (String(window.getSelection?.() || "").trim()) return;
        const index = Number(longTextRow.dataset.longTextIndex);
        if (Number.isInteger(index) && index >= 0 && index < state.sentences.length && index !== state.index) {
          state.index = index;
          resetCurrent(true);
        }
        return;
      }

      const levelButton = event.target.closest("[data-grammar-level]");
      if (levelButton) {
        setGrammarExpansion(levelButton.dataset.grammarLevel);
        return;
      }

      const toggleButton = event.target.closest("[data-grammar-toggle]");
      if (toggleButton) {
        const nodeId = Number(toggleButton.dataset.grammarToggle);
        if (state.grammarExpandedNodeIds.has(nodeId)) {
          state.grammarExpandedNodeIds.delete(nodeId);
        } else {
          const parsed = parseGrammarAnalysis(currentGrammar());
          const nodes = normalizeGrammarNodes(parsed?.nodes);
          collectGrammarDescendantIds(nodeId, nodes).forEach((id) => state.grammarExpandedNodeIds.delete(id));
          state.grammarExpandedNodeIds.add(nodeId);
        }
        state.grammarExpansionMode = "custom";
        renderTarget();
        return;
      }

    });

    targetEl.addEventListener("input", (event) => {
      if (event.target.id === "translationInlineInput") state.translationDraft = event.target.value;
    });

    targetEl.addEventListener("keydown", (event) => {
      if (event.target.id !== "translationInlineInput") return;
      if (event.key === "Escape") {
        event.preventDefault();
        cancelTranslationEdit();
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveCurrentTranslation();
      }
    });

    targetEl.addEventListener("auxclick", (event) => {
      const wordEl = targetWordFromEvent(event);
      if (!wordEl || event.button !== 1) return;
      event.preventDefault();
    });

    window.addEventListener("mouseup", clearPeekedWord);
    targetEl.addEventListener("mouseleave", clearPeekedWord);
    $("dictionaryLookupPopover").addEventListener("click", (event) => {
      const formButton = event.target.closest("[data-dictionary-form]");
      if (formButton) {
        openDictionaryFormDetail(formButton);
        return;
      }
      const pronunciationButton = event.target.closest("[data-dictionary-pronounce]");
      if (pronunciationButton) {
        pronounceDictionaryWord(pronunciationButton);
        return;
      }
      const favoriteButton = event.target.closest("[data-dictionary-favorite]");
      if (favoriteButton) {
        toggleDictionaryFavorite(favoriteButton);
        return;
      }
      // 展开全部 keeps the popover at its current height and lets the extra definitions scroll inside it;
      // 收起 folds them again and restores the natural height.
      const moreButton = event.target.closest("[data-dictionary-more]");
      if (moreButton) {
        toggleDictionaryDefinitions(moreButton, $("dictionaryLookupPopover"), () => positionDictionaryLookup());
        return;
      }
      if (event.target.closest("[data-dictionary-close]")) closeDictionaryLookup();
    });
    document.addEventListener("click", async (event) => {
      const popover = event.target.closest(".english-lookup-popover");
      if (!popover) return;
      const formButton = event.target.closest("[data-dictionary-form]");
      if (formButton) {
        lookupEnglishReference(String(formButton.dataset.dictionaryForm || "").trim(), popover.lookupAnchor, { popover });
        return;
      }
      const pronunciationButton = event.target.closest("[data-dictionary-pronounce]");
      if (pronunciationButton) {
        speakText(String(pronunciationButton.dataset.dictionaryPronounce || "").trim(), englishReferenceSpeechOptions());
        return;
      }
      const favoriteButton = event.target.closest("[data-dictionary-favorite]");
      if (favoriteButton) {
        toggleDictionaryFavorite(favoriteButton);
        return;
      }
      const moreButton = event.target.closest("[data-dictionary-more]");
      if (moreButton) {
        toggleDictionaryDefinitions(moreButton, popover, () => placeLookupPopover(popover, popover.lookupAnchor));
        return;
      }
      if (event.target.closest("[data-dictionary-close]")) closeEnglishLookup(popover);
    });
    // English learning: right-click an English word in a word detail's definitions (词库, 收藏, lookup popover)
    // to look it up in a second popover, so the lookup popover or detail it came from stays open.
    document.addEventListener("contextmenu", (event) => {
      if (currentLearningLanguage().id !== "en") return;
      const container = event.target.closest(".dictionary-meanings, .dictionary-definitions");
      if (!container?.closest("#dictionaryLookupPopover, #userPhraseDetail, #dictionaryLibraryDetail")) return;
      const hit = englishWordAtPoint(event, container);
      if (!hit?.word) return;
      event.preventDefault();
      lookupEnglishReference(hit.word, { clientX: event.clientX, avoidRect: hit.rect });
    });
    document.addEventListener("contextmenu", (event) => {
      const source = englishReferenceSource(event.target);
      if (!source) return;
      const hit = englishWordAtPoint(event, source);
      if (!hit?.word) return;
      event.preventDefault();
      lookupEnglishReference(hit.word, { clientX: event.clientX, avoidRect: hit.rect }, { fromPopover: event.target.closest(".english-lookup-popover") });
    });
    $("dictionaryLookupPopover").addEventListener("change", (event) => {
      if (!event.target.matches("[data-dictionary-auto-speak]")) return;
      updateDictionaryAutoSpeak(event.target, $("dictionaryLookupPopover").dataset.word || "");
    });
    document.addEventListener("pointerdown", (event) => {
      // Clicking a popover closes the ones stacked above it; clicking outside every English popover closes them all.
      if (englishLookupTop()) {
        const clicked = event.target.closest(".english-lookup-popover");
        const index = clicked ? englishLookupStack.indexOf(clicked) : -1;
        if (index < 0) closeEnglishLookup();
        else if (englishLookupStack[index + 1]) closeEnglishLookup(englishLookupStack[index + 1]);
      }
      if ($("dictionaryLookupPopover").hidden) return;
      if (event.target.closest("#dictionaryLookupPopover, .english-lookup-popover") || event.target.closest(".target-word")) return;
      closeDictionaryLookup();
    });

    $("accentSelect").addEventListener("change", () => {
      stopSpeech();
      if (usingOriginalVoice()) {
        updateVoiceSelectForAccent();
        return;
      }
      state.speechSettings[voiceSettingKey()] = "";
      populateVoices();
      updateVoiceSelectForAccent();
      saveSpeechSettings();
    });

    $("modeSelect").addEventListener("change", () => {
      stopFullTextReading();
      updateSentenceNavigationTitles();
    });
    updateSentenceNavigationTitles();
    $("voiceSelect").addEventListener("change", saveSpeechSettings);
    $("autoSpeakToggle").addEventListener("change", saveSpeechSettings);
    $("displayModeSelect").addEventListener("change", () => {
      saveSpeechSettings();
      renderTarget();
    });
    $("speakWordToggle").addEventListener("change", saveSpeechSettings);
    $("showSourceToggle").addEventListener("change", () => {
      saveSpeechSettings();
      renderTarget();
    });
    $("showTranslationToggle").addEventListener("change", () => {
      saveSpeechSettings();
      renderTarget();
    });

    $("shortcutList").addEventListener("keydown", (event) => {
      const input = event.target.closest("[data-shortcut]");
      if (!input) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      if (event.key === "Escape") {
        input.blur();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        state.shortcuts[input.dataset.shortcut] = "";
        input.value = "";
        saveShortcuts();
        return;
      }

      const shortcut = normalizeShortcutEvent(event);
      if (!shortcut) return;
      shortcutActions.forEach((action) => {
        if (action.id !== input.dataset.shortcut && state.shortcuts[action.id] === shortcut) {
          state.shortcuts[action.id] = "";
        }
      });
      state.shortcuts[input.dataset.shortcut] = shortcut;
      saveShortcuts();
      renderShortcutSettings();
    }, true);

    $("shortcutList").addEventListener("keyup", (event) => {
      const input = event.target.closest("[data-shortcut]");
      if (!input) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }, true);

    $("resetShortcutsBtn").addEventListener("click", () => {
      state.shortcuts = { ...defaultShortcuts };
      saveShortcuts();
      renderShortcutSettings();
    });

    $("clearShortcutFocusBtn").addEventListener("click", () => {
      const active = document.activeElement;
      if (active && active.blur) active.blur();
    });

    $("themeToggleBtn").addEventListener("click", toggleTheme);
    $("openSettingsBtn").addEventListener("click", openSettings);
    $("closeSettingsBtn").addEventListener("click", closeSettings);
    document.querySelectorAll("[data-settings-tab]").forEach((button) => {
      button.addEventListener("click", () => selectSettingsTab(button.dataset.settingsTab));
    });
    $("settingsModal").addEventListener("pointerdown", (event) => {
      if (event.target === $("settingsModal")) closeSettings();
    });
    document.querySelector(".settings-panels").addEventListener("pointerover", (event) => {
      const control = settingsControlAt(event.target);
      if (control) renderSettingsDetail(control);
    });
    document.querySelector(".settings-panels").addEventListener("focusin", (event) => {
      const control = settingsControlAt(event.target);
      if (control) renderSettingsDetail(control);
    });
    $("englishFontSelect").addEventListener("change", saveFontSettings);
    $("chineseFontSelect").addEventListener("change", saveFontSettings);
    $("resetFontSettingsBtn").addEventListener("click", resetFontSettings);
    $("grammarColorGrid").addEventListener("pointerdown", (event) => {
      const row = event.target.closest("[data-grammar-color-row]");
      if (row) setActiveGrammarColorRole(row.dataset.grammarColorRow);
    });
    $("grammarColorGrid").addEventListener("input", (event) => {
      const colorInput = event.target.closest("[data-grammar-color]");
      if (colorInput) {
        updateGrammarColor(colorInput.dataset.grammarColor, colorInput.value);
        return;
      }
      const hexInput = event.target.closest("[data-grammar-hex]");
      if (!hexInput) return;
      const normalized = normalizeHexInput(hexInput.value);
      hexInput.classList.toggle("is-invalid", hexInput.value.length >= 7 && !normalized);
      if (normalized) updateGrammarColor(hexInput.dataset.grammarHex, normalized);
    });
    $("grammarColorGrid").addEventListener("change", (event) => {
      const input = event.target.closest("[data-grammar-hex]");
      if (!input) return;
      if (!updateGrammarColor(input.dataset.grammarHex, input.value)) {
        input.value = state.grammarColors[input.dataset.grammarHex].toUpperCase();
        input.classList.remove("is-invalid");
      }
    });
    $("grammarCommonPalette").addEventListener("click", (event) => {
      const button = event.target.closest("[data-grammar-preset]");
      if (button) updateGrammarColor(activeGrammarColorRole, button.dataset.grammarPreset);
    });
    $("resetGrammarColorsBtn").addEventListener("click", resetGrammarColors);

    document.querySelectorAll(".page-tab").forEach((tab) => {
      tab.addEventListener("click", () => setActivePage(tab.dataset.pageTarget));
    });

    document.querySelectorAll("[data-language-id]").forEach((button) => {
      button.addEventListener("click", () => {
        setLearningLanguage(button.dataset.languageId || "en");
      });
    });

    $("exportDataBtn").addEventListener("click", exportData);

    $("importDataBtn").addEventListener("click", () => {
      $("dataImportInput").click();
    });

    $("loginImportDataBtn").addEventListener("click", () => {
      $("dataImportInput").click();
    });

    $("resetSettingsBtn").addEventListener("click", resetGlobalSettings);

    $("clearUserBtn").addEventListener("click", clearCurrentUser);

    $("dataImportInput").addEventListener("change", async (event) => {
      const [file] = event.target.files;
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        await restoreBackupData(data);
      } catch {
        alert("导入失败，请确认选择的是导出的 JSON 文件。");
      } finally {
        event.target.value = "";
      }
    });

    $("loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      loginAs($("usernameInput").value);
    });

    $("loginUsers").addEventListener("click", (event) => {
      const button = event.target.closest("[data-user]");
      if (!button) return;
      loginAs(button.dataset.user);
    });

    $("switchUserBtn").addEventListener("click", async () => {
      if (state.cloudUser) {
        await signOutCloudUser();
        return;
      }
      showLogin();
    });

    document.querySelectorAll(".font-menu, .user-menu").forEach((menu) => {
      menu.addEventListener("toggle", () => {
        if (menu.open) {
          closeTopMenus(menu);
          if (state.speaking.holdActive) scheduleStopSpeakingPractice();
          clearPeekedWord();
        }
      });
    });

    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".font-menu, .user-menu")) {
        closeTopMenus();
      }
      if (!event.target.closest(".grammar-context-menu, #analyzeGrammarBtn")) {
        closeGrammarContextMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!document.querySelector(".word-review-modal:not([hidden])")) {
        handleDictionaryLibraryKeys(event);
        handleUserWordsKeys(event);
      }
      if (event.key === "Escape") {
        closeWordStatusMenu();
        closeWordReviewLauncherMenu();
        closeLibraryModal();
        closeAiTextModal();
        closeTopMenus();
        closeGrammarContextMenu();
      }
    });

    window.addEventListener("resize", closeGrammarContextMenu);
    window.addEventListener("resize", closeWordReviewLauncherMenu);
    window.addEventListener("resize", syncTypingShellHeight);
    window.addEventListener("scroll", closeGrammarContextMenu, true);
    window.addEventListener("scroll", closeWordReviewLauncherMenu, true);
    window.addEventListener("scroll", closeWordStatusMenu, true);
    window.addEventListener("resize", closeWordStatusMenu);
    document.addEventListener("pointerover", handleControlTooltipOver);
    document.addEventListener("pointermove", (event) => {
      if (controlTooltipTarget && $("controlTooltip").hidden) controlTooltipPoint = { x: event.clientX, y: event.clientY };
    });
    document.addEventListener("pointerout", (event) => {
      if (controlTooltipTarget && !controlTooltipTarget.contains(event.relatedTarget)) hideControlTooltip();
    });
    document.addEventListener("pointerdown", hideControlTooltip, true);
    document.addEventListener("keydown", hideControlTooltip, true);
    window.addEventListener("scroll", hideControlTooltip, true);
    window.addEventListener("blur", hideControlTooltip);

    let dragDepth = 0;

    window.addEventListener("dragenter", (event) => {
      if (state.activePage !== "listenPage") return;
      event.preventDefault();
      dragDepth += 1;
      $("dropOverlay").classList.add("active");
    });

    window.addEventListener("dragover", (event) => {
      if (state.activePage !== "listenPage") return;
      event.preventDefault();
    });

    window.addEventListener("dragleave", (event) => {
      if (state.activePage !== "listenPage") return;
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) $("dropOverlay").classList.remove("active");
    });

    window.addEventListener("drop", async (event) => {
      if (state.activePage !== "listenPage") return;
      event.preventDefault();
      dragDepth = 0;
      $("dropOverlay").classList.remove("active");
      await importSentenceFiles(event.dataTransfer ? event.dataTransfer.files : []);
    });

    window.addEventListener("keydown", handleGlobalShortcut, { capture: true });
    window.addEventListener("keyup", handleGlobalShortcutKeyup, { capture: true });

    applyTheme(state.theme, { persist: false });
    applyFontSettings(state.fontSettings, { persist: false });
    applyGrammarColors(state.grammarColors, { persist: false });
    setActivePage(state.activePage);
    setLearningLanguage(state.learningLanguageId, { persist: false });
    loadSpeechSettings();
    loadAiSettings();
    refreshDictionaryStatus();
    renderShortcutSettings();
    updateSpeechRateIndicator();
    populateVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    if (state.currentUser) {
      $("userBadge").textContent = `用户：${state.currentUser}`;
      $("loginScreen").classList.remove("active");
    } else {
      $("userBadge").textContent = "未登录";
      showLogin();
    }

    render();
    // Reveal the page once the identity's settings are applied (index.html hides it while booting); the timeout
    // keeps the page usable even if the personal-data store is slow or unavailable.
    const revealPage = () => document.documentElement.classList.remove("is-booting");
    setTimeout(revealPage, 1500);
    (async () => {
      try {
        await openUserData();
      } finally {
        revealPage();
      }
      await tryLoadDefaultLibrary();
      render();
      initializeCloudAuth();
    })();
