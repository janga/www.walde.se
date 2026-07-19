# www.walde.se

This repository contains the site-specific source for
[`https://www.walde.se/`](https://www.walde.se/), Karin Walde's official
single-page artist site.

The reusable gallery engine lives in
[`janga/cli-gallery`](https://github.com/janga/cli-gallery). This repository
does not own engine code; it owns content, images, domain files, site
configuration, and deployment state for `www.walde.se`.

## Mental Model

The split between the two repositories is:

- `cli-gallery`: reusable CLI, Astro renderer, validation scripts, image
  pipeline, local dev wrapper, and deploy helpers.
- `www.walde.se`: site content, original images, static public files, GitHub
  Pages workflow, and the pinned engine dependency.

The npm scripts in this repository are thin aliases around `cli-gallery`. Use
`npm run doctor` when you want to confirm which engine package, site directory,
output directories, and generated manifest a command will use.

## Quick Start

Install dependencies:

```sh
npm install
```

Start local development:

```sh
npm run dev:local
```

Validate and build:

```sh
npm run config:check
npm run content:check
npm run build
```

The local dev server runs at:

```text
http://localhost:4321/
```

Manage it with:

```sh
npm run dev:status
npm run dev:logs
npm run dev:restart
npm run dev:stop
```

## Repository Structure

Site-owned source files:

- `site/config.mjs`: technical site configuration.
- `site/content.md`: editable page content, section order, gallery rows, alt
  text, and captions.
- `site/images/<section-id>/`: original source images for each section.
- `site/public/`: versioned static files copied into the published site.
- `site/.cli-gallery/generated-images.json`: generated image manifest used to
  reuse WebP variants between builds.

Repository control files:

- `package.json`: site commands and pinned `@janga/cli-gallery` dependency.
- `package-lock.json`: exact dependency lock for local builds and GitHub
  Actions.
- `.github/workflows/deploy.yml`: site-owned GitHub Pages deployment workflow.
- `AGENTS.md`: operating rules for coding agents working in this repository.

Generated or local-only files:

- `site/.cli-gallery/public/`: build-preparation output copied from
  `site/public/`, plus generated images.
- `public/`: legacy build-preparation output from older engine versions.
- `dist/`: final static build output.
- `.astro/`: Astro cache and dev-server state.
- `node_modules/`: installed dependencies.

These generated directories are ignored by Git.

## Current Site Settings

Important values are configured in `site/config.mjs`:

| Setting | Value |
| --- | --- |
| Public URL | `https://www.walde.se/` |
| GitHub repository | `janga/www.walde.se` |
| Deploy branch | `main` |
| Pages workflow | `Deploy to GitHub Pages` |
| Site directory | default `site/` |
| Custom domain file | `site/public/CNAME` |
| Engine package | `git+https://github.com/janga/cli-gallery.git#v0.1.6` |
| Missing image metadata policy | warn, do not fail |

If the public URL or custom domain changes, update these files together:

- `site/config.mjs`
- `site/public/CNAME`
- `site/public/robots.txt`
- `site/public/sitemap.xml`

## Content

The site is one static page. Editable content, section order, gallery rows,
captions, and alt text live in `site/content.md`.

Each section must keep these values aligned:

- the frontmatter section `id`
- the Markdown heading id, for example `## Min konst {#min-konst}`
- the source image directory under `site/images/<section-id>/`

The frontmatter `sections` list is the source of truth for section order. Run
`npm run content:sync` after changing that order so the Markdown sections are
rewritten to match it.

Section presentation is configured in frontmatter. `defaultPresentation`
defines heading and body defaults for sections that do not need custom layout,
while `sections[].presentation` contains any section-specific overrides. The
first section, `karin-walde`, overrides only the heading size.

Run this after editing content or gallery references:

```sh
npm run content:check
```

Run this after moving gallery rows between sections:

```sh
npm run content:sync
```

`content:sync` can move source image files into the section directory that
matches their gallery row.

## Images And Metadata

Original images live under `site/images/<section-id>/`. Only images referenced
from `site/content.md` are rendered.

Generated WebP variants are written under
`site/.cli-gallery/public/images/generated/` during build. That output is not
versioned. The manifest at
`site/.cli-gallery/generated-images.json` is versioned site state and lets local
builds and GitHub Actions reuse generated variants when source images have not
changed.

For this site, `npm run metadata:fix` writes missing source-image metadata based
on:

```text
copyrightOwner: Karin Walde
```

The intended metadata values are:

```text
Artist / Creator / By-line: Karin Walde
Copyright / Rights / CopyrightNotice: Copyright Karin Walde. All rights reserved.
Credit / Owner: Karin Walde
Marked: True
```

Builds and deploys warn when referenced source images lack copyright or creator
metadata. They do not fail because metadata is missing and do not write metadata
automatically.

Run metadata fixing only when source images should intentionally receive
copyright metadata:

```sh
npm run metadata:fix
npm run build
```

Commit any source images changed by `metadata:fix`.

## Static Public Files

These files are specific to `www.walde.se` and should be versioned:

```text
site/public/CNAME
site/public/robots.txt
site/public/sitemap.xml
site/public/favicon.ico
site/public/favicon.svg
```

`npm run site:public` copies files from `site/public/` into
`site/.cli-gallery/public/`. Astro then copies `site/.cli-gallery/public/` into
`dist/` during build.

`site/.cli-gallery/public/` is generated build-preparation output. Keep source
files in `site/public/`. Root `public/` is only legacy local output from older
engine versions and can be removed.

## Engine Version

This site pins the engine dependency in `package.json`:

```json
"@janga/cli-gallery": "git+https://github.com/janga/cli-gallery.git#v0.1.6"
```

To update the engine:

1. Change the tag in `package.json`.
2. Run `npm install`.
3. Run `npm run config:check`.
4. Run `npm run content:check`.
5. Run `npm run build`.
6. Commit `package.json` and `package-lock.json`.

Use HTTPS in the dependency string so GitHub Actions can install the package
without SSH credentials.

## Deploying

The GitHub Pages workflow belongs to this repository because the deploy target,
custom domain, static public files, and repository settings are site-specific.

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

After pushing directly to `main`, monitor the Pages workflow with:

```sh
npm run deploy:watch
```

Manual GitHub CLI checks:

```sh
gh run list --repo janga/www.walde.se --branch main --limit 3
gh run view RUN_ID --repo janga/www.walde.se --log-failed
```

## Troubleshooting

Inspect resolved paths and package version:

```sh
npm run doctor
```

If local preview shows stale content or images:

```sh
npm run build:local
```

If content validation reports unreferenced images, either reference them from
`site/content.md` or leave them intentionally unmounted. Do not commit new
unreferenced source images unless that is deliberate.

For engine behavior, implementation details, or reusable workflow
documentation, see the `cli-gallery` repository.
