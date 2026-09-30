// Spanish dictionary rules: how the Spanish Wiktionary package's word-form ("exchange") field is read and grouped.
// tools/build-spanish-dictionary.py stores one "tags:form" item per line: "0:<lemma>" for the base form (from
// Wiktionary form_of), then forms such as "plural:abogadas" or "feminine,singular:buena". Forms may contain "/".
(function () {
  const languages = window.langLSRWLanguages || (window.langLSRWLanguages = {});
  const language = languages.es || (languages.es = {});

  language.dictionary = {
    // Returns [{ type, label, form, isBase }] in field order. Non-base labels are still the Wiktionary tags.
    exchanges(value) {
      return String(value || "")
        .split(/\r?\n/)
        .map((item) => {
          const separator = item.indexOf(":");
          if (separator < 1) return null;
          const type = item.slice(0, separator).trim();
          const form = item.slice(separator + 1).trim();
          if (!form) return null;
          const isBase = type === "0";
          return { type, label: isBase ? "原形" : type.split(",").join(", "), form, isBase };
        })
        .filter(Boolean);
    },
    // Display groups in order; every other form (gender, number, conjugation) goes to 其他 for now.
    exchangeGroups: [
      { key: "base", label: "原形", types: ["0"] }
    ],
    // `frq` is the lemma's rank in the subtitle frequency list (assets/dictionaries/runtime/spanish-wiktionary/
    // frequency.tsv), imported by the dictionary Worker; categories are rank tiers.
    frequencyLabels: { frq: "字幕" },
    libraryCategoryOptions: [
      ["top500", "常用 500"], ["top1000", "常用 1000"], ["top2000", "常用 2000"], ["top3000", "常用 3000"],
      ["top5000", "常用 5000"], ["top10000", "常用 10000"], ["all", "全部"]
    ],
    librarySortOptions: [["alphabetical", "字母 A-Z"], ["favorites", "用户收藏"], ["frq", "字幕词频"]],
    favoriteCategoryOptions: [
      ["all", "全部"], ["top500", "常用 500"], ["top1000", "常用 1000"], ["top2000", "常用 2000"],
      ["top3000", "常用 3000"], ["top5000", "常用 5000"], ["top10000", "常用 10000"]
    ],
    favoriteSortOptions: [["saved-desc", "收藏时间"], ["rating", "收藏星级"], ["alphabetical", "字母 A-Z"], ["frq", "字幕词频"]],
    matchesCategory(item, category) {
      if (category === "all") return true;
      const limit = Number(String(category).replace(/^top/, ""));
      const rank = Number(item.frq);
      return limit > 0 && rank > 0 && rank <= limit;
    }
  };
})();
