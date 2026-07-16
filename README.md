# automlr.com

Static one-page site for the **Workshop for Autonomous Machine Learning Research** (NeurIPS 2026, Sydney).

No build step, no framework — just `public/index.html` + `public/styles.css`.

## Deploy

Manual, via the Vercel CLI from the repo root (no auto-deploy on push):

```sh
vercel          # preview URL to check first
vercel --prod   # promote to production
```

- Live: <https://automlr.com> (`www` → apex)
- Config: `vercel.json` (`outputDirectory: public`, `cleanUrls`)

## Local preview

```sh
python3 -m http.server -d public 8000   # http://localhost:8000
```

## Visual copy editor

Edit the website copy directly on the rendered page:

```sh
npm install
npm run edit                         # http://localhost:4174
```

Outlined text is editable. The **Save to index.html** button (or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>S</kbd>) writes only changed copy back to `public/index.html`. This editor is local tooling and is not included in the deployed `public/` directory.

Compare colour palettes on the real page without changing site files:

```sh
npm run colors                       # http://localhost:4175
```

Compare complete type systems without changing site files:

```sh
npm run fonts                        # http://localhost:4176
```

Explore animated ASCII concepts without changing site files:

```sh
npm run ascii                        # http://localhost:4177
```

## Notes

- Only `public/` ships; everything else stays in the repo.
- `wrangler.jsonc` is a dormant Cloudflare Worker kept as rollback, detached from the domain.
