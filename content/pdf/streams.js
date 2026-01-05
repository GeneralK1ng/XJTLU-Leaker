(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const pdf = XJTLU.pdf || (XJTLU.pdf = {});
  const streams = pdf.streams || (pdf.streams = {});

  streams.removeTargetTextFromPdf = removeTargetTextFromPdf;
  streams.stripTargetText = stripTargetText;

  async function removeTargetTextFromPdf(pdfLib, bytes, matchers, pagesWithTarget, options = {}) {
    const logger = options.logger || console;
    const {
      PDFArray,
      PDFDocument,
      PDFName,
      PDFRawStream,
      PDFRef,
      arrayAsString,
      decodePDFRawStream
    } = pdfLib;

    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();

    let updated = false;

    const helpers = {
      PDFArray,
      PDFName,
      PDFRawStream,
      PDFRef,
      arrayAsString,
      decodePDFRawStream
    };

    const visitedXObjects = new Set();

    pages.forEach((page, index) => {
      const pageNumber = index + 1;
      if (pagesWithTarget && !pagesWithTarget.has(pageNumber)) return;

      const contents = page.node.Contents();
      if (!contents) return;

      const result = scrubPageContents(doc, contents, helpers, matchers);

      if (result.changed) {
        updated = true;
        page.node.set(PDFName.of("Contents"), result.contents);
      }

      const resources = page.node.Resources();
      if (resources) {
        const xObjectUpdated = scrubXObjectResources(
          doc,
          resources,
          helpers,
          matchers,
          visitedXObjects
        );
        if (xObjectUpdated) {
          updated = true;
        }
      }
    });

    if (!updated) {
      if (logger && typeof logger.warn === "function") {
        logger.warn("PDF sanitize: target text detected but no matching content was updated.");
      }
      return bytes;
    }

    return await doc.save();
  }

  function scrubPageContents(doc, contents, helpers, matchers) {
    const { PDFArray, PDFRawStream, PDFRef } = helpers;

    if (contents instanceof PDFArray) {
      const newContents = PDFArray.withContext(doc.context);
      let changed = false;

      contents.asArray().forEach((entry) => {
        const { stream, ref } = resolveStream(doc, entry, PDFRef);
        if (!stream) {
          newContents.push(entry);
          return;
        }

        const result = scrubStream(doc, stream, helpers, matchers);

        if (result.changed) {
          changed = true;
          newContents.push(result.ref);
        } else {
          newContents.push(ref || entry);
        }
      });

      return { changed, contents: newContents };
    }

    const { stream } = resolveStream(doc, contents, PDFRef);
    if (!stream) return { changed: false, contents };

    const result = scrubStream(doc, stream, helpers, matchers);

    if (!result.changed) return { changed: false, contents };

    return { changed: true, contents: result.ref };
  }

  function resolveStream(doc, entry, PDFRef) {
    if (!entry) return { stream: null, ref: null };
    if (entry instanceof PDFRef) {
      return { stream: doc.context.lookup(entry), ref: entry };
    }
    return { stream: entry, ref: null };
  }

  function scrubStream(doc, stream, helpers, matchers, options = {}) {
    const { PDFRawStream, PDFName, arrayAsString, decodePDFRawStream } = helpers;
    const decoded = decodeStream(stream, PDFRawStream, decodePDFRawStream);
    if (!decoded) return { changed: false, ref: null };

    const source = arrayAsString(decoded);
    const result = stripTargetText(source, matchers);
    if (!result.changed) return { changed: false, ref: null };

    const updatedBytes = stringToBytes(result.output);
    const updatedStream = doc.context.flateStream(updatedBytes);
    if (options.preserveDict && stream.dict && updatedStream.dict) {
      copyStreamDictionary(stream.dict, updatedStream.dict, PDFName);
    }
    const updatedRef = doc.context.register(updatedStream);
    return { changed: true, ref: updatedRef };
  }

  function scrubXObjectResources(doc, resources, helpers, matchers, visited) {
    const { PDFName, PDFRef } = helpers;
    if (!resources || typeof resources.lookup !== "function") return false;

    const xObjectDict = resources.lookup(PDFName.of("XObject"));
    if (!xObjectDict || typeof xObjectDict.keys !== "function") return false;

    let changed = false;

    xObjectDict.keys().forEach((name) => {
      const entry = xObjectDict.lookup(name);
      const { stream, ref } = resolveStream(doc, entry, PDFRef);
      if (!stream || !stream.dict) return;

      const refKey = ref && typeof ref.toString === "function" ? ref.toString() : null;
      if (refKey) {
        if (visited.has(refKey)) return;
        visited.add(refKey);
      }

      const subtype = stream.dict.lookup(PDFName.of("Subtype"));
      const subtypeName =
        subtype && typeof subtype.asString === "function" ? subtype.asString() : "";
      if (subtypeName === "/Image") return;

      const result = scrubStream(doc, stream, helpers, matchers, { preserveDict: true });
      if (result.changed) {
        changed = true;
        xObjectDict.set(name, result.ref);
      }

      if (subtypeName === "/Form") {
        const formResources = stream.dict.lookup(PDFName.of("Resources"));
        if (
          formResources &&
          scrubXObjectResources(doc, formResources, helpers, matchers, visited)
        ) {
          changed = true;
        }
      }
    });

    return changed;
  }

  function copyStreamDictionary(sourceDict, targetDict, PDFName) {
    if (!sourceDict || !targetDict || typeof sourceDict.entries !== "function") return;
    const skip = new Set(["/Length", "/Filter", "/DecodeParms"]);

    sourceDict.entries().forEach(([key, value]) => {
      const keyName = key && typeof key.asString === "function" ? key.asString() : "";
      if (skip.has(keyName)) return;
      targetDict.set(key, value);
    });

    if (!targetDict.has(PDFName.of("Filter"))) {
      targetDict.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
    }
  }

  function decodeStream(stream, PDFRawStream, decodePDFRawStream) {
    let decoded = null;
    if (stream instanceof PDFRawStream) {
      decoded = decodePDFRawStream(stream);
    } else if (typeof stream.getUnencodedContents === "function") {
      decoded = stream.getUnencodedContents();
    } else if (typeof stream.getContents === "function") {
      decoded = stream.getContents();
    }
    return getStreamBytes(decoded);
  }

  function getStreamBytes(decoded) {
    if (!decoded) return null;
    if (decoded instanceof Uint8Array) return decoded;
    if (ArrayBuffer.isView(decoded)) {
      return new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength);
    }
    if (typeof decoded.getBytes === "function") {
      return decoded.getBytes();
    }
    if (typeof decoded.getContents === "function") {
      return decoded.getContents();
    }
    return null;
  }

  function stripTargetText(source, matchers) {
    if (!source || !matchers || !Array.isArray(matchers.textRegexes)) {
      return { changed: false, output: source || "" };
    }

    let changed = false;
    let output = "";
    let index = 0;
    let sawInlineImage = false;

    const textRegexes = matchers.textRegexes;

    while (index < source.length) {
      const char = source[index];

      if (char === "%") {
        const lineEnd = findLineEnd(source, index);
        output += source.slice(index, lineEnd);
        index = lineEnd;
        continue;
      }

      if (char === "(") {
        const literal = readLiteralString(source, index);
        const result = scrubTextString(literal.value, textRegexes, "literal");
        if (result.changed) {
          output += `(${result.encoded})`;
          changed = true;
        } else {
          output += literal.raw;
        }
        index = literal.end;
        continue;
      }

      if (char === "<") {
        if (source[index + 1] === "<") {
          output += "<<";
          index += 2;
          continue;
        }

        const hex = readHexString(source, index);
        const result = scrubTextString(hex.value, textRegexes, "hex");
        if (result.changed) {
          output += `<${result.encoded}>`;
          changed = true;
        } else {
          output += hex.raw;
        }
        index = hex.end;
        continue;
      }

      if (isWhitespace(char)) {
        output += char;
        index += 1;
        continue;
      }

      if (isDelimiter(char)) {
        output += char;
        index += 1;
        continue;
      }

      const tokenStart = index;
      index = readToken(source, index);
      const token = source.slice(tokenStart, index);
      output += token;

      if (token === "BI") {
        sawInlineImage = true;
        continue;
      }

      if (token === "ID" && sawInlineImage) {
        sawInlineImage = false;

        if (index < source.length && isWhitespace(source[index])) {
          output += source[index];
          index += 1;
        }

        const dataEnd = findInlineImageDataEnd(source, index);
        output += source.slice(index, dataEnd);
        index = dataEnd;
        continue;
      }

      if (token === "EI") {
        sawInlineImage = false;
      }
    }

    return { changed, output };
  }

  function scrubTextString(value, textRegexes, kind) {
    if (!textRegexes || textRegexes.length === 0) {
      return { changed: false, encoded: value };
    }

    const bytes = kind === "hex" ? decodeHexBytes(value) : decodeLiteralBytes(value);
    if (!bytes) return { changed: false, encoded: value };

    const decoded = decodePdfString(bytes);
    let updatedText = decoded.text;
    textRegexes.forEach((regex) => {
      regex.lastIndex = 0;
      updatedText = updatedText.replace(regex, "");
    });
    if (updatedText === decoded.text) {
      return { changed: false, encoded: value };
    }

    const updatedBytes = encodePdfString(updatedText, decoded.encoding, decoded.hasBom);
    const encoded = kind === "hex" ? encodeHexBytes(updatedBytes) : encodeLiteralBytes(updatedBytes);

    return { changed: true, encoded };
  }

  function findLineEnd(source, start) {
    let index = start;
    while (index < source.length && source[index] !== "\n" && source[index] !== "\r") {
      index += 1;
    }
    if (source[index] === "\r" && source[index + 1] === "\n") {
      index += 2;
    } else if (index < source.length) {
      index += 1;
    }
    return index;
  }

  function readLiteralString(source, start) {
    let index = start + 1;
    let nesting = 1;
    let escaped = false;

    while (index < source.length && nesting > 0) {
      const char = source[index];
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "(") {
        nesting += 1;
      } else if (char === ")") {
        nesting -= 1;
      }
      index += 1;
    }

    const raw = source.slice(start, index);
    return { raw, value: raw.slice(1, -1), end: index };
  }

  function decodeLiteralBytes(value) {
    const bytes = [];
    let index = 0;

    while (index < value.length) {
      const char = value[index];

      if (char !== "\\") {
        bytes.push(value.charCodeAt(index) & 0xff);
        index += 1;
        continue;
      }

      const next = value[index + 1];
      if (next === "\n") {
        index += 2;
        continue;
      }
      if (next === "\r") {
        index += value[index + 2] === "\n" ? 3 : 2;
        continue;
      }

      switch (next) {
        case "n":
          bytes.push(0x0a);
          index += 2;
          continue;
        case "r":
          bytes.push(0x0d);
          index += 2;
          continue;
        case "t":
          bytes.push(0x09);
          index += 2;
          continue;
        case "b":
          bytes.push(0x08);
          index += 2;
          continue;
        case "f":
          bytes.push(0x0c);
          index += 2;
          continue;
        case "\\":
        case "(":
        case ")":
          bytes.push(next.charCodeAt(0));
          index += 2;
          continue;
        default:
          if (next >= "0" && next <= "7") {
            let octal = next;
            let lookahead = index + 2;
            while (octal.length < 3 && lookahead < value.length) {
              const digit = value[lookahead];
              if (digit < "0" || digit > "7") break;
              octal += digit;
              lookahead += 1;
            }
            bytes.push(parseInt(octal, 8) & 0xff);
            index += 1 + octal.length;
            continue;
          }
          bytes.push(next ? next.charCodeAt(0) : 0);
          index += next ? 2 : 1;
          continue;
      }
    }

    return new Uint8Array(bytes);
  }

  function readHexString(source, start) {
    let index = start + 1;
    while (index < source.length && source[index] !== ">") {
      index += 1;
    }
    if (index < source.length) {
      index += 1;
    }
    const raw = source.slice(start, index);
    return { raw, value: raw.slice(1, -1), end: index };
  }

  function decodeHexBytes(value) {
    const cleaned = value.replace(/\s+/g, "");
    if (!cleaned) return new Uint8Array();

    const length = cleaned.length;
    const size = Math.ceil(length / 2);
    const bytes = new Uint8Array(size);

    for (let i = 0; i < size; i += 1) {
      const pair = cleaned.slice(i * 2, i * 2 + 2);
      const hex = pair.length === 2 ? pair : `${pair}0`;
      bytes[i] = parseInt(hex, 16) & 0xff;
    }

    return bytes;
  }

  function decodePdfString(bytes) {
    if (bytes.length >= 2) {
      if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return {
          text: decodeUtf16(bytes.slice(2), "be"),
          encoding: "utf16be",
          hasBom: true
        };
      }
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return {
          text: decodeUtf16(bytes.slice(2), "le"),
          encoding: "utf16le",
          hasBom: true
        };
      }
    }

    const guessed = guessUtf16Encoding(bytes);
    if (guessed) {
      return {
        text: decodeUtf16(bytes, guessed),
        encoding: guessed === "be" ? "utf16be" : "utf16le",
        hasBom: false
      };
    }

    return {
      text: decodeLatin1(bytes),
      encoding: "latin1",
      hasBom: false
    };
  }

  function encodePdfString(text, encoding, hasBom) {
    if (encoding === "latin1") {
      return encodeLatin1(text);
    }

    const order = encoding === "utf16le" ? "le" : "be";
    const bytes = new Uint8Array(text.length * 2 + (hasBom ? 2 : 0));
    let offset = 0;

    if (hasBom) {
      if (order === "be") {
        bytes[0] = 0xfe;
        bytes[1] = 0xff;
      } else {
        bytes[0] = 0xff;
        bytes[1] = 0xfe;
      }
      offset = 2;
    }

    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (order === "be") {
        bytes[offset++] = (code >> 8) & 0xff;
        bytes[offset++] = code & 0xff;
      } else {
        bytes[offset++] = code & 0xff;
        bytes[offset++] = (code >> 8) & 0xff;
      }
    }

    return bytes;
  }

  function decodeUtf16(bytes, order) {
    let result = "";
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const code =
        order === "be"
          ? (bytes[i] << 8) | bytes[i + 1]
          : (bytes[i + 1] << 8) | bytes[i];
      result += String.fromCharCode(code);
    }
    return result;
  }

  function guessUtf16Encoding(bytes) {
    if (bytes.length < 4 || bytes.length % 2 !== 0) return null;

    let evenZero = 0;
    let oddZero = 0;
    const pairs = bytes.length / 2;

    for (let i = 0; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0x00) evenZero += 1;
      if (bytes[i + 1] === 0x00) oddZero += 1;
    }

    if (evenZero / pairs > 0.6) return "be";
    if (oddZero / pairs > 0.6) return "le";
    return null;
  }

  function decodeLatin1(bytes) {
    let result = "";
    for (let i = 0; i < bytes.length; i += 1) {
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  }

  function encodeLatin1(text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      bytes[i] = text.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  function encodeLiteralBytes(bytes) {
    let result = "";
    for (let i = 0; i < bytes.length; i += 1) {
      const byte = bytes[i];
      switch (byte) {
        case 0x0a:
          result += "\\n";
          break;
        case 0x0d:
          result += "\\r";
          break;
        case 0x09:
          result += "\\t";
          break;
        case 0x08:
          result += "\\b";
          break;
        case 0x0c:
          result += "\\f";
          break;
        case 0x28:
          result += "\\(";
          break;
        case 0x29:
          result += "\\)";
          break;
        case 0x5c:
          result += "\\\\";
          break;
        default:
          if (byte < 0x20 || byte > 0x7e) {
            result += `\\${byte.toString(8).padStart(3, "0")}`;
          } else {
            result += String.fromCharCode(byte);
          }
          break;
      }
    }
    return result;
  }

  function encodeHexBytes(bytes) {
    let result = "";
    for (let i = 0; i < bytes.length; i += 1) {
      result += bytes[i].toString(16).padStart(2, "0");
    }
    return result;
  }

  function readToken(source, start) {
    let index = start;
    if (source[index] === "/") {
      index += 1;
    }
    while (index < source.length && !isTokenTerminator(source[index])) {
      index += 1;
    }
    return index;
  }

  function findInlineImageDataEnd(source, start) {
    for (let index = start; index < source.length - 2; index += 1) {
      if (!isWhitespace(source[index])) continue;
      if (source[index + 1] !== "E" || source[index + 2] !== "I") continue;

      const after = source[index + 3];
      if (after === undefined || isWhitespace(after)) {
        return index;
      }
    }
    return source.length;
  }

  function isWhitespace(char) {
    return (
      char === "\x00" ||
      char === "\t" ||
      char === "\n" ||
      char === "\x0c" ||
      char === "\r" ||
      char === " "
    );
  }

  function isDelimiter(char) {
    return (
      char === "(" ||
      char === ")" ||
      char === "<" ||
      char === ">" ||
      char === "[" ||
      char === "]" ||
      char === "{" ||
      char === "}" ||
      char === "/" ||
      char === "%"
    );
  }

  function isTokenTerminator(char) {
    return isWhitespace(char) || isDelimiter(char);
  }

  function stringToBytes(value) {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
      bytes[i] = value.charCodeAt(i) & 0xff;
    }
    return bytes;
  }
})();
