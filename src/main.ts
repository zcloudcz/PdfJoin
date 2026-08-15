import '@fontsource/archivo-black';
import Sortable from 'sortablejs';
import { getPdfPageCount, mergePdf } from './merge';
import type { SourceFile } from './merge';
import { addImagePage, addPdfPages, movePage, removePage } from './model';
import type { PageRef } from './model';
import { imageThumbnailUrl, renderPdfThumbnails } from './thumbnails';
import { buildLayout, renderErrors, renderGrid, updateMergeButton } from './ui';
import type { FileError } from './ui';
import './style.css';

interface StoredFile extends SourceFile {
  name: string;
}

let pages: PageRef[] = [];
const files = new Map<string, StoredFile>();
const thumbs = new Map<string, string>();
const errors: FileError[] = [];

const layout = buildLayout(document.querySelector<HTMLElement>('#app')!);

function render(): void {
  renderErrors(layout.errorList, errors);
  renderGrid(layout.grid, pages, fileNameMap(), thumbs, (index) => {
    pages = removePage(pages, index);
    render();
  });
  updateMergeButton(layout.mergeButton, pages.length);
}

function fileNameMap(): Map<string, string> {
  return new Map([...files].map(([id, f]) => [id, f.name]));
}

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png']);

function mimeOf(file: File): string {
  if (file.type) return file.type;
  // Fallback for drops where the OS supplies no mime type.
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return '';
}

async function addFile(file: File): Promise<void> {
  const mime = mimeOf(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const id = crypto.randomUUID();

  if (mime === 'application/pdf') {
    let pageCount: number;
    try {
      pageCount = await getPdfPageCount(bytes);
    } catch {
      errors.push({ fileName: file.name, message: 'soubor nelze načíst (poškozené nebo šifrované PDF).' });
      return;
    }
    files.set(id, { kind: 'pdf', bytes, name: file.name });
    pages = addPdfPages(pages, id, pageCount);
    render();
    // Thumbnails arrive after the tiles — placeholders show meanwhile.
    try {
      const urls = await renderPdfThumbnails(bytes);
      urls.forEach((url, i) => thumbs.set(`${id}:${i}`, url));
    } catch {
      // Merging still works without thumbnails; tiles keep their placeholder.
    }
    render();
  } else if (IMAGE_MIMES.has(mime)) {
    try {
      // Cheap validity check — corrupt images fail here instead of at merge time.
      (await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }))).close();
    } catch {
      errors.push({ fileName: file.name, message: 'obrázek nelze načíst (poškozený soubor).' });
      return;
    }
    files.set(id, { kind: 'image', bytes, mime, name: file.name });
    thumbs.set(`${id}:0`, imageThumbnailUrl(bytes, mime));
    pages = addImagePage(pages, id);
    render();
  } else {
    errors.push({ fileName: file.name, message: 'nepodporovaný typ souboru (podporujeme PDF, JPG a PNG).' });
  }
}

async function addFiles(list: FileList | File[]): Promise<void> {
  errors.length = 0;
  for (const file of Array.from(list)) {
    await addFile(file);
  }
  render();
}

layout.fileInput.addEventListener('change', () => {
  if (layout.fileInput.files?.length) {
    void addFiles(layout.fileInput.files);
    layout.fileInput.value = '';
  }
});

// Drop works anywhere on the page; the dropzone just highlights it.
// Only react to OS file drags — reordering tiles also fires drag events.
window.addEventListener('dragover', (e) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault();
  layout.dropzone.classList.add('dropzone-active');
});
window.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null) layout.dropzone.classList.remove('dropzone-active');
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  layout.dropzone.classList.remove('dropzone-active');
  if (e.dataTransfer?.files.length) void addFiles(e.dataTransfer.files);
});

new Sortable(layout.grid, {
  animation: 150,
  ghostClass: 'tile-ghost',
  // Mouse/touch fallback instead of native HTML5 drag & drop — behaves the
  // same on desktop and mobile and doesn't collide with the file-drop zone.
  forceFallback: true,
  onEnd: (evt) => {
    if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
    pages = movePage(pages, evt.oldIndex, evt.newIndex);
    // Re-render from state so the DOM and the page list never drift apart.
    render();
  },
});

layout.mergeButton.addEventListener('click', () => void merge());

async function merge(): Promise<void> {
  layout.mergeButton.disabled = true;
  layout.status.textContent = 'Slučuji…';
  try {
    const bytes = await mergePdf(pages, files);
    const name = layout.fileNameInput.value.trim() || 'joined.pdf';
    const fileName = name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    layout.status.textContent = `Hotovo — ${fileName} stažen.`;
  } catch {
    layout.status.textContent = 'Sloučení selhalo. Zkuste soubory přidat znovu.';
  } finally {
    updateMergeButton(layout.mergeButton, pages.length);
  }
}

render();
