import { PDFDocument } from 'pdf-lib';
import type { PageRef } from './model';

export interface SourceFile {
  kind: 'pdf' | 'image';
  bytes: Uint8Array;
  /** Image mime type ('image/jpeg' | 'image/png'); unused for PDFs. */
  mime?: string;
}

export type PageSize = 'original' | 'a4' | 'a3';
export type ContentFit = 'contain' | 'cover';

export interface MergeOptions {
  pageSize: PageSize;
  fit: ContentFit;
}

export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STANDARD_PAGE_SIZES: Record<Exclude<PageSize, 'original'>, readonly [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
};

export function calculatePlacement(
  contentWidth: number,
  contentHeight: number,
  pageWidth: number,
  pageHeight: number,
  fit: ContentFit,
): Placement {
  const scale =
    fit === 'contain'
      ? Math.min(pageWidth / contentWidth, pageHeight / contentHeight)
      : Math.max(pageWidth / contentWidth, pageHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;
  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

function standardPageSize(format: Exclude<PageSize, 'original'>, width: number, height: number): [number, number] {
  const [portraitWidth, portraitHeight] = STANDARD_PAGE_SIZES[format];
  return width > height ? [portraitHeight, portraitWidth] : [portraitWidth, portraitHeight];
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
  options: MergeOptions = { pageSize: 'original', fit: 'contain' },
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
      if (options.pageSize === 'original') {
        const [page] = await out.copyPages(src, [ref.pageIndex]);
        out.addPage(page);
      } else {
        const [page] = await out.copyPages(src, [ref.pageIndex]);
        const contentWidth = page.getWidth();
        const contentHeight = page.getHeight();
        const [pageWidth, pageHeight] = standardPageSize(
          options.pageSize,
          contentWidth,
          contentHeight,
        );
        const placement = calculatePlacement(
          contentWidth,
          contentHeight,
          pageWidth,
          pageHeight,
          options.fit,
        );
        page.setSize(pageWidth, pageHeight);
        page.scaleContent(placement.width / contentWidth, placement.height / contentHeight);
        page.translateContent(placement.x, placement.y);
        out.addPage(page);
      }
    } else {
      const image =
        file.mime === 'image/png' ? await out.embedPng(file.bytes) : await out.embedJpg(file.bytes);
      if (options.pageSize === 'original') {
        const page = out.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      } else {
        const [pageWidth, pageHeight] = standardPageSize(options.pageSize, image.width, image.height);
        const page = out.addPage([pageWidth, pageHeight]);
        page.drawImage(
          image,
          calculatePlacement(image.width, image.height, pageWidth, pageHeight, options.fit),
        );
      }
    }
  }

  return out.save();
}
