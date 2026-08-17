// DOM construction and rendering. Stateless — everything renders from the
// arguments it gets, state itself lives in main.ts.

import type { PageRef } from './model';

export interface FileError {
  fileName: string;
  message: string;
}

export interface Layout {
  dropzone: HTMLElement;
  fileInput: HTMLInputElement;
  errorList: HTMLElement;
  grid: HTMLElement;
  fileNameInput: HTMLInputElement;
  pageSizeSelect: HTMLSelectElement;
  fitSelect: HTMLSelectElement;
  fitField: HTMLElement;
  mergeButton: HTMLButtonElement;
  status: HTMLElement;
}

export function buildLayout(root: HTMLElement): Layout {
  root.innerHTML = `
    <header class="masthead">
      <h1 class="wordmark">Pdf<span>Join</span></h1>
      <p class="tagline">Spojte PDF a obrázky do jednoho souboru. Vše zůstává ve vašem prohlížeči.</p>
    </header>

    <section class="dropzone" id="dropzone">
      <p class="dropzone-hint">Přetáhněte sem PDF, JPG nebo PNG</p>
      <button type="button" class="pick-button" id="pick-button">Vybrat soubory</button>
      <input type="file" id="file-input" multiple hidden
             accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" />
    </section>

    <ul class="error-list" id="error-list"></ul>

    <section class="grid" id="grid" aria-label="Stránky výsledného PDF"></section>

    <footer class="action-bar">
      <label class="filename-field">
        <span>Název souboru</span>
        <input type="text" id="filename" value="joined.pdf" spellcheck="false" />
      </label>
      <label class="option-field">
        <span>Formát stránek</span>
        <select id="page-size">
          <option value="original">Původní</option>
          <option value="a4">A4</option>
          <option value="a3">A3</option>
        </select>
      </label>
      <label class="option-field" id="fit-field" hidden>
        <span>Přizpůsobení</span>
        <select id="content-fit">
          <option value="contain">Celý obsah</option>
          <option value="cover">Vyplnit stránku</option>
        </select>
      </label>
      <button type="button" class="merge-button" id="merge-button" disabled>Sloučit</button>
      <p class="status" id="status" role="status"></p>
    </footer>
  `;

  const layout: Layout = {
    dropzone: root.querySelector('#dropzone')!,
    fileInput: root.querySelector('#file-input')!,
    errorList: root.querySelector('#error-list')!,
    grid: root.querySelector('#grid')!,
    fileNameInput: root.querySelector('#filename')!,
    pageSizeSelect: root.querySelector('#page-size')!,
    fitSelect: root.querySelector('#content-fit')!,
    fitField: root.querySelector('#fit-field')!,
    mergeButton: root.querySelector('#merge-button')!,
    status: root.querySelector('#status')!,
  };

  root.querySelector('#pick-button')!.addEventListener('click', () => layout.fileInput.click());
  layout.pageSizeSelect.addEventListener('change', () => {
    layout.fitField.hidden = layout.pageSizeSelect.value === 'original';
  });
  return layout;
}

export function renderErrors(errorList: HTMLElement, errors: readonly FileError[]): void {
  errorList.innerHTML = '';
  for (const err of errors) {
    const li = document.createElement('li');
    li.textContent = `${err.fileName}: ${err.message}`;
    errorList.appendChild(li);
  }
}

export function renderGrid(
  grid: HTMLElement,
  pages: readonly PageRef[],
  fileNames: ReadonlyMap<string, string>,
  thumbs: ReadonlyMap<string, string>,
  onDelete: (index: number) => void,
): void {
  grid.innerHTML = '';
  pages.forEach((page, index) => {
    const tile = document.createElement('article');
    tile.className = 'tile';

    const thumbKey = `${page.fileId}:${page.pageIndex}`;
    const thumbUrl = thumbs.get(thumbKey);
    if (thumbUrl) {
      const img = document.createElement('img');
      img.src = thumbUrl;
      img.alt = '';
      img.draggable = false;
      tile.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'tile-placeholder';
      tile.appendChild(placeholder);
    }

    const order = document.createElement('span');
    order.className = 'tile-order';
    order.textContent = String(index + 1);
    tile.appendChild(order);

    const name = document.createElement('span');
    name.className = 'tile-name';
    const fileName = fileNames.get(page.fileId) ?? '';
    name.textContent = page.kind === 'pdf' ? `${fileName} · str. ${page.pageIndex + 1}` : fileName;
    name.title = name.textContent;
    tile.appendChild(name);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'tile-delete';
    del.textContent = '×';
    del.setAttribute('aria-label', `Odebrat stránku ${index + 1}`);
    del.addEventListener('click', () => onDelete(index));
    tile.appendChild(del);

    grid.appendChild(tile);
  });
}

export function updateMergeButton(button: HTMLButtonElement, pageCount: number): void {
  button.disabled = pageCount === 0;
  if (pageCount === 0) {
    button.textContent = 'Sloučit';
  } else if (pageCount === 1) {
    button.textContent = 'Sloučit 1 stránku';
  } else if (pageCount < 5) {
    button.textContent = `Sloučit ${pageCount} stránky`;
  } else {
    button.textContent = `Sloučit ${pageCount} stránek`;
  }
}
