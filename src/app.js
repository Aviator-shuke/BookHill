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
      speakCurrentWord: "Alt+`",
      peekCurrentWord: "Alt+1",
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
      { id: "black", label: "黑夜" },
      { id: "gray", label: "深灰" },
      { id: "light", label: "白天" },
      { id: "eye", label: "护眼" }
    ];

    const shortcutActions = [
      { id: "speakSentence", label: "朗读当前句" },
      { id: "toggleSource", label: "显示/隐藏原文" },
      { id: "toggleTranslation", label: "显示/隐藏翻译" },
      { id: "nextSentence", label: "下一句" },
      { id: "previousSentence", label: "上一句" },
      { id: "speakCurrentWord", label: "朗读当前词" },
      { id: "peekCurrentWord", label: "按住显示当前词" },
      { id: "stopSpeech", label: "停止朗读" },
      { id: "resetSentence", label: "重写当前句" },
      { id: "finishSentence", label: "完成本句" },
      { id: "holdSpeaking", label: "按住说话" }
    ];

    function loadShortcutSettings() {
      const saved = JSON.parse(localStorage.getItem("langLSRWShortcuts") || "null") || {};
      if (saved.peekCurrentWord === "[" && saved.speakCurrentWord === "]") {
        saved.peekCurrentWord = "]";
        saved.speakCurrentWord = "[";
        localStorage.setItem("langLSRWShortcuts", JSON.stringify(saved));
      }
      if (saved.peekCurrentWord === "]" && saved.speakCurrentWord === "[") {
        saved.peekCurrentWord = "Alt+1";
        saved.speakCurrentWord = "Alt+`";
        localStorage.setItem("langLSRWShortcuts", JSON.stringify(saved));
      }
      return { ...defaultShortcuts, ...saved };
    }

    function loadActiveLearningPage() {
      const savedPage = localStorage.getItem("activeLearningPage");
      const migrated = localStorage.getItem("learningPageMigratedToListen");
      if (savedPage === "speakPage") {
        localStorage.setItem("activeLearningPage", "listenPage");
        return "listenPage";
      }
      if ((!savedPage || savedPage === "writePage") && !migrated) {
        localStorage.setItem("activeLearningPage", "listenPage");
        localStorage.setItem("learningPageMigratedToListen", "1");
        return "listenPage";
      }
      return savedPage || "listenPage";
    }

    const state = {
      sentences: normalizeSentenceList(fallbackSentences),
      index: 0,
      events: [],
      startedAt: 0,
      finished: false,
      currentUser: localStorage.getItem("langLSRWCurrentUser") || "",
      history: [],
      voices: [],
      lastSpokenWordKey: "",
      replaySlowStep: 0,
      shortcuts: loadShortcutSettings(),
      speechSettings: JSON.parse(localStorage.getItem("langLSRWSpeechSettings") || "{}"),
      aiSettings: JSON.parse(localStorage.getItem("langLSRWAISettings") || "{}"),
      theme: localStorage.getItem("langLSRWTheme") || "black",
      activePage: loadActiveLearningPage(),
      grammarLoading: false,
      grammarVisible: false,
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
        metrics: null
      }
    };

    const $ = (id) => document.getElementById(id);
    const targetEl = $("target");
    const typingBox = $("typingBox");
    const typedPreviewEl = $("typedPreview");
    const counterEl = $("counter");
    const errorsEl = $("errors");
    const historyEl = $("history");

    function normalizeUsername(name) {
      return name.trim().replace(/\s+/g, " ").slice(0, 24);
    }

    function userStorageKey(name = state.currentUser) {
      return `langLSRWHistory:${name}`;
    }

    function getKnownUsers() {
      return JSON.parse(localStorage.getItem("langLSRWKnownUsers") || "[]");
    }

    function saveKnownUser(name) {
      const users = getKnownUsers().filter((user) => user !== name);
      users.unshift(name);
      localStorage.setItem("langLSRWKnownUsers", JSON.stringify(users.slice(0, 8)));
    }

    function loadUserHistory() {
      if (!state.currentUser) {
        state.history = [];
        return;
      }
      state.history = JSON.parse(localStorage.getItem(userStorageKey()) || "[]");
    }

    function saveUserHistory() {
      if (!state.currentUser) return;
      localStorage.setItem(userStorageKey(), JSON.stringify(state.history));
    }

    function normalizeSentenceItem(item) {
      if (item && typeof item === "object") {
        return {
          text: String(item.text || item.sentence || item.english || "").trim(),
          translation: String(item.translation || item.zh || item.cn || "").trim(),
          grammar: String(item.grammar || item.grammarAnalysis || "").trim(),
          grammarRaw: String(item.grammarRaw || item.aiGrammarResponse || item.grammar || item.grammarAnalysis || "").trim()
        };
      }
      return { text: String(item || "").trim(), translation: "", grammar: "", grammarRaw: "" };
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

    const grammarCacheStorageKey = "langLSRWGrammarCache";

    function loadGrammarCache() {
      try {
        const cached = JSON.parse(localStorage.getItem(grammarCacheStorageKey) || "[]");
        return Array.isArray(cached) ? cached : [];
      } catch {
        return [];
      }
    }

    function grammarCacheSentenceKey(sentence) {
      return String(sentence || "")
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim();
    }

    function findCachedGrammar(sentence) {
      const key = grammarCacheSentenceKey(sentence);
      const record = loadGrammarCache().find((item) => (
        item && grammarCacheSentenceKey(item.key || item.sentence) === key
      ));
      if (!record || !String(record.grammar || "").trim()) return null;
      return {
        grammar: String(record.grammar).trim(),
        grammarRaw: String(record.grammarRaw || record.grammar).trim()
      };
    }

    function saveGrammarCache(sentence, grammar, grammarRaw = grammar) {
      const key = grammarCacheSentenceKey(sentence);
      const records = loadGrammarCache().filter((item) => (
        item && grammarCacheSentenceKey(item.key || item.sentence) !== key
      ));
      records.unshift({
        key,
        sentence,
        grammar,
        grammarRaw,
        savedAt: new Date().toISOString()
      });
      let retained = records.slice(0, 500);
      while (retained.length) {
        try {
          localStorage.setItem(grammarCacheStorageKey, JSON.stringify(retained));
          return;
        } catch {
          retained = retained.slice(0, Math.floor(retained.length / 2));
        }
      }
    }

    function sentenceWithCachedGrammar(item) {
      const normalized = normalizeSentenceItem(item);
      if (normalized.grammar) {
        if (!findCachedGrammar(normalized.text)) {
          saveGrammarCache(normalized.text, normalized.grammar, normalized.grammarRaw || normalized.grammar);
        }
        return normalized;
      }
      const cached = findCachedGrammar(normalized.text);
      if (!cached) return normalized;
      normalized.grammar = cached.grammar;
      normalized.grammarRaw = cached.grammarRaw;
      return normalized;
    }

    function normalizeSentenceList(items) {
      return (items || [])
        .map(normalizeSentenceItem)
        .filter((item) => item.text);
    }

    function collectBackupData() {
      const users = getKnownUsers();
      const histories = {};
      users.forEach((user) => {
        histories[user] = JSON.parse(localStorage.getItem(userStorageKey(user)) || "[]");
      });
      if (state.currentUser && !users.includes(state.currentUser)) {
        histories[state.currentUser] = state.history;
      }

      return {
        app: "langLSRW",
        version: 1,
        exportedAt: new Date().toISOString(),
        currentUser: state.currentUser,
        knownUsers: state.currentUser && !users.includes(state.currentUser)
          ? [state.currentUser, ...users]
          : users,
        currentIndex: state.index,
        sentences: normalizeSentenceList(state.sentences).map(sentenceWithCachedGrammar),
        histories
      };
    }

    function downloadJson(filename, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function exportData() {
      const date = new Date().toISOString().slice(0, 10);
      const username = state.currentUser || "guest";
      const safeName = username.replace(/[^a-z0-9_-]+/gi, "_");
      downloadJson(`langlsrw-${safeName}-${date}.json`, collectBackupData());
    }

    function restoreBackupData(data) {
      if (!data || !Array.isArray(data.sentences) || !data.histories || typeof data.histories !== "object") {
        alert("这个 JSON 文件不是有效的练习备份。");
        return;
      }

      const users = Array.isArray(data.knownUsers)
        ? data.knownUsers.map(normalizeUsername).filter(Boolean)
        : Object.keys(data.histories).map(normalizeUsername).filter(Boolean);
      const uniqueUsers = [...new Set(users)].slice(0, 8);
      const currentUser = normalizeUsername(data.currentUser || uniqueUsers[0] || state.currentUser);

      uniqueUsers.forEach((user) => {
        const history = Array.isArray(data.histories[user]) ? data.histories[user] : [];
        localStorage.setItem(userStorageKey(user), JSON.stringify(history.slice(0, 500)));
      });

      localStorage.setItem("langLSRWKnownUsers", JSON.stringify(uniqueUsers));
      if (currentUser) {
        state.currentUser = currentUser;
        localStorage.setItem("langLSRWCurrentUser", currentUser);
      }

      state.sentences = normalizeSentenceList(data.sentences);
      if (!state.sentences.length) state.sentences = normalizeSentenceList(fallbackSentences);
      state.sentences.forEach((item) => {
        if (item.grammar) saveGrammarCache(item.text, item.grammar, item.grammarRaw || item.grammar);
      });
      state.index = Number.isInteger(data.currentIndex)
        ? Math.min(Math.max(0, data.currentIndex), state.sentences.length - 1)
        : 0;
      $("sourceStatus").textContent = `当前句库：备份数据（${state.sentences.length}句）`;
      loadUserHistory();
      $("userBadge").textContent = state.currentUser ? `用户：${state.currentUser}` : "未登录";
      resetCurrent();
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
      setTimeout(() => $("usernameInput").focus(), 0);
    }

    function hideLogin() {
      $("loginScreen").classList.remove("active");
    }

    function loginAs(name) {
      const username = normalizeUsername(name);
      if (!username) return;
      const isNewUser = !getKnownUsers().includes(username);
      if (isNewUser) resetSettingsToDefault();
      state.currentUser = username;
      localStorage.setItem("langLSRWCurrentUser", username);
      saveKnownUser(username);
      loadUserHistory();
      resetCurrent();
      $("userBadge").textContent = `用户：${username}`;
      hideLogin();
    }

    function clearCurrentUser() {
      const username = state.currentUser;
      if (!username) {
        showLogin();
        return;
      }
      const confirmed = confirm(`确定清除用户「${username}」吗？这个用户的本机练习记录会被删除。`);
      if (!confirmed) return;

      localStorage.removeItem(userStorageKey(username));
      const users = getKnownUsers().filter((user) => user !== username);
      localStorage.setItem("langLSRWKnownUsers", JSON.stringify(users));
      localStorage.removeItem("langLSRWCurrentUser");
      state.currentUser = "";
      state.history = [];
      resetSettingsToDefault();
      $("userBadge").textContent = "未登录";
      renderHistory();
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
        if (match && match[1].trim() && match[2].trim()) {
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
      state.sentences = sentences;
      state.index = 0;
      $("sourceStatus").textContent = sentenceSourceLabel(file.name, sentences);
      resetCurrent(true);
      closeTopMenus();
      return true;
    }

    async function tryLoadDefaultFile() {
      try {
        const response = await fetch("assets/materials/default-bilingual.lrc", { cache: "no-store" });
        if (!response.ok) return;
        const text = await response.text();
        const sentences = parseSentences(text, "assets/materials/default-bilingual.lrc");
        if (sentences.length) {
          state.sentences = sentences;
          $("sourceStatus").textContent = sentenceSourceLabel("assets/materials/default-bilingual.lrc", sentences);
          render();
        }
      } catch {
        // Direct file opening may block fetch; import and paste still work.
      }
    }

    function currentSentence() {
      return sentenceText(state.sentences[state.index]);
    }

    function currentTranslation() {
      return sentenceTranslation(state.sentences[state.index]);
    }

    function saveCurrentTranslation() {
      const item = normalizeSentenceItem(state.sentences[state.index]);
      item.translation = $("translationInput").value.trim();
      state.sentences[state.index] = item;
      renderTarget();
      $("sourceStatus").textContent = `当前句库：已更新当前句翻译（${state.sentences.length}句）`;
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

    function showCurrentAiResponse() {
      const raw = currentGrammarRaw();
      if (!raw) {
        alert("当前句还没有 Ai 语法分析回复。");
        return;
      }
      openAiTextModal("Ai回复", raw);
    }

    function showCurrentAiPrompt() {
      const sentence = currentSentence();
      if (!sentence) {
        alert("当前没有可分析的句子。");
        return;
      }
      openAiTextModal("Ai询问", buildGrammarPrompt(sentence, currentTranslation()));
    }

    function renderGrammarAnalysis() {
      if (state.grammarLoading) {
        return '<div class="grammar-panel is-loading">正在分析语法...</div>';
      }
      if (!state.grammarVisible) return "";
      const grammar = currentGrammar();
      if (!grammar) return "";
      const parsed = parseGrammarAnalysis(grammar);
      if (!parsed) return `<div class="grammar-panel">${escapeHtml(grammar).replace(/\n/g, "<br>")}</div>`;
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const nodeHtml = renderGrammarNodes(nodes);
      const explanation = Array.isArray(parsed.explanation) ? parsed.explanation : [];
      const explanationHtml = explanation.length
        ? `<ul class="grammar-points">${explanation.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`
        : "";
      const pattern = String(parsed.pattern || "").trim();
      const patternHtml = pattern
        ? `<div class="grammar-pattern"><span>句子成分</span><span aria-hidden="true">·</span><strong>${escapeHtml(pattern)}</strong></div>`
        : '<div class="grammar-pattern"><span>句子成分</span></div>';
      return `
        <div class="grammar-panel grammar-visual">
          ${patternHtml}
          <div class="grammar-nodes">${nodeHtml}</div>
          ${explanationHtml}
        </div>
      `;
    }

    function renderGrammarNodes(nodes) {
      if (!Array.isArray(nodes) || !nodes.length) return "";
      const normalized = nodes
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
      const byParent = new Map();
      normalized.forEach((node) => {
        const parent = normalized.some((item) => item.id === node.parent) ? node.parent : 0;
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push(node);
      });
      byParent.forEach((items) => items.sort((a, b) => a.order - b.order));
      const renderNode = (node) => {
        const roleType = grammarRoleType(node.role);
        const label = [node.role, node.type].filter(Boolean).join(" · ");
        const children = byParent.get(node.id) || [];
        return `
          <div class="grammar-node grammar-${roleType}">
            <div class="grammar-node-main">
              <span class="grammar-role">${escapeHtml(label)}</span>
              <span class="grammar-text">${escapeHtml(node.text)}</span>
              ${node.note ? `<span class="grammar-note">${escapeHtml(node.note)}</span>` : ""}
            </div>
            ${children.length ? `<div class="grammar-node-children">${children.map(renderNode).join("")}</div>` : ""}
          </div>
        `;
      };
      return (byParent.get(0) || normalized.filter((node) => node.parent === 0)).map(renderNode).join("");
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

    function grammarRoleType(role) {
      const text = String(role || "");
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

    async function analyzeCurrentGrammar() {
      if (state.grammarLoading) return;
      const sentence = currentSentence();
      if (!sentence) return;
      if (currentGrammar()) {
        state.grammarVisible = true;
        renderTarget();
        $("sourceStatus").textContent = "当前句已有 Ai 语法分析，已使用缓存。";
        return;
      }
      const settings = mergedAiSettings();
      if (!settings.apiKey) {
        alert("请先在“源文件”里填写并保存 API Key。");
        return;
      }
      state.grammarLoading = true;
      state.grammarVisible = true;
      renderTarget();
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
        const item = normalizeSentenceItem(state.sentences[state.index]);
        item.grammar = content;
        item.grammarRaw = content;
        state.sentences[state.index] = item;
        saveGrammarCache(sentence, content, content);
        $("sourceStatus").textContent = "当前句语法分析已保存。";
      } catch (error) {
        state.grammarVisible = false;
        alert(`语法分析失败：${error.message || error}`);
      } finally {
        state.grammarLoading = false;
        $("analyzeGrammarBtn").disabled = false;
        $("analyzeGrammarBtn").textContent = "Ai语法分析";
        renderTarget();
      }
    }

    function sentenceSourceLabel(name, sentences) {
      const translated = normalizeSentenceList(sentences).filter((item) => item.translation).length;
      return `当前句库：${name}（${sentences.length}句，${translated}句有翻译）`;
    }

    function saveSpeechSettings() {
      const settings = {
        accent: $("accentSelect").value,
        voiceURI: $("voiceSelect").value,
        autoSpeak: $("autoSpeakToggle").checked,
        speakWord: $("speakWordToggle").checked,
        showSource: $("showSourceToggle").checked,
        showTranslation: $("showTranslationToggle").checked
      };
      state.speechSettings = settings;
      localStorage.setItem("langLSRWSpeechSettings", JSON.stringify(settings));
    }

    function saveShortcuts() {
      localStorage.setItem("langLSRWShortcuts", JSON.stringify(state.shortcuts));
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
      localStorage.setItem("langLSRWAISettings", JSON.stringify(settings));
      $("sourceStatus").textContent = "AI 设置已保存。";
    }

    function applyTheme(theme) {
      const themeMap = { dark: "black" };
      const nextTheme = themeMap[theme] || theme;
      state.theme = themes.some((item) => item.id === nextTheme) ? nextTheme : "black";
      document.body.dataset.theme = state.theme;
      const current = themes.find((item) => item.id === state.theme);
      $("themeToggleBtn").textContent = current.label;
      $("themeToggleBtn").title = `背景：${current.label}`;
      localStorage.setItem("langLSRWTheme", state.theme);
    }

    function toggleTheme() {
      const currentIndex = Math.max(0, themes.findIndex((item) => item.id === state.theme));
      applyTheme(themes[(currentIndex + 1) % themes.length].id);
    }

    function resetSettingsToDefault() {
      localStorage.removeItem("langLSRWTheme");
      localStorage.removeItem("langLSRWShortcuts");
      localStorage.removeItem("langLSRWSpeechSettings");
      state.shortcuts = { ...defaultShortcuts };
      state.speechSettings = {};
      applyTheme("black");
      loadSpeechSettings();
      populateVoices();
      renderShortcutSettings();
      updateSpeechRateIndicator();
    }

    function resetGlobalSettings() {
      const confirmed = confirm("确定恢复默认设置吗？主题、快捷键、朗读设置会重置，用户记录和句库不会删除。");
      if (!confirmed) return;

      resetSettingsToDefault();
      closeTopMenus();
    }

    function setActivePage(pageId) {
      const page = document.getElementById(pageId);
      if (!page) return;
      state.activePage = pageId;
      document.body.dataset.activePage = pageId;
      localStorage.setItem("activeLearningPage", pageId);
      if (pageId !== "listenPage") {
        closeTopMenus();
        dragDepth = 0;
        $("dropOverlay").classList.remove("active");
      }
      if (pageId !== "listenPage" && (state.speaking.isRecognizing || state.speaking.isRecording)) stopSpeakingPractice();
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

    function renderShortcutSettings() {
      $("shortcutList").innerHTML = shortcutActions.map((action) => `
        <label class="shortcut-row">
          <span>${escapeHtml(action.label)}</span>
          <input class="shortcut-input" type="text" readonly data-shortcut="${escapeHtml(action.id)}" value="${escapeHtml(state.shortcuts[action.id] || "")}" placeholder="未设置">
        </label>
      `).join("");
    }

    function runShortcutAction(actionId) {
      const actions = {
        toggleSource: toggleSourceVisibility,
        toggleTranslation: toggleTranslationVisibility,
        nextSentence: goNextSentence,
        previousSentence: goPreviousSentence,
        resetSentence: () => resetCurrent(false),
        speakSentence: speakCurrentSentence,
        stopSpeech,
        peekCurrentWord: peekCurrentWord,
        speakCurrentWord: speakCurrentWord,
        finishSentence: finishCurrent
      };
      if (actions[actionId]) actions[actionId]();
    }

    function runSpeakingShortcut(actionId) {
      const actions = {
        previousSentence: () => switchSpeakingSentence(state.index - 1),
        nextSentence: () => switchSpeakingSentence(state.index + 1),
        speakModel: () => speakText(currentSentence()),
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

    function handleGlobalShortcut(event) {
      if (event.isComposing) return;
      if (event.target && event.target.closest && event.target.closest("[data-shortcut]")) return;
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
      $("accentSelect").value = state.speechSettings.accent || "en-GB";
      $("autoSpeakToggle").checked = state.speechSettings.autoSpeak !== false;
      $("speakWordToggle").checked = state.speechSettings.speakWord !== false;
      $("showSourceToggle").checked = state.speechSettings.showSource !== false;
      $("showTranslationToggle").checked = state.speechSettings.showTranslation !== false;
    }

    function populateVoices() {
      if (!("speechSynthesis" in window)) return;
      state.voices = window.speechSynthesis.getVoices();
      const accent = $("accentSelect").value;
      const matchingVoices = state.voices.filter((voice) => voice.lang && voice.lang.toLowerCase().startsWith(accent.toLowerCase()));
      const voices = matchingVoices.length ? matchingVoices : state.voices.filter((voice) => /^en-/i.test(voice.lang || ""));
      $("voiceSelect").innerHTML = '<option value="">自动选择</option>' + voices.map((voice) => (
        `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})</option>`
      )).join("");
      if (state.speechSettings.voiceURI && voices.some((voice) => voice.voiceURI === state.speechSettings.voiceURI)) {
        $("voiceSelect").value = state.speechSettings.voiceURI;
      }
    }

    function getSpeechText() {
      return currentSentence();
    }

    function chooseVoice() {
      const voiceURI = $("voiceSelect").value;
      const accent = $("accentSelect").value;
      if (voiceURI) return state.voices.find((voice) => voice.voiceURI === voiceURI) || null;
      return state.voices.find((voice) => voice.lang === accent)
        || state.voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith(accent.toLowerCase()))
        || state.voices.find((voice) => /^en-/i.test(voice.lang || ""))
        || null;
    }

    function speakText(text, options = {}) {
      if (!("speechSynthesis" in window)) {
        alert("当前浏览器不支持朗读功能。");
        return;
      }
      if (!text) return;
      if (options.interrupt !== false) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = $("accentSelect").value;
      utterance.rate = options.rate || 1;
      utterance.pitch = 1;
      const voice = chooseVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }

    function speakCurrentSentence() {
      speakText(getSpeechText());
    }

    function currentReplayRate() {
      return state.replaySlowStep
        ? Math.max(0.45, 1 - state.replaySlowStep * 0.12)
        : 1;
    }

    function updateSpeechRateIndicator() {
      const rate = currentReplayRate();
      const label = state.replaySlowStep ? `慢速 ${state.replaySlowStep} 档` : "原速";
      $("speechRateIndicator").innerHTML = `<strong>${rate.toFixed(2)}x</strong><span>${label}</span>`;
    }

    function replaySlower() {
      state.replaySlowStep = Math.min(state.replaySlowStep + 1, 5);
      updateSpeechRateIndicator();
      speakText(getSpeechText(), { rate: currentReplayRate() });
    }

    function replayNormalSpeed() {
      state.replaySlowStep = 0;
      updateSpeechRateIndicator();
      speakText(getSpeechText(), { rate: currentReplayRate() });
    }

    function replayCurrentSpeed() {
      updateSpeechRateIndicator();
      speakText(getSpeechText(), { rate: currentReplayRate() });
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
      const words = [...targetEl.querySelectorAll(".target-word")];
      if (!words.length) return null;

      if (targetEl.classList.contains("hidden-source")) {
        return targetEl.querySelector(".covered-word") || words[words.length - 1];
      }

      return targetEl.querySelector(".wrong, .pending") || words[words.length - 1];
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

    function getTargetWordEndingAt(position) {
      const target = currentSentence();
      const wordPattern = /[A-Za-z]+(?:['’.-][A-Za-z]+)*/g;
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

    function isCheckChar(char) {
      return /[A-Za-z0-9]/.test(char || "");
    }

    function getCheckChars(text) {
      const chars = [];
      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (isCheckChar(char)) {
          chars.push({ char, normalized: char.toLowerCase(), pos: i + 1 });
        }
      }
      return chars;
    }

    function normalizeCheckText(text) {
      return getCheckChars(text).map((item) => item.normalized).join("");
    }

    function getWordMatches(text) {
      const words = [];
      const wordPattern = /[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*/g;
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
      const trailingWord = /[A-Za-z0-9'’.-]$/.test(input);

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
      const wordPattern = /[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*/g;
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
      state.speaking.spokenText = "";
      state.speaking.metrics = null;
      state.speaking.volumeLevel = 0;
      state.speaking.volumeTotal = 0;
      state.speaking.volumeSamples = 0;
      if (state.speaking.recordedAudioUrl) URL.revokeObjectURL(state.speaking.recordedAudioUrl);
      state.speaking.recordedAudioUrl = "";
      state.speaking.audioChunks = [];
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
      recognition.lang = $("accentSelect").value || "en-GB";
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
      $("analyzeGrammarBtn").title = hasGrammarCache ? "当前句已有缓存，点击查看" : "分析当前句语法";
      const showTranslation = $("showTranslationToggle").checked;
      const translationText = translation ? escapeHtml(translation) : "暂无翻译";
      const translationHtml = `<div class="translation-prompt ${showTranslation ? "" : "is-hidden"}">${showTranslation ? translationText : "&nbsp;"}</div>`;
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
        targetEl.innerHTML = `<span class="target-english">${html || "&nbsp;"}</span>${translationHtml}${grammarHtml}`;
        counterEl.textContent = `${state.index + 1} / ${state.sentences.length}`;
        $("translationInput").value = translation;
        return;
      }

      targetEl.className = "target";
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

      targetEl.innerHTML = `<span class="target-english">${html || "&nbsp;"}</span>${translationHtml}${grammarHtml}`;
      counterEl.textContent = `${state.index + 1} / ${state.sentences.length}`;
      $("translationInput").value = translation;
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

    function renderHistory() {
      if (!state.history.length) {
        historyEl.innerHTML = '<div class="empty">完成一句后会出现在这里。</div>';
        return;
      }

      historyEl.innerHTML = state.history.slice(0, 8).map((item) => `
        <div class="history-item">
          <strong>${escapeHtml(item.sentence)}</strong>
          <span>${item.accuracy}% · 流畅 ${item.fluency} · 错 ${item.errorCount} · ${item.wpm} WPM</span>
        </div>
      `).join("");
    }

    function render() {
      renderTarget();
      renderTypedPreview();
      renderErrors();
      renderHistory();
      renderSpeakingPage();
    }

    function switchSpeakingSentence(nextIndex, shouldSpeak = false) {
      stopSpeakingPractice();
      state.index = (nextIndex + state.sentences.length) % state.sentences.length;
      state.grammarVisible = false;
      typingBox.value = "";
      state.events = [];
      state.startedAt = 0;
      state.finished = false;
      state.lastSpokenWordKey = "";
      state.replaySlowStep = 0;
      updateSpeechRateIndicator();
      resetSpeakingResult();
      render();
      if (shouldSpeak) autoSpeakCurrentSentence();
    }

    function resetCurrent(shouldSpeak = false) {
      state.grammarVisible = false;
      typingBox.value = "";
      state.events = [];
      state.startedAt = 0;
      state.finished = false;
      state.lastSpokenWordKey = "";
      state.replaySlowStep = 0;
      updateSpeechRateIndicator();
      render();
      if (shouldSpeak) autoSpeakCurrentSentence();
    }

    function pickNextIndex() {
      const mode = $("modeSelect").value;
      if (mode === "random") {
        if (state.sentences.length <= 1) return 0;
        let next = state.index;
        while (next === state.index) {
          next = Math.floor(Math.random() * state.sentences.length);
        }
        return next;
      }

      if (mode === "mistakes") {
        const mistake = state.history.find((item) => item.errorCount > 0);
        if (mistake) {
          const found = state.sentences.findIndex((item) => sentenceText(item) === mistake.sentence);
          if (found >= 0) return found;
        }
      }

      return (state.index + 1) % state.sentences.length;
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
      state.index = (state.index - 1 + state.sentences.length) % state.sentences.length;
      resetCurrent(true);
    }

    function stopSpeech() {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }

    function closeTopMenus(exceptMenu = null) {
      document.querySelectorAll(".source-menu, .shortcut-menu, .user-menu").forEach((menu) => {
        if (menu !== exceptMenu) menu.removeAttribute("open");
      });
    }

    function finishCurrent() {
      if (!typingBox.value.trim() && !state.startedAt) return;
      state.finished = true;
      const metrics = calculateMetrics();
      renderMetrics(metrics);
      const record = {
        sentence: currentSentence(),
        accuracy: metrics.accuracy,
        fluency: metrics.fluency,
        errorCount: metrics.errors.length,
        wpm: metrics.wpm,
        at: new Date().toISOString()
      };
      state.history.unshift(record);
      state.history = state.history.slice(0, 80);
      saveUserHistory();
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
      const [file] = event.target.files;
      await importSentenceFile(file);
      event.target.value = "";
    });

    $("useTextBtn").addEventListener("click", () => {
      const sentences = parseSentences($("sentenceInput").value);
      if (!sentences.length) return;
      state.sentences = sentences;
      state.index = 0;
      $("sourceStatus").textContent = sentenceSourceLabel("粘贴内容", sentences);
      resetCurrent(true);
    });

    $("saveTranslationBtn").addEventListener("click", saveCurrentTranslation);
    $("saveAiSettingsBtn").addEventListener("click", saveAiSettings);
    $("analyzeGrammarBtn").addEventListener("click", analyzeCurrentGrammar);
    $("showAiPromptBtn").addEventListener("click", showCurrentAiPrompt);
    $("showAiResponseBtn").addEventListener("click", showCurrentAiResponse);
    $("copyAiTextBtn").addEventListener("click", copyAiText);
    $("closeAiTextModalBtn").addEventListener("click", closeAiTextModal);
    $("aiTextModal").addEventListener("pointerdown", (event) => {
      if (event.target === $("aiTextModal")) closeAiTextModal();
    });

    $("speakBtn").addEventListener("click", () => {
      saveSpeechSettings();
      speakCurrentSentence();
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
    $("previousUnifiedBtn").addEventListener("click", () => {
      switchSpeakingSentence(state.index - 1, true);
    });
    $("nextUnifiedBtn").addEventListener("click", () => {
      switchSpeakingSentence(state.index + 1, true);
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

    targetEl.addEventListener("auxclick", (event) => {
      const wordEl = targetWordFromEvent(event);
      if (!wordEl || event.button !== 1) return;
      event.preventDefault();
    });

    window.addEventListener("mouseup", clearPeekedWord);
    targetEl.addEventListener("mouseleave", clearPeekedWord);

    $("accentSelect").addEventListener("change", () => {
      state.speechSettings.voiceURI = "";
      populateVoices();
      saveSpeechSettings();
    });

    $("voiceSelect").addEventListener("change", saveSpeechSettings);
    $("autoSpeakToggle").addEventListener("change", saveSpeechSettings);
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

    document.querySelectorAll(".page-tab").forEach((tab) => {
      tab.addEventListener("click", () => setActivePage(tab.dataset.pageTarget));
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
        restoreBackupData(data);
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

    $("switchUserBtn").addEventListener("click", () => {
      showLogin();
    });

    document.querySelectorAll(".source-menu, .shortcut-menu, .user-menu").forEach((menu) => {
      menu.addEventListener("toggle", () => {
        if (menu.open) closeTopMenus(menu);
      });
    });

    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".source-menu, .shortcut-menu, .user-menu")) {
        closeTopMenus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAiTextModal();
        closeTopMenus();
      }
    });

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
      const [file] = event.dataTransfer ? Array.from(event.dataTransfer.files) : [];
      await importSentenceFile(file);
    });

    window.addEventListener("keydown", handleGlobalShortcut, { capture: true });
    window.addEventListener("keyup", handleGlobalShortcutKeyup, { capture: true });

    applyTheme(state.theme);
    setActivePage(state.activePage);
    loadSpeechSettings();
    loadAiSettings();
    renderShortcutSettings();
    updateSpeechRateIndicator();
    populateVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    if (state.currentUser) {
      loadUserHistory();
      $("userBadge").textContent = `用户：${state.currentUser}`;
      $("loginScreen").classList.remove("active");
    } else {
      $("userBadge").textContent = "未登录";
      showLogin();
    }

    tryLoadDefaultFile();
    render();


