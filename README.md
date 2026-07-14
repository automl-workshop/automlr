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

## Notes

- Only `public/` ships; everything else stays in the repo.
- `wrangler.jsonc` is a dormant Cloudflare Worker kept as rollback, detached from the domain.
