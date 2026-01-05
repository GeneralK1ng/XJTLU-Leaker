(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const pdf = XJTLU.pdf || (XJTLU.pdf = {});
  const matchers = pdf.matchers || (pdf.matchers = {});

  matchers.buildRedactionMatchers = buildRedactionMatchers;
  matchers.normalizeText = normalizeText;

  function buildRedactionMatchers(targetText) {
    const patterns = splitRedactionPatterns(targetText);
    const normalizedPatterns = patterns
      .map((pattern) => buildNormalizedPattern(pattern))
      .filter(Boolean);
    const textPatterns = patterns
      .map((pattern) => buildTextPattern(pattern))
      .filter(Boolean);

    if (!normalizedPatterns.length || !textPatterns.length) return null;

    return {
      normalizedRegexes: normalizedPatterns.map((pattern) => new RegExp(pattern, "i")),
      textRegexes: textPatterns.map((pattern) => new RegExp(pattern, "gi"))
    };
  }

  function normalizeText(value) {
    return value.replace(/[\s\u0000]+/g, "");
  }

  function buildNormalizedPattern(targetText) {
    const parts = buildPatternParts(targetText, { digitPattern: "\\d+" });
    return parts.length ? parts.join("") : "";
  }

  function buildTextPattern(targetText) {
    const parts = buildPatternParts(targetText, { digitPattern: "\\d(?:\\s*\\d)*" });
    return parts.length ? parts.join("\\s*") : "";
  }

  function buildPatternParts(targetText, options = {}) {
    const parts = [];
    if (!targetText || typeof targetText !== "string") return parts;
    const digitPattern = options.digitPattern || "\\d";
    let inDigits = false;

    for (const char of Array.from(targetText)) {
      if (isTemplateWhitespace(char)) continue;
      if (isDigitChar(char)) {
        if (!inDigits) {
          parts.push(digitPattern);
          inDigits = true;
        }
      } else {
        inDigits = false;
        parts.push(escapeRegex(char));
      }
    }

    return parts;
  }

  function splitRedactionPatterns(value) {
    if (!value || typeof value !== "string") return [];
    return value
      .split(/\r?\n|\\r?\\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function isTemplateWhitespace(char) {
    return /\s/.test(char);
  }

  function isDigitChar(char) {
    return char >= "0" && char <= "9";
  }
})();
