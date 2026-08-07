# Maintenance

This document collects routine maintenance tasks specific to `www.walde.se`.

## Inspect Paths And Engine Version

```sh
npm run norna:doctor
npm run norna:engine:version
```

`doctor` prints the resolved site directory, generated output paths, and
installed engine root. `norna:engine:version` prints the declared and installed engine
versions plus the installed Astro version.

## Update Norna

The engine dependency is pinned in `package.json` and locked in
`package-lock.json`.

To update to npm `latest` and run checks/build:

```sh
npm run norna:engine:update
```

To update to a specific published version:

```sh
npm run norna:engine:update -- 0.7.1
```

To inspect npm `latest` before updating:

```sh
npm run norna:engine:version -- --latest
```

Commit `package.json` and `package-lock.json` together. Commit generated image
manifest changes only when the build intentionally changes image output state.

## Generated Output Cleanup

Generated directories are ignored by Git:

- `site/.norna/public/`
- `dist/`
- `.astro/`
- `node_modules/`
- root `public/`

If local output looks stale, run:

```sh
npm run norna:build:local
```

## Agent Files

`AGENTS.md` contains coding-agent operating rules for this repository.
`CLAUDE.md` intentionally only points Claude-compatible tooling to
`AGENTS.md` so there is not a second, diverging agent manual.
