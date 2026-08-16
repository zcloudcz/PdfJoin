# PdfJoin

Client-side web app for merging PDFs and images (JPG/PNG) into one PDF.
Everything runs in the browser — no backend, files never leave the machine.

## Stack

- Vite + TypeScript, vanilla (no framework)
- `pdf-lib` — merging, embedding images
- `pdfjs-dist` — page thumbnail rendering (canvas)
- `sortablejs` — drag & drop reorder of the page grid
- Vitest — unit tests on pure logic (`src/model.ts`, `src/merge.ts`)

## Commands

- `npm run dev` — dev server
- `npm run test` — vitest run
- `npm run build` — typecheck + production build (output `dist/`)

## Conventions

- UI texts in Czech, code and comments in English.
- Core state is `PageRef[]` (see `src/model.ts`); UI and merge both operate on it.
  Source file bytes live in a `fileId → bytes` map, never inside PageRef.
- `model.ts` and `merge.ts` stay DOM-free so they run under Vitest in Node.
- Tests use real PDFs generated with pdf-lib in the test itself — no mocks.

## Deploy

GitHub Pages via Actions (`.github/workflows/deploy.yml`). Push to `master`
deploys. Live on the custom domain **pdf.zcloud.cz** — served from the root, so
`base` in `vite.config.ts` is `/`, and `public/CNAME` pins the domain across
redeploys. DNS: `pdf` CNAME → `zcloudcz.github.io` (zone zcloud.cz at Wedos).
