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
    ]
  };
})();
