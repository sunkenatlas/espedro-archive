# Espedro 2.0 implementation

Approved direction: cinematic investigation archive, charcoal/gray-white/muted red, large photographs, short entrance followed by searchable catalogue, independent detail pages. All output stays inside this directory. Original story and image folder are read-only. No entries without source images. No deployment to or modification of the existing website.

## Contracts

- `data/entities.json`: array of 35 entities, in source image number order.
- Entity: `{id, number, slug, name, english, taxonomy, family, kind, disposition, intelligence, tags: string[], locations: string[], quote, quoteSource, summary, appearance: string[], behavior: string[], response: string[], rules: [{title, ref, text, note}], notes: [{title,text}], sourceExcerpts: [{title,text: string[]}], related: string[], layout}`.
- IDs are EA-001 through EA-035; slug is lowercase id. Roman taxonomy remains distinct. layout is standard, monumental or document.
- `data/images.json`: flat array of all 42 images. Image: `{id,entityId,number,filename,version,primary,original,display,thumb,width,height,displayWidth,displayHeight,bytes,sha256,sourceType,sourceLabel,sourceEnglish}`. Paths are root-relative without a leading slash. id is lowercase `ea-001-01`; entityId is uppercase `EA-001`. Primary is exactly one image per entity. Source type is civilian/dashcam/cctv/bodycam/military/document/field. Avoid fictional real provenance or timestamps.
- Assets: `assets/originals/`, `assets/images/`, `assets/thumbs/`. Originals copied intact, transformed assets never overwrite source images.
- Browser image data in `script#image-data[type="application/json"]` uses same schema, with original/display/thumb rebased to current page. Trigger is `button[data-viewer="ea-001-01"]`.
- `src/viewer.js` exports `initViewer(images)`; creates its own dialog DOM and event handlers. `src/viewer.css` owns `.viewer-*` styles and may use --ink, --muted, --line, --accent CSS variables. Shared JS calls initViewer after DOM exists.
- Templates and browser assets owned by root. Generator creates `dist/index.html`, `dist/entries/ea-001.html` through ea-035.html, `dist/about.html`, `dist/404.html`, `dist/assets/` and `_headers`. All links rebased relative to page location.
- Node static generator, no runtime framework/CDN/API/backend. Node local server. Browser CSS/ES modules; native View Transitions with graceful fallback, IntersectionObserver, Web Animations where appropriate. Local/system fonts.

## Content policy

Source DOCX is authoritative. Original quotations must be exact excerpts with an identifiable source. Editorial synthesis and original-compatible supplements are allowed, but supplements appear under 调查补记/研判. No complete invented letter risk taxonomy. Do not treat neutral as safe. Group names 手指/天空/翅膀/四肢 only classify; 拇指 has no entry. Missing source documents must not become fabricated source links.

## Progress

- [x] Structured content and original references — source review approved, 35 entries / 88 exact rules / 35 supplementary notes
- [x] All 42 images copied, optimized and indexed — asset review approved, originals intact
- [x] Homepage, catalogue, 35 dossiers and about page — 38 static pages including custom404
- [x] Accessible zoom/pan/pinch/fullscreen viewer — keyboard/drag/close verified in browser, native fullscreen fallback verified
- [x] Functional checks and content/link audit — 18 tests, 872 local links/assets, 37 live200 pages + nested404
- [x] Desktop/mobile visual review and documentation — 375/390/768/1440/1920 widths, eight screenshots, README and Windows launcher

Final review fixes: fullscreen target/ownership, asynchronous modal close cleanup, end-of-gallery focus, nested404 asset and skip-link recovery, shared chapter anchor offset, mobile photograph ordering. See verification.md for evidence and limits.
