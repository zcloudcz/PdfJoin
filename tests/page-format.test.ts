import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { calculatePlacement, mergePdf } from '../src/merge';
import type { SourceFile } from '../src/merge';
import type { PageRef } from '../src/model';

async function makePdf(sizes: [number, number][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const size of sizes) doc.addPage(size);
  return doc.save();
}

const PNG_1X1 = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (character) => character.charCodeAt(0),
);

async function pageSizes(bytes: Uint8Array): Promise<[number, number][]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => [page.getWidth(), page.getHeight()]);
}

describe('standard page formats', () => {
  test('normalizes PDF pages to A4 with automatic orientation', async () => {
    const source = await makePdf([[100, 200], [200, 100]]);
    const files = new Map<string, SourceFile>([['source', { kind: 'pdf', bytes: source }]]);
    const pages: PageRef[] = [
      { fileId: 'source', kind: 'pdf', pageIndex: 0 },
      { fileId: 'source', kind: 'pdf', pageIndex: 1 },
    ];

    const result = await mergePdf(pages, files, { pageSize: 'a4', fit: 'contain' });
    const sizes = await pageSizes(result);

    expect(sizes[0][0]).toBeCloseTo(595.28, 2);
    expect(sizes[0][1]).toBeCloseTo(841.89, 2);
    expect(sizes[1][0]).toBeCloseTo(841.89, 2);
    expect(sizes[1][1]).toBeCloseTo(595.28, 2);
  });

  test('normalizes an image page to A3', async () => {
    const files = new Map<string, SourceFile>([
      ['img', { kind: 'image', bytes: PNG_1X1, mime: 'image/png' }],
    ]);
    const pages: PageRef[] = [{ fileId: 'img', kind: 'image', pageIndex: 0 }];

    const result = await mergePdf(pages, files, { pageSize: 'a3', fit: 'cover' });
    const [size] = await pageSizes(result);

    expect(size[0]).toBeCloseTo(841.89, 2);
    expect(size[1]).toBeCloseTo(1190.55, 2);
  });
});

describe('calculatePlacement', () => {
  test('contains the full content and centers the unused space', () => {
    expect(calculatePlacement(200, 100, 100, 100, 'contain')).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    });
  });

  test('covers the page and crops equal amounts from both sides', () => {
    expect(calculatePlacement(200, 100, 100, 100, 'cover')).toEqual({
      x: -50,
      y: 0,
      width: 200,
      height: 100,
    });
  });
});
