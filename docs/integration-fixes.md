# Final integration fixes

## Missing nested routes

The local server and Netlify return the generated `404.html` while preserving the unknown request URL. Previously, relative assets and recovery links consequently resolved below `/entries/` (or another missing directory).

The 404 shell now inserts a synchronous head script before asset tags. It creates a relative `<base>` pointing back to the hosting root based on the requested pathname depth, including trailing-slash routes. Normal pages retain their existing portable relative links. No domain is embedded and no server-only rewrite is required.

After DOM ready, the same 404-only script resolves the skip link against the actual document URL. Its path and query string are preserved and its fragment becomes `#main`, so the recovery base cannot send keyboard users to the homepage instead.

## Dossier chapter navigation

Scroll padding and section margins previously accumulated to 232px on desktop and 245px on mobile. Meanwhile, the active chapter used 35% of viewport height, which could select a previous or following chapter depending on viewport size.

CSS now defines a single `--anchor-offset`: 112px on desktop and 145px below 600px. Root scroll padding uses that value and sections have zero scroll margin. The chapter selection reads the same computed property with a 2px tolerance.

## Mobile opening sequence

Below 600px, the existing heading wrapper uses `display:contents` and flex ordering to show archive identity, name, English name and quotation, then the primary image and alternate images, followed by summary, tags and metadata. Spacing is explicit between those groups. This applies consistently to standard, monumental and document dossiers while preserving desktop layout.

## Verification

- Before production changes, the four new regression tests failed for the expected causes: nested assets resolved under `/entries/`, the shared offset was absent, and both TOC viewport scenarios selected the following chapter.
- A further skip-link regression first failed because `/404.html?q=missing#main` resolved to `/#main`. It now executes the actual head script and DOM-ready callback for deployed and local-server URLs, checking that path, query and same-page fragment are preserved.
- `node --test tests/integration.test.mjs tests/catalogue.test.mjs`: 8 passed, 0 failed.
- The 404 regression executes the actual generated head script in a Node VM with a minimal document and validates CSS, modules, icon and recovery URLs for root, nested and trailing-slash paths. It also checks that the script precedes assets and ordinary pages do not receive it.
- The chapter regression executes the actual `updateScroll` function against mobile and desktop geometry, checking `aria-current` on the aligned chapter.
- `npm run build`: 35 dossiers plus homepage, about and 404; all 42 images retained.
- `npm run check`: 38 pages, 872 local links/assets and generated nested-404 recovery checks passed.
- Browser responsive, anchor and mobile opening QA is performed separately by the main task.
