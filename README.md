# www.walde.se

This repository contains the site-specific source for
[`https://www.walde.se/`](https://www.walde.se/). The reusable gallery engine
lives in [`janga/cli-gallery`](https://github.com/janga/cli-gallery) and is
used here through the `@janga/cli-gallery` package.

## Structure

The site-owned files are:

- `site/config.mjs`: public URL, GitHub repository, deploy branch, Pages
  workflow name, footer settings, navigation timing, and image metadata policy.
- `site/content.md`: page sections, section order, gallery image references,
  alt text, captions, and editable body text.
- `site/images/<section-id>/`: original source images.
- `site/public/`: versioned static files such as `CNAME`, `robots.txt`,
  `sitemap.xml`, and favicons.
- `site/.cli-gallery/generated-images.json`: site-specific generated image
  manifest used to reuse generated WebP variants between builds.

Root `public/`, `dist/`, and `.astro/` are build output or build-preparation
state and are ignored by Git.

## Commands

Install dependencies:

```sh
npm install
```

Run locally:

```sh
npm run dev:local
```

Validate and build:

```sh
npm run config:check
npm run content:check
npm run build
```

Inspect which site directory and engine package a command will use:

```sh
npm run doctor
```

The npm scripts are thin aliases around `cli-gallery`. The selected site
directory defaults to `site/`; set `CLI_GALLERY_SITE_DIR` or pass
`cli-gallery --site-dir <path> ...` before the command to use another site
directory.

## Image Metadata

Builds and deploys warn when referenced source images lack copyright or creator
metadata, but they do not fail and do not write metadata automatically.

Run this only when source images should be tagged intentionally:

```sh
npm run metadata:fix
```

Commit any source images changed by `metadata:fix`.

## Updating The Engine

This site pins the engine dependency in `package.json`:

```json
"@janga/cli-gallery": "git+https://github.com/janga/cli-gallery.git#v0.1.2"
```

To update, change the tag, run `npm install`, run the validation/build commands,
and commit the resulting `package.json` and `package-lock.json` changes.

## Deploying

The GitHub Pages workflow belongs to this repository because the deploy target,
domain files, and repository settings are site-specific.

Normal publishing flow:

```sh
npm run config:check
npm run content:check
npm run build
git status --short
git diff
git add ...
git commit -m "Describe the change"
npm run deploy
npm run deploy:watch
```

See [`README-local.md`](./README-local.md) for current Karin Walde site notes.
