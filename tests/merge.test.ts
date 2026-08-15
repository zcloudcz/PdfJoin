import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { getPdfPageCount, mergePdf } from '../src/merge';
import type { SourceFile } from '../src/merge';
import type { PageRef } from '../src/model';

// Real fixtures generated with pdf-lib — no mocks. Pages get distinct sizes
// so the output order can be asserted by inspecting page dimensions.
async function makePdf(sizes: [number, number][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const [w, h] of sizes) {
    doc.addPage([w, h]);
  }
  return doc.save();
}

// Smallest valid 1x1 transparent PNG.
const PNG_1X1 = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

const pdfFile = (bytes: Uint8Array): SourceFile => ({ kind: 'pdf', bytes });
const pngFile = (bytes: Uint8Array): SourceFile => ({ kind: 'image', bytes, mime: 'image/png' });

async function pageSizes(bytes: Uint8Array): Promise<[number, number][]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => [p.getWidth(), p.getHeight()]);
}

describe('mergePdf', () => {
  test('copies pages from multiple PDFs in the order of PageRefs', async () => {
    const a = await makePdf([[100, 100], [200, 200]]);
    const b = await makePdf([[300, 300]]);
    const files = new Map([['a', pdfFile(a)], ['b', pdfFile(b)]]);
    const pages: PageRef[] = [
      { fileId: 'b', kind: 'pdf', pageIndex: 0 },
      { fileId: 'a', kind: 'pdf', pageIndex: 1 },
      { fileId: 'a', kind: 'pdf', pageIndex: 0 },
    ];

    const result = await mergePdf(pages, files);

    expect(await pageSizes(result)).toEqual([[300, 300], [200, 200], [100, 100]]);
  });

  test('omits pages that were removed from the list', async () => {
    const a = await makePdf([[100, 100], [200, 200], [300, 300]]);
    const files = new Map([['a', pdfFile(a)]]);
    const pages: PageRef[] = [
      { fileId: 'a', kind: 'pdf', pageIndex: 0 },
      { fileId: 'a', kind: 'pdf', pageIndex: 2 },
    ];

    const result = await mergePdf(pages, files);

    expect(await pageSizes(result)).toEqual([[100, 100], [300, 300]]);
  });

  test('embeds a PNG image as a page with the image native size', async () => {
    const a = await makePdf([[100, 100]]);
    const files = new Map([['a', pdfFile(a)], ['img', pngFile(PNG_1X1)]]);
    const pages: PageRef[] = [
      { fileId: 'a', kind: 'pdf', pageIndex: 0 },
      { fileId: 'img', kind: 'image', pageIndex: 0 },
    ];

    const result = await mergePdf(pages, files);

    expect(await pageSizes(result)).toEqual([[100, 100], [1, 1]]);
  });
});

describe('getPdfPageCount', () => {
  test('returns the page count of a valid PDF', async () => {
    const a = await makePdf([[100, 100], [200, 200]]);
    expect(await getPdfPageCount(a)).toBe(2);
  });

  test('rejects on bytes that are not a PDF', async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(getPdfPageCount(garbage)).rejects.toThrow();
  });
});
