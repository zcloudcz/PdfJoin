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

## GEO a SEO (povinné)

- `index.html` musí mít `<html lang>`, `<title>` s názvem nástroje a tím, co dělá, `<meta name="description">` (120 až 160 znaků, jazyk UI), `<link rel="canonical">` na `https://pdf.zcloud.cz/` a `og:title`, `og:description`, `og:url`, `og:type`.
- V `<head>` drž JSON-LD `WebApplication` (name, url, applicationCategory, operatingSystem, browserRequirements, description, inLanguage, creator ZCLOUD https://zcloud.cz/; `isAccessibleForFree` a `offers` s cenou 0 jen pokud je nástroj zdarma bez registrace). Po změně ho ověř přes `json.loads`.
- Kořenový element aplikace obsahuje statický popis (2 až 4 věty), který vidí crawler bez JavaScriptu a aplikace ho při startu přepíše. Nemaž ho.
- `public/` obsahuje `robots.txt` (Allow: / + Sitemap), `sitemap.xml` a `llms.txt` (formát llmstxt.org). Při změně funkcí nebo soukromí aktualizuj popis, JSON-LD i `llms.txt` a `lastmod` v sitemapě.
- Tvrzení o soukromí (soubory zůstávají v prohlížeči) piš jen pokud to platí podle kódu.
- Ve viditelných textech a titulcích nepoužívej dlouhou pomlčku (U+2014); použij čárku, dvojtečku nebo `|`.
