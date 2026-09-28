// English text rules: word splitting and dictation comparison for English learning material.
// English words are ASCII letters and digits; an apostrophe, period, or hyphen joins word parts
// (don't, U.S., well-known). Comparison ignores case only.
(function () {
  const languages = window.langLSRWLanguages || (window.langLSRWLanguages = {});
  const language = languages.en || (languages.en = {});

  language.text = {
    // A new RegExp per call: callers loop with exec() and may stop early, so a shared /g object would keep lastIndex.
    wordRegex: () => /[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*/g,
    // Words as typed for automatic word pronunciation (letters only).
    typedWordRegex: () => /[A-Za-z]+(?:['’.-][A-Za-z]+)*/g,
    isCheckChar: (char) => /[A-Za-z0-9]/.test(char || ""),
    normalizeChar: (char) => char.toLowerCase(),
    endsInWord: (text) => /[A-Za-z0-9'’.-]$/.test(text || ""),
    startsLowercase: (text) => /^[a-z]/.test(text || ""),
    // Letters hidden as blanks in 听写 / 默写 letter slots; other characters stay visible.
    isLetterChar: (char) => /[A-Za-z]/.test(char || "")
  };
})();
