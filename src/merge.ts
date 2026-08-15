import { PDFDocument } from 'pdf-lib';
import type { PageRef } from './model';

export interface SourceFile {
  kind: 'pdf' | 'image';
  bytes: Uint8Array;
  /** Image mime type ('image/jpeg' | 'image/png'); unused for PDFs. */
  mime?: string;
}

/**
 * Validates a PDF at add time and returns its page count.
 * Throws on corrupt or encrypted files, so broken PDFs never enter the page list.
 */
export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

/** Builds the merged PDF from the ordered page list. Returns the file bytes. */
export async function mergePdf(
  pages: readonly PageRef[],
  files: ReadonlyMap<string, SourceFile>,
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  // Each source PDF is parsed once, however many of its pages are referenced.
  const loaded = new Map<string, PDFDocument>();

  for (const ref of pages) {
    const file = files.get(ref.fileId);
    if (!file) throw new Error(`Unknown fileId: ${ref.fileId}`);

    if (ref.kind === 'pdf') {
      let src = loaded.get(ref.fileId);
      if (!src) {
        src = await PDFDocument.load(file.bytes);
        loaded.set(ref.fileId, src);
      }
      const [page] = await out.copyPages(src, [ref.pageIndex]);
      out.addPage(page);
    } else {
      const image =
        file.mime === 'image/png' ? await out.embedPng(file.bytes) : await out.embedJpg(file.bytes);
      // Page size = native image size, so the image fills it without borders.
      const page = out.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
  }

  return out.save();
}
