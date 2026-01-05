(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const pdf = XJTLU.pdf || (XJTLU.pdf = {});
  const source = pdf.source || (pdf.source = {});

  source.preparePdfBytes = preparePdfBytes;

  function preparePdfBytes(bytes) {
    const headerIndex = findPdfHeaderIndex(bytes);
    if (headerIndex !== -1) {
      return headerIndex === 0 ? bytes : bytes.slice(headerIndex);
    }

    const text = decodeText(bytes);
    if (!text) return null;

    const base64 = extractBase64Pdf(text);
    if (!base64) return null;

    const decoded = decodeBase64(base64);
    if (!decoded) return null;

    const decodedHeader = findPdfHeaderIndex(decoded);
    if (decodedHeader === -1) return null;

    return decodedHeader === 0 ? decoded : decoded.slice(decodedHeader);
  }

  function findPdfHeaderIndex(bytes) {
    if (!bytes || bytes.length < 5) return -1;
    const header = [0x25, 0x50, 0x44, 0x46, 0x2d];
    const limit = bytes.length - header.length;

    for (let index = 0; index <= limit; index += 1) {
      let matched = true;
      for (let offset = 0; offset < header.length; offset += 1) {
        if (bytes[index + offset] !== header[offset]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return index;
      }
    }

    return -1;
  }

  function decodeText(bytes) {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch (err) {
      return null;
    }
  }

  function extractBase64Pdf(text) {
    if (!text) return null;

    const dataUrlMatch = text.match(
      /data:application\/pdf;base64,([0-9A-Za-z+/=\s]+)/i
    );
    if (dataUrlMatch) {
      return cleanBase64(dataUrlMatch[1]);
    }

    const directMatch = text.match(/JVBERi0[0-9A-Za-z+/=\s]+/);
    if (directMatch) {
      return cleanBase64(directMatch[0]);
    }

    if (!looksLikeJson(text)) return null;

    try {
      const parsed = JSON.parse(text);
      const nested = findBase64PdfInJson(parsed);
      return nested ? cleanBase64(nested) : null;
    } catch (err) {
      return null;
    }
  }

  function looksLikeJson(text) {
    const trimmed = text.trim();
    return trimmed.startsWith("{") || trimmed.startsWith("[");
  }

  function findBase64PdfInJson(value) {
    if (typeof value === "string") {
      const match = value.match(/JVBERi0[0-9A-Za-z+/=\s]+/);
      return match ? match[0] : null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findBase64PdfInJson(item);
        if (found) return found;
      }
      return null;
    }

    if (value && typeof value === "object") {
      for (const key of Object.keys(value)) {
        const found = findBase64PdfInJson(value[key]);
        if (found) return found;
      }
    }

    return null;
  }

  function cleanBase64(value) {
    return value.replace(/\s+/g, "");
  }

  function decodeBase64(value) {
    try {
      const normalized = normalizeBase64(value);
      const binary = atob(normalized);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    } catch (err) {
      return null;
    }
  }

  function normalizeBase64(value) {
    let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    if (padding) {
      normalized += "=".repeat(4 - padding);
    }
    return normalized;
  }
})();
