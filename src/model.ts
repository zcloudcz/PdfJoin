// Pure page-list logic, DOM-free so it runs under Vitest in Node.
// The whole app state is a PageRef[]; source file bytes live elsewhere
// (fileId → bytes map) so reordering never copies document data.

export type PageKind = 'pdf' | 'image';

export interface PageRef {
  fileId: string;
  kind: PageKind;
  /** 0-based page index within the source PDF; always 0 for images. */
  pageIndex: number;
}

export function addPdfPages(pages: readonly PageRef[], fileId: string, pageCount: number): PageRef[] {
  const added: PageRef[] = [];
  for (let i = 0; i < pageCount; i++) {
    added.push({ fileId, kind: 'pdf', pageIndex: i });
  }
  return [...pages, ...added];
}

export function addImagePage(pages: readonly PageRef[], fileId: string): PageRef[] {
  return [...pages, { fileId, kind: 'image', pageIndex: 0 }];
}

export function removePage(pages: readonly PageRef[], index: number): PageRef[] {
  return pages.filter((_, i) => i !== index);
}

export function movePage(pages: readonly PageRef[], from: number, to: number): PageRef[] {
  const result = [...pages];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}
