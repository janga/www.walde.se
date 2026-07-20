# Maintenance

This document collects routine maintenance tasks specific to `www.walde.se`.

## Inspect Paths And Engine Version

```sh
npm run doctor
```

This prints the resolved site directory, generated output paths, and installed
engine root.

## Update cli-gallery

The engine dependency is pinned in `package.json` and locked in
`package-lock.json`.

To update it:

1. Change the `@janga/cli-gallery` tag in `package.json`.
2. Run `npm install`.
3. Keep the dependency URL in HTTPS form so GitHub Actions can install it
   without SSH credentials.
4. Run:

```sh
npm run config:check
npm run content:check
npm run build
```

Commit `package.json` and `package-lock.json` together. Commit generated image
manifest changes only when the build intentionally changes image output state.

## Generated Output Cleanup

Generated directories are ignored by Git:

- `site/.cli-gallery/public/`
- `dist/`
- `.astro/`
- `node_modules/`
- root `public/`

If local output looks stale, run:

```sh
npm run build:local
```

## Agent Files

`AGENTS.md` contains coding-agent operating rules for this repository.
`CLAUDE.md` intentionally only points Claude-compatible tooling to
`AGENTS.md` so there is not a second, diverging agent manual.
