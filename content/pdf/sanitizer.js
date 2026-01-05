(() => {
  const XJTLU = globalThis.__XJTLU_PDF__ || (globalThis.__XJTLU_PDF__ = {});
  const pdf = XJTLU.pdf || (XJTLU.pdf = {});
  const matchers = pdf.matchers || (pdf.matchers = {});
  const source = pdf.source || (pdf.source = {});
  const streams = pdf.streams || (pdf.streams = {});

  pdf.sanitizer = {
    sanitizePdfBlob,
    sanitizePdfBytes,
    createSanitizer
  };

  function createSanitizer(options = {}) {
    const libs = resolveLibraries(options);
    const logger = options.logger;
    return {
      sanitizeBlob: (blob, targetText) =>
        sanitizePdfBlob(blob, { ...libs, targetText, logger }),
      sanitizeBytes: (bytes, targetText) =>
        sanitizePdfBytes(bytes, { ...libs, targetText, logger })
    };
  }

  async function sanitizePdfBlob(blob, options = {}) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const sanitizedBytes = await sanitizePdfBytes(bytes, options);
    return new Blob([sanitizedBytes], { type: blob.type || "application/pdf" });
  }

  async function sanitizePdfBytes(inputBytes, options = {}) {
    const bytes = normalizeInputBytes(inputBytes);
    if (!bytes) {
      throw new Error("Invalid PDF input bytes.");
    }

    const targetText = options.targetText;
    if (!targetText) return bytes;

    if (
      typeof matchers.buildRedactionMatchers !== "function" ||
      typeof source.preparePdfBytes !== "function" ||
      typeof streams.removeTargetTextFromPdf !== "function"
    ) {
      throw new Error("PDF sanitizer dependencies are not available.");
    }

    const matcherSet = matchers.buildRedactionMatchers(targetText);
    if (!matcherSet) return bytes;

    const pdfLib = options.pdfLib || globalThis.PDFLib;
    const pdfjsLib = options.pdfjsLib || globalThis.pdfjsLib;
    if (!pdfLib || !pdfjsLib) {
      throw new Error("PDF processing libraries are not available.");
    }

    const prepared = source.preparePdfBytes(bytes);
    if (!prepared) {
      throw new Error("Response does not contain a valid PDF file.");
    }

    const pdfBytesForPdfjs = prepared.slice();
    const { pages, pdfData } = await findPagesWithTarget(pdfjsLib, pdfBytesForPdfjs, matcherSet);
    if (pages.size === 0) {
      return pdfData || prepared;
    }

    const logger = options.logger || console;
    return await streams.removeTargetTextFromPdf(
      pdfLib,
      pdfData || prepared,
      matcherSet,
      pages,
      { logger }
    );
  }

  async function findPagesWithTarget(pdfjsLib, bytes, matcherSet) {
    const doc = await loadPdfJsDocument(pdfjsLib, bytes);
    const pages = new Set();
    let pdfData = null;

    try {
      for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
        const page = await doc.getPage(pageIndex);
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        const combined = textContent.items.map((item) => item.str || "").join(" ");
        const normalized = matchers.normalizeText(combined);
        if (matcherSet.normalizedRegexes.some((regex) => regex.test(normalized))) {
          pages.add(pageIndex);
        }
        if (typeof page.cleanup === "function") {
          page.cleanup();
        }
      }
      if (typeof doc.getData === "function") {
        try {
          pdfData = await doc.getData();
        } catch (err) {
          pdfData = null;
        }
      }
    } finally {
      if (typeof doc.destroy === "function") {
        await doc.destroy();
      }
    }

    return { pages, pdfData };
  }

  async function loadPdfJsDocument(pdfjsLib, bytes) {
    if (pdfjsLib.GlobalWorkerOptions && globalThis.chrome?.runtime?.getURL) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
        "vendor/pdfjs/pdf.worker.min.js"
      );
    }

    const dataCopy = bytes.slice();

    try {
      return await pdfjsLib.getDocument({ data: dataCopy }).promise;
    } catch (err) {
      return await pdfjsLib.getDocument({ data: dataCopy, disableWorker: true }).promise;
    }
  }

  function resolveLibraries(options = {}) {
    return {
      pdfLib: options.pdfLib || globalThis.PDFLib,
      pdfjsLib: options.pdfjsLib || globalThis.pdfjsLib
    };
  }

  function normalizeInputBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    return null;
  }
})();
