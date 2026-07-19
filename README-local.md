# Karin Walde Site Notes

This file contains notes for the current Karin Walde site. See
[`README.md`](./README.md) for the reusable project model, commands, validation
rules, and deploy workflow.

## Current Site

- Public URL: `https://www.walde.se/`
- GitHub repository: `janga/www.walde.se`
- Deploy branch: `main`
- GitHub Pages workflow: `Deploy to GitHub Pages`
- Site source directory: default `site/` (`CLI_GALLERY_SITE_DIR` is not set)
- Custom domain file: `site/public/CNAME`

The public URL, GitHub repository, deploy branch, and workflow name are defined
in `site/config.mjs`.

The site is a single Astro page for Karin Walde. Editable content, section
order, gallery rows, captions, and alt text live in `site/content.md`.

## Local Configuration

Current important values in `site/config.mjs`:

- `CLI_GALLERY_SITE_DIR`: unset, so the default `site/` directory is used
- `site.url`: `https://www.walde.se/`
- `github.repo`: `janga/www.walde.se`
- `github.branch`: `main`
- `github.pagesWorkflow`: `Deploy to GitHub Pages`
- `navigation.smoothScroll.enabled`: `true`
- `navigation.smoothScroll.minimumDurationMs`: `2_000`
- `navigation.smoothScroll.maximumDurationMs`: `4_000`
- `navigation.smoothScroll.durationPerPixelMs`: `0.22`
- `images.requireCopyrightMetadata`: `true`
- `footer.copyrightMessage`: Karin-specific copyright sentence
- `footer.buildInfo.enabled`: `true`
- `footer.buildInfo.text`: `Byggd`
- `footer.buildInfo.dateTimeFormat.locale`: `sv-SE`
- `footer.buildInfo.dateTimeFormat.timeZone`: `Europe/Stockholm`

If the public URL or custom domain changes, update these files together:

- `site/config.mjs`
- `site/public/CNAME`
- `site/public/robots.txt`
- `site/public/sitemap.xml`

## Content Sections

The current frontmatter sections in `site/content.md` are:

```text
karin-walde
runrondellerna
min-konst
om-mig
mitt-hem
```

Each section id must match:

- the frontmatter section `id`
- the Markdown heading id, for example `## Min konst {#min-konst}`
- the source image directory under `site/images/<section-id>/`

Current source image directories:

```text
site/images/karin-walde/
site/images/runrondellerna/
site/images/min-konst/
site/images/om-mig/
site/images/mitt-hem/
```

`site/images/om-mig/` may be absent when the section has no gallery images.

## Image Metadata

For the Karin Walde site, `npm run metadata:fix` writes missing image metadata
based on `copyrightOwner: Karin Walde` in `site/content.md`.

`images.requireCopyrightMetadata` is currently `true`, so `npm run build` fails
when a referenced source image lacks creator/artist metadata.

The intended metadata values are:

```text
Artist / Creator / By-line: Karin Walde
Copyright / Rights / CopyrightNotice: Copyright Karin Walde. All rights reserved.
Credit / Owner: Karin Walde
Marked: True
```

Run metadata fixing only when new source images need copyright metadata or when
the build reports missing creator/artist metadata:

```sh
npm run metadata:fix
npm run build
```

Commit any source images changed by `metadata:fix`.

## Local Preview

Use the project wrapper:

```sh
npm run dev:local
```

It starts Astro at:

```text
http://localhost:4321/
```

Manage the background server with:

```sh
npm run dev:status
npm run dev:logs
npm run dev:restart
npm run dev:stop
```

## Deploying This Site

The normal publishing path is:

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

Manual GitHub CLI checks for this site:

```sh
gh run list --repo janga/www.walde.se --branch main --limit 3
gh run view RUN_ID --repo janga/www.walde.se --log-failed
```

## Site-Specific Static Files

These files are specific to `www.walde.se`:

```text
site/public/CNAME
site/public/robots.txt
site/public/sitemap.xml
site/public/favicon.ico
site/public/favicon.svg
```

Files under `site/public/` are copied into Astro's root `public/` directory
before build, and then into `dist/` by Astro.

## File Inventory

There is no standalone `MANIFEST` file in this repository. The general file map
is maintained in [`README.md`](./README.md). For exact current files, use:

```sh
rg --files
```
