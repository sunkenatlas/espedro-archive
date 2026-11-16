# GitHub Pages base path

Build the project site with `SITE_BASE_PATH=/espedro-archive/`. The trailing slash is normalized, so `/espedro-archive` works too. Omit the variable for a root-hosted site or the local preview.

The build applies this prefix only to the synchronous recovery script in `404.html`. GitHub Pages preserves the requested URL when serving this fallback, so the script calculates a relative base from the configured site prefix before CSS or JavaScript loads. A request to `/espedro-archive/entries/missing.html` therefore loads resources and recovery links from `/espedro-archive/`. Requests outside the configured prefix use the origin root, keeping local previews usable. The skip link keeps the requested document URL and query string.

Normal pages keep their existing relative links, image paths, JavaScript module imports, and catalogue return state. They do not receive a `<base>` element. The build also emits `.nojekyll` and `build-metadata.json`; the latter records the normalized prefix for `npm run check`.

Verification covers root hosting, the project prefix, an encoded directory name, missing pages at multiple depths, trailing directory URLs, local preview fallback, and the skip link. Before deployment run:

```powershell
npm test
$env:SITE_BASE_PATH = '/espedro-archive/'
npm run build
npm run check
Remove-Item Env:SITE_BASE_PATH
```

Rebuild without the variable when returning to the default local preview. No npm dependencies are needed.
