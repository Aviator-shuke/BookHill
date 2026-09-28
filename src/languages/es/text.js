// Spanish text rules: word splitting and dictation comparison for Spanish learning material.
// Spanish words are Unicode letters (with combining marks) and digits, so á é í ó ú ü ñ belong to their words.
// ¿ and ¡ are punctuation. Comparison ignores case only, so accents are graded strictly (owner decision
// 2026-09-28): a missing or wrong accent is a wrong letter, and ñ is never n.
(function () {
  const languages = window.langLSRWLanguages || (window.langLSRWLanguages = {});
  const language = languages.es || (languages.es = {});

  language.text = {
    // A new RegExp per call: callers loop with exec() and may stop early, so a shared /g object would keep lastIndex.
    wordRegex: () => /[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*/gu,
    // Words as typed for automatic word pronunciation (letters only).
    typedWordRegex: () => /[\p{L}\p{M}]+(?:['’.-][\p{L}\p{M}]+)*/gu,
    isCheckChar: (char) => /[\p{L}\p{M}\p{N}]/u.test(char || ""),
    normalizeChar: (char) => char.toLocaleLowerCase("es"),
    endsInWord: (text) => /[\p{L}\p{M}\p{N}'’.-]$/u.test(text || ""),
    startsLowercase: (text) => /^\p{Ll}/u.test(text || ""),
    // Letters hidden as blanks in 听写 / 默写 letter slots; other characters stay visible.
    isLetterChar: (char) => /[\p{L}\p{M}]/u.test(char || "")
  };
})();
