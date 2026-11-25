import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedDocumentResult {
  text: string;
  pageCount?: number;
  isScannedPdf?: boolean;
  renderedImageBase64?: string;
}

const MAX_EXTRACTED_CHARS = 60000;

/**
 * Extracts text from a PDF file using pdfjs-dist.
 * If the PDF is scanned (almost no selectable text), renders the first page to JPEG
 * so Groq Vision OCR can extract the notes.
 */
export async function parsePdfFile(file: File): Promise<ParsedDocumentResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageCount = pdf.numPages;
  const maxTextPages = Math.min(pageCount, 30);
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= maxTextPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    const pageStr = strings.join(' ').replace(/\s+/g, ' ').trim();
    if (pageStr) {
      pageTexts.push(pageCount > 1 ? `--- Page ${pageNum} ---\n${pageStr}` : pageStr);
    }
  }

  const combinedText = pageTexts.join('\n\n').trim();

  // If virtually no text was found, treat as scanned PDF and render page 1 to JPEG
  if (combinedText.replace(/\s+/g, '').length < 40 && pageCount >= 1) {
    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1600, Math.round(viewport.width));
    canvas.height = Math.round((canvas.width / viewport.width) * viewport.height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = canvas.width / viewport.width;
      const scaledViewport = firstPage.getViewport({ scale: 1.5 * scale });
      await firstPage.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;
      const renderedImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      return {
        text: '',
        pageCount,
        isScannedPdf: true,
        renderedImageBase64
      };
    }
  }

  return {
    text: combinedText.slice(0, MAX_EXTRACTED_CHARS),
    pageCount,
    isScannedPdf: false
  };
}

/**
 * Reads a plain text, markdown, CSV, JSON, or code file.
 */
export async function parseTextFile(file: File): Promise<ParsedDocumentResult> {
  const rawText = await file.text();
  return {
    text: rawText.slice(0, MAX_EXTRACTED_CHARS)
  };
}
