# Site Overview

This repository owns the concrete `www.walde.se` site. It does not contain the
reusable renderer or CLI implementation; those come from the pinned
`@janga/cli-gallery` dependency in `package.json` and `package-lock.json`.

## Repository Responsibilities

This repository owns:

- Karin Walde's site content in `site/content.md`.
- Original source images in `site/images/<section-id>/`.
- Site-specific static public files in `site/public/`.
- Technical site configuration in `site/config.mjs`.
- Generated image manifest state in `site/.cli-gallery/generated-images.json`.
- The GitHub Pages workflow in `.github/workflows/deploy.yml`.
- Copyright and usage policy in `COPYRIGHT.md`.

The `cli-gallery` engine owns:

- CLI command behavior.
- Content and config validation logic.
- Astro rendering components and styles.
- Generated image pipeline.
- Local preview helpers.
- Generic build, deploy, and deploy-watch helpers.

## Versioned And Generated Files

Versioned site source:

- `site/config.mjs`
- `site/content.md`
- `site/images/`
- `site/public/`
- `site/.cli-gallery/generated-images.json`
- `.github/workflows/deploy.yml`
- `package.json`
- `package-lock.json`

Generated or local-only output:

- `site/.cli-gallery/public/`
- `dist/`
- `.astro/`
- `node_modules/`
- root `public/` from older engine versions

The generated directories are ignored by Git. Do not edit them as source files.

## Public Content Language

The public artist text in `site/content.md` is Swedish and should not be
rewritten, translated, or stylistically edited as part of technical maintenance.
Technical documentation in this repository is in English.
