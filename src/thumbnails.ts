import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** CSS width of a grid tile; rendered 2x for sharp thumbnails on hi-dpi screens. */
const THUMB_WIDTH = 320;

/** Renders every page of a PDF to a data URL, in page order. */
export async function renderPdfThumbnails(bytes: Uint8Array): Promise<string[]> {
  // pdf.js transfers the buffer to its worker and detaches it — pass a copy
  // so the original bytes stay usable for the pdf-lib merge later.
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  try {
    const urls: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      // intent 'print' makes pdf.js chunk the work via setTimeout instead of
      // requestAnimationFrame — display-intent rendering stalls indefinitely
      // in background tabs because rAF stops firing there.
      await page.render({
        canvas: null,
        canvasContext: canvas.getContext('2d')!,
        viewport,
        intent: 'print',
      }).promise;
      urls.push(canvas.toDataURL('image/jpeg', 0.8));
      page.cleanup();
    }
    return urls;
  } finally {
    await task.destroy();
  }
}

/** Object URL for an image thumbnail — the browser decodes it natively. */
export function imageThumbnailUrl(bytes: Uint8Array, mime: string): string {
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
}
