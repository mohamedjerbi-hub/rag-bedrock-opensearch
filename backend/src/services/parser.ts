import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { extractText } from 'unpdf';
import { createWorker } from 'tesseract.js';

export interface ExtractedChunk {
  text: string;
  page?: number;
  section?: string;
  chunkIndex?: number;
  filename?: string;
}

export interface ParseResult {
  success: boolean;
  text: string;
  chunks: ExtractedChunk[];
  error?: string;
  warning?: string;
}

const MIN_EXTRACT_CHARS = 50;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// ─── OCR Configuration ────────────────────────────────────────────────────────
const OCR_ENABLED = process.env.OCR_ENABLED !== 'false'; // actif par défaut
const OCR_LANGS = process.env.OCR_LANGS || 'fra+eng'; // langues Tesseract

/**
 * Tente un OCR Tesseract sur un Buffer image/PDF page.
 * Retourne le texte extrait ou une chaîne vide en cas d'échec.
 */
async function runOcr(imageBuffer: Buffer): Promise<string> {
  if (!OCR_ENABLED) return '';
  let worker;
  try {
    worker = await createWorker(OCR_LANGS);
    const { data } = await worker.recognize(imageBuffer);
    return (data.text || '').trim();
  } catch (err: any) {
    console.warn('[Parser/OCR] Tesseract échec :', err?.message || err);
    return '';
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
  }
}

// ─── PDF Extraction ───────────────────────────────────────────────────────────

async function extractPdf(filename: string, buffer: Buffer): Promise<{ text: string; chunks: ExtractedChunk[] }> {
  // Extract page-by-page for best chunk metadata
  let fullText = '';
  const chunks: ExtractedChunk[] = [];

  try {
    // Try page-by-page extraction
    const { text: rawText } = await extractText(new Uint8Array(buffer), { mergePages: false });
    const pages: string[] = Array.isArray(rawText) ? (rawText as string[]) : [String(rawText || '')];

    for (let i = 0; i < pages.length; i++) {
      let pageText = String(pages[i] || '').trim();

      if (pageText.length < MIN_EXTRACT_CHARS) {
        // Page has very little text — likely a scanned image page → try OCR
        console.warn(`[Parser] Page ${i + 1} of "${filename}" extracted only ${pageText.length} chars — tentative OCR Tesseract...`);
        if (OCR_ENABLED) {
          const ocrText = await runOcr(buffer);
          if (ocrText.length >= MIN_EXTRACT_CHARS) {
            console.log(`[Parser/OCR] Page ${i + 1} de "${filename}" : OCR récupéré ${ocrText.length} chars.`);
            pageText = ocrText;
          } else {
            console.warn(`[Parser/OCR] Page ${i + 1} — OCR insuffisant (${ocrText.length} chars). Page ignorée.`);
          }
        }
      }

      if (pageText.length >= MIN_EXTRACT_CHARS) {
        chunks.push({ text: pageText, page: i + 1, filename });
        fullText += (fullText ? '\n\n' : '') + pageText;
      }
    }
  } catch (e) {
    // Fallback: merged extraction
    const { text: merged } = await extractText(new Uint8Array(buffer), { mergePages: true });
    fullText = typeof merged === 'string' ? merged : Array.isArray(merged) ? (merged as string[]).join('\n') : '';
  }

  return { text: fullText.trim(), chunks };
}

// ─── DOCX Extraction ──────────────────────────────────────────────────────────

async function extractDocx(buffer: Buffer): Promise<{ text: string }> {
  // Extract raw text including table content
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value || '').trim();
  return { text };
}

// ─── XLSX Extraction ──────────────────────────────────────────────────────────

function extractXlsx(buffer: Buffer): { text: string; chunks: ExtractedChunk[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: false, cellText: true });
  const chunks: ExtractedChunk[] = [];
  const allTexts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Get the range of the sheet
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rows: string[][] = [];

    // Extract headers from row 0
    const headers: string[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = sheet[cellAddr];
      headers.push(cell ? getCellValue(cell) : '');
    }

    // Extract data rows
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const rowParts: string[] = [];
      let hasData = false;

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddr];
        const value = cell ? getCellValue(cell) : '';
        const header = headers[col - range.s.c] || `Colonne${col + 1}`;

        if (value) {
          hasData = true;
          rowParts.push(`${header}: ${value}`);
        }
      }

      if (hasData) {
        rows.push(rowParts);
      }
    }

    if (rows.length === 0 && headers.some(h => h)) {
      // Sheet has headers but no data rows — include header line
      const headerText = `--- Onglet: ${sheetName} ---\nEn-têtes: ${headers.filter(Boolean).join(' | ')}`;
      allTexts.push(headerText);
      chunks.push({ text: headerText, section: sheetName });
      continue;
    }

    // Build linearized text for this sheet
    const sheetLines: string[] = [`--- Onglet: ${sheetName} ---`];
    if (headers.some(h => h)) {
      sheetLines.push(`En-têtes: ${headers.filter(Boolean).join(' | ')}`);
    }

    for (const rowParts of rows) {
      sheetLines.push(rowParts.join(' | '));
    }

    const sheetText = sheetLines.join('\n');
    if (sheetText.trim().length > 0) {
      allTexts.push(sheetText);
      chunks.push({ text: sheetText, section: sheetName });
    }
  }

  return {
    text: allTexts.join('\n\n'),
    chunks,
  };
}

function getCellValue(cell: XLSX.CellObject): string {
  if (!cell) return '';

  // Prefer formatted text (.w) for display values
  if (cell.w !== undefined && cell.w !== null && cell.w !== '') {
    return String(cell.w).trim();
  }

  // Fall back to computed value (.v) — this handles formula results
  if (cell.v !== undefined && cell.v !== null) {
    if (typeof cell.v === 'number') {
      // Round numbers sensibly
      return Number.isInteger(cell.v) ? String(cell.v) : cell.v.toFixed(4).replace(/\.?0+$/, '');
    }
    return String(cell.v).trim();
  }

  return '';
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function parseDocumentBuffer(
  filename: string,
  buffer: Buffer,
  mimeType?: string
): Promise<ParseResult> {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const isImageFormat = IMAGE_EXTENSIONS.includes(ext) || Boolean(mimeType && mimeType.startsWith('image/'));

  try {
    let fullText = '';
    let rawChunks: ExtractedChunk[] = [];
    let isImageEmpty = false;

    if (isImageFormat) {
      console.log(`[Parser] Processing image "${filename}" via Tesseract OCR (${OCR_LANGS})…`);
      const ocrText = await runOcr(buffer);
      const cleanOcr = ocrText.trim();

      if (cleanOcr.length > 0) {
        fullText = cleanOcr;
      } else {
        console.warn(`[Parser/OCR] Image "${filename}" : aucun texte exploitable reconnu par l'OCR.`);
        fullText = "Indexé avec texte incomplet ou vide";
        isImageEmpty = true;
      }

    } else if (ext === 'pdf' || mimeType === 'application/pdf') {
      const result = await extractPdf(filename, buffer);
      fullText = result.text;
      rawChunks = result.chunks;

    } else if (
      ext === 'docx' ||
      ext === 'doc' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await extractDocx(buffer);
      fullText = result.text;

    } else if (
      ext === 'xlsx' ||
      ext === 'xls' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      const result = extractXlsx(buffer);
      fullText = result.text;
      rawChunks = result.chunks;

    } else {
      // TXT, MD, CSV, etc.
      fullText = buffer.toString('utf-8');
    }

    const cleanText = fullText.trim();

    // Strict minimum content check (skipped for images so unreadable images are indexed with warning)
    if (!isImageFormat && (!cleanText || cleanText.length < MIN_EXTRACT_CHARS)) {
      return {
        success: false,
        text: '',
        chunks: [],
        error: `Échec d'extraction : le fichier "${filename}" ne contient pas assez de texte lisible (${cleanText.length} caractères extraits, minimum ${MIN_EXTRACT_CHARS}). Le fichier est peut-être vide, protégé par mot de passe, ou entièrement composé d'images scannées.`,
      };
    }

    // Build final chunks using standard smart chunking (900 chars, 150 overlap)
    const finalChunks = rawChunks.length > 0
      ? buildSmartChunksFromSections(rawChunks, filename)
      : buildSmartChunks(cleanText, filename);

    return {
      success: true,
      text: cleanText,
      chunks: finalChunks.length > 0 ? finalChunks : [{ text: cleanText, chunkIndex: 0, filename }],
      warning: isImageEmpty ? 'Indexé avec texte incomplet ou vide' : undefined,
    };

  } catch (err: any) {
    console.error(`[Parser] Error parsing "${filename}":`, err);
    return {
      success: false,
      text: '',
      chunks: [],
      error: `Erreur lors de l'extraction de "${filename}" : ${err?.message || 'Format invalide ou fichier corrompu.'}`,
    };
  }
}

// ─── Smart Chunking ───────────────────────────────────────────────────────────

/**
 * Paragraph-aware chunking:
 * - Target: 800–1000 chars
 * - Overlap: 150 chars
 * - Never cuts in the middle of a sentence
 */
export function buildSmartChunks(
  rawText: string,
  filename?: string,
  targetSize = 900,
  overlap = 150
): ExtractedChunk[] {
  const text = typeof rawText === 'string' ? rawText : String(rawText || '');
  if (!text.trim()) return [];

  // Split on paragraph boundaries (double newlines, or markdown headings)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const chunks: ExtractedChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  const pushChunk = (content: string) => {
    if (content.trim()) {
      chunks.push({ text: content.trim(), chunkIndex: chunkIndex++, filename });
    }
  };

  for (const para of paragraphs) {
    if ((currentChunk.length + para.length + 2) <= targetSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) {
        pushChunk(currentChunk);
        // Overlap: keep last `overlap` chars of current chunk
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n\n' + para;
      } else {
        currentChunk = para;
      }

      // If a single paragraph exceeds targetSize, split at sentence boundaries
      if (currentChunk.length > targetSize) {
        const split = splitAtSentence(currentChunk, targetSize, overlap);
        for (let i = 0; i < split.length - 1; i++) {
          pushChunk(split[i]);
        }
        currentChunk = split[split.length - 1] || '';
      }
    }
  }

  if (currentChunk.trim()) {
    pushChunk(currentChunk);
  }

  return chunks;
}

function splitAtSentence(text: string, targetSize: number, overlap: number): string[] {
  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > targetSize) {
    // Find the last sentence-ending punctuation within targetSize
    let splitIdx = -1;
    for (const delimiter of ['. ', '.\n', '? ', '! ', '.\t']) {
      const idx = remaining.lastIndexOf(delimiter, targetSize);
      if (idx > splitIdx) splitIdx = idx + delimiter.length - 1;
    }

    // Fallback: split at last space
    if (splitIdx <= targetSize / 2) {
      splitIdx = remaining.lastIndexOf(' ', targetSize);
    }

    // Last resort: hard cut
    if (splitIdx <= 0) splitIdx = targetSize;

    parts.push(remaining.substring(0, splitIdx + 1).trim());
    remaining = remaining.substring(Math.max(0, splitIdx + 1 - overlap)).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

function buildSmartChunksFromSections(sections: ExtractedChunk[], filename?: string): ExtractedChunk[] {
  const result: ExtractedChunk[] = [];
  let globalIndex = 0;

  for (const sec of sections) {
    const subChunks = buildSmartChunks(sec.text, filename);
    for (const sub of subChunks) {
      result.push({
        text: sub.text,
        page: sec.page,
        section: sec.section,
        chunkIndex: globalIndex++,
        filename: filename || sec.filename,
      });
    }
  }
  return result;
}
