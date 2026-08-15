import { describe, expect, test } from 'vitest';
import { addImagePage, addPdfPages, movePage, removePage } from '../src/model';
import type { PageRef } from '../src/model';

const ref = (fileId: string, pageIndex: number, kind: PageRef['kind'] = 'pdf'): PageRef => ({
  fileId,
  kind,
  pageIndex,
});

describe('addPdfPages', () => {
  test('appends one ref per page with sequential pageIndex', () => {
    const result = addPdfPages([], 'a', 3);
    expect(result).toEqual([ref('a', 0), ref('a', 1), ref('a', 2)]);
  });

  test('appends after existing pages without mutating input', () => {
    const existing = [ref('a', 0)];
    const result = addPdfPages(existing, 'b', 1);
    expect(result).toEqual([ref('a', 0), ref('b', 0)]);
    expect(existing).toEqual([ref('a', 0)]);
  });
});

describe('addImagePage', () => {
  test('appends a single image ref', () => {
    const result = addImagePage([ref('a', 0)], 'img1');
    expect(result).toEqual([ref('a', 0), ref('img1', 0, 'image')]);
  });
});

describe('removePage', () => {
  test('removes the ref at the given position', () => {
    const pages = [ref('a', 0), ref('a', 1), ref('b', 0)];
    expect(removePage(pages, 1)).toEqual([ref('a', 0), ref('b', 0)]);
  });
});

describe('movePage', () => {
  test('moves a ref forward', () => {
    const pages = [ref('a', 0), ref('a', 1), ref('b', 0)];
    expect(movePage(pages, 0, 2)).toEqual([ref('a', 1), ref('b', 0), ref('a', 0)]);
  });

  test('moves a ref backward', () => {
    const pages = [ref('a', 0), ref('a', 1), ref('b', 0)];
    expect(movePage(pages, 2, 0)).toEqual([ref('b', 0), ref('a', 0), ref('a', 1)]);
  });
});
