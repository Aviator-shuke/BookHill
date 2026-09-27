// English dictionary rules: how ECDICT's word-form ("exchange") field is read and grouped for display.
// ECDICT stores "type:form" items joined with "/", for example "p:went/d:gone/i:going/3:goes/0:go".
(function () {
  const languages = window.langLSRWLanguages || (window.langLSRWLanguages = {});
  const language = languages.en || (languages.en = {});

  const labels = {
    p: "过去式",
    d: "过去分词",
    i: "现在分词",
    3: "第三人称单数",
    r: "比较级",
    t: "最高级",
    s: "复数",
    0: "原形",
    1: "原形类别"
  };

  language.dictionary = {
    // Returns [{ type, label, form, isBase }] in field order.
    exchanges(value) {
      return String(value || "")
        .split("/")
        .map((item) => {
          const separator = item.indexOf(":");
          if (separator < 1) return null;
          const type = item.slice(0, separator).trim();
          const form = item.slice(separator + 1).trim();
          return form ? { type, label: labels[type] || type, form, isBase: type === "0" } : null;
        })
        .filter(Boolean);
    },
    // Display groups in order; items whose type is not listed go to 其他.
    exchangeGroups: [
      { key: "base", label: "原形", types: ["0", "1"] },
      { key: "noun", label: "名词", types: ["s"] },
      { key: "tense", label: "时态", types: ["3", "p"] },
      { key: "participle", label: "分词", types: ["i", "d"] },
      { key: "comparison", label: "比较", types: ["r", "t"] }
    ]
  };
})();
