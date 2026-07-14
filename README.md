# Hello World

A framework-free workshop site deployed on Vercel.

Pushes to `main` automatically deploy the site to production via Vercel. There
is no build step — `vercel.json` sets `outputDirectory` to `public/`, so Vercel
serves those static assets as-is (with `cleanUrls` enabled). The production site
is available at <https://automlr.com> (with `www.automlr.com` redirecting to the
apex).

Only files in `public/` are deployed as website assets. Proposal sources and
other project files remain private to the repository or local workspace.

The old Cloudflare Worker (`wrangler.jsonc`) is retained dormant as a rollback
fallback and is no longer attached to the domain.
