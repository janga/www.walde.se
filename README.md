# Karin Walde Website

This repository contains the current Astro implementation of the Karin Walde
website. It is a static, single-page artist site where the editable site
content, section order, gallery references, image alt text, and captions are
managed from one Markdown file:

```text
content/site.md
```

The code is optimized for a simple publishing workflow: edit the Markdown and
source images, validate the content, build optimized image variants, deploy to
GitHub Pages, and optionally monitor the Pages workflow until it completes.

`README.md` is the human-facing project manual for using and maintaining the
site. `AGENTS.md` contains additional operating rules for Codex and other coding
agents.

## Recommended Workflow

For ordinary content, layout, or image work, use this flow:

| Step | What to do | How to do it |
| --- | --- | --- |
| 1 | Start a local preview when visual feedback is useful. | `npm run dev:local` |
| 2 | Edit site content and gallery references. | Edit `content/site.md`. The section ids in that file also define the source image folders under `content/`; for example, `id: work` corresponds to `content/work/`. Add or replace source images in the matching folder when gallery content changes. |
| 3 | Validate content and gallery references. | `npm run content:check` |
| 4 | Repair section order or moved gallery images when needed. | `npm run content:sync` |
| 5 | Add missing image metadata when needed. | `npm run metadata:fix` adds copyright metadata to source images only if they do not already have it. Commit any image files it changes. |
| 6 | Build locally for confidence. | `npm run build` |
| 7 | Review and commit the intended changes. | Check `git status --short` and `git diff`, then commit the intended files with `git add ...` and `git commit -m "Describe the change"`. |
| 8 | Deploy the already committed `main` branch. | `npm run deploy` |
| 9 | Monitor the GitHub Pages workflow when wanted. | `npm run deploy:watch` |

In command form:

```sh
npm run dev:local
npm run content:check
npm run build
git status --short
git diff
git add ...
git commit -m "Describe the change"
npm run deploy
npm run deploy:watch
```

`npm run deploy` runs `npm run build` before it pushes, so the manual build
step is for local confidence rather than a technical requirement.

## Requirements

Install project dependencies with:

```sh
npm install
```

The project expects:

- Node.js `>=22.12.0`.
- ImageMagick, either `magick` or the older `identify` and `convert` commands,
  for local image generation.
- `exiftool` for image metadata checks and metadata fixing.
- GitHub CLI (`gh`) for deploy checks and deploy monitoring.
- Playwright Chromium when running navigation diagnostics:

```sh
npx playwright install chromium
```

GitHub Actions installs the image tools during deploy, so the local image tool
requirement only applies when building on your machine.

## Local Preview

Start the local Astro dev server with:

```sh
npm run dev:local
```

The wrapper starts Astro in background mode at `http://localhost:4321/` and
opens that URL in the browser. Manage the background server with:

```sh
npm run dev:status
npm run dev:logs
npm run dev:logs -- --follow
npm run dev:restart
npm run dev:stop
```

Use `dev:local` for normal local preview. Use `build:local` when content or
gallery changes do not appear in the dev server, or when you want a full local
build followed by a dev-server restart:

```sh
npm run build:local
```

`build:local` runs the same build as `npm run build` and then restarts the local
dev server without opening a new browser window.

## Editing Content

The site is built as one static page. Keep editable site content in
`content/site.md`.

The file uses frontmatter for site-wide data and section configuration:

```yaml
copyrightOwner: Karin Walde
sections:
  - id: work
    gallery:
      - image: example-work.jpg
        alt: Descriptive alt text.
        caption: Optional caption.
  - id: about
```

Each `sections` entry defines a public section and its optional gallery.
The `id` is the stable technical key used for navigation anchors, image
directories, and Markdown heading ids. For example, `id: work` creates the
anchor `#work`.

The visible section title is the Markdown heading. Each top-level site section
must have an explicit heading id matching the frontmatter section id:

```md
## Work {#work}

Introductory text.

### Subheading

- List item
- Another list item
```

When adding, renaming, or moving sections, keep these three values aligned:

- The frontmatter section `id`.
- The Markdown heading id, written as `## Section title {#section-id}`.
- The source image directory under `content/<section-id>/`.

Biography, CV, and contact content can be ordinary Markdown text under a section
such as `## About {#about}`. It does not need a separate route or content file.

## Working With Gallery Images

Gallery images are source images under `content/<section-id>/`, next to
`content/site.md`.

Example source image directories:

```text
content/work/
content/about/
```

Reference a gallery image from `content/site.md` with only the filename:

```yaml
gallery:
  - image: example-work.jpg
    alt: Descriptive alt text.
    caption: Optional caption.
```

Rules for source images:

- Use `.jpg`, `.jpeg`, or `.png`.
- Use lowercase, descriptive filenames with ASCII letters, numbers, and hyphens.
- Keep image filenames globally unique under `content/`.
- Keep each referenced image in the directory matching the section where it is
  used.
- Only images listed in a section `gallery` are rendered on the site.

Tracked images can remain in the file tree even when they are not currently
referenced from `content/site.md`; `content:check` reports them under
`Unreferenced Images`. New untracked source images should be intentional and
committed before deploy. The `deploy:commit` convenience command only
auto-stages new source images when they are referenced from the matching gallery
section.

If a gallery row is moved to another section in `content/site.md`, run:

```sh
npm run content:sync
```

`content:sync` sorts Markdown sections according to frontmatter and moves
gallery image files into the matching section directory. It asks before writing
or moving files.

## Validating Content

Run a fast content validation pass after content or gallery changes:

```sh
npm run content:check
```

This checks:

- Section order and heading ids.
- Image references in `content/site.md`.
- Duplicate image filenames under `content/`.
- Whether referenced images exist.
- Whether gallery images are placed in the expected section directory.
- Images under `content/` that are not mounted because they are not referenced
  from `content/site.md`.

The report groups section and gallery problems under the affected section,
global content problems separately, and unreferenced images under
`Unreferenced Images`.

`npm run build` runs the same check automatically before image generation, but
`content:check` is faster when you only need content validation.

## Image Metadata

Original source images can be marked with copyright metadata:

```sh
npm run metadata:fix
```

Run this only when new source images need metadata or when the build reports
missing creator/artist metadata. The script reads `copyrightOwner` from
`content/site.md`, checks source images under `content/`, and writes simple
copyright metadata only to images that are missing it.

For the Karin Walde site, the metadata values are based on:

```text
Artist / Creator / By-line: Karin Walde
Copyright / Rights / CopyrightNotice: Copyright Karin Walde. All rights reserved.
Credit / Owner: Karin Walde
Marked: True
```

`npm run build` never modifies original source images. If `metadata:fix` updates
source images, commit those updated source files.

## Building The Site

Build the site locally with:

```sh
npm run build
```

The build chain runs:

1. `npm run content:check`
2. `npm run images`
3. `astro build`

The image pipeline generates WebP variants in `public/bilder/generated/`.
That directory is build output and is not version-controlled. The generated
image manifest, `src/data/generated-images.json`, stores hashes for source
images and copied metadata so unchanged images can reuse existing WebP variants.

The normal generated display widths are 480, 768, 1080, 1440, and 1920 pixels
when the source image is large enough. The pipeline also creates a largest
variant matching the source width when it is larger than the standard display
widths.

GitHub Actions caches `public/bilder/generated/` between deploys. With a cache
hit, GitHub can reuse generated WebP variants; with a cache miss, it rebuilds
them from source images under `content/`.

## Presentation And Routing

The site is a single static Astro page at `/`. Navigation uses same-page anchor
links:

```text
/#home
/#work
/#about
/#contact
```

The sticky navigation uses real hash links, so the links still work without
JavaScript. With JavaScript enabled, the page intercepts ordinary navigation
clicks and performs a controlled `requestAnimationFrame` scroll for more
consistent animation across browsers. It measures the sticky header and applies
the same offset when positioning target headings. Direct hash URLs, such as
`/#work`, are corrected after load if the browser lands in the wrong place.

Gallery images are displayed large on the page, not as thumbnails. Tall images
are constrained with CSS so they fit better in the viewport. The first gallery
image in the first section is prioritized as the likely LCP image; other gallery
images are lazy-loaded. Captions are shown when `caption` is present. Clicking a
gallery image opens the largest generated WebP variant.

## Deploying

Use the deploy script as the primary publishing path after the intended changes
have already been committed on `main`:

```sh
npm run deploy
```

The deploy script is intentionally conservative. It:

- Requires the current git branch to be `main`.
- Runs `npm run build`.
- Verifies that the worktree is clean before pushing.
- Pushes to `main` when local `main` is ahead of `origin/main`.
- Skips push when local `main` already matches `origin/main`.
- Refuses to deploy when local `main` is behind or has diverged from
  `origin/main`.
- Checks the latest GitHub Pages workflow.
- Fetches failed logs when the latest Pages run has failed.

The deploy script does not create commits, push uncommitted changes, or run
`npm run metadata:fix`.

The older build-and-commit convenience flow is still available when that is the
desired workflow:

```sh
npm run deploy:commit -- "Describe the change"
```

`deploy:commit` builds, stages only allowed site/content changes, commits,
pushes `main`, and checks GitHub Pages. It does not run
`npm run metadata:fix`.

For script usage, run:

```sh
npm run deploy -- --help
```

## Monitoring A Deploy

Use the deploy monitor when you want to follow the GitHub Pages workflow until
it succeeds, fails, or times out:

```sh
npm run deploy:watch
```

The monitor follows the workflow run for the current local `HEAD`, which avoids
mistaking an older workflow run for the result of the latest push. It prints
elapsed time, run id, run URL, status, branch, commit SHA, and the public site
URL.

On failure, timeout, cancellation, or another non-success conclusion, it prints
a compact failure summary with run and job ids, URLs, failed steps, and an
excerpt from:

```sh
gh run view <run-id> --repo janga/www.walde.se --log-failed
```

Common options:

```sh
npm run deploy:watch -- --timeout 20m --interval 5s
npm run deploy:watch -- --help
```

## Troubleshooting And Diagnostics

Use these commands when diagnosing specific problems. They are not part of the
daily publishing path.

### Content validation errors

Run:

```sh
npm run content:check
```

Use the grouped report to fix global content problems, section-specific gallery
problems, duplicate image names, missing image files, or misplaced images.

### Gallery rows moved between sections

Run:

```sh
npm run content:sync
```

This repairs section ordering and moves referenced image files into the matching
section directory after asking for confirmation.

### Missing image metadata

Run:

```sh
npm run metadata:fix
npm run build
```

Commit any source images that `metadata:fix` updated.

### Local preview shows stale content

Run:

```sh
npm run build:local
```

This performs a full build and restarts the local dev server so Astro reads the
current content and image state.

### Navigation or anchor scroll problems

For ordinary navigation diagnostics:

```sh
npm run test:navigation
```

This starts the local Astro server with `dev:local` if needed and tests sticky
navigation anchors in mobile and desktop viewports. It also checks that hash
links still work without JavaScript.

For intermittent mobile anchor problems:

```sh
NAVIGATION_STRESS_RUNS=100 npm run test:navigation:stress
```

For a production-like anchor test against `astro preview`:

```sh
NAVIGATION_PREVIEW_ROUNDS=10 npm run test:navigation:preview
```

`test:navigation:preview` runs `npm run build`, serves `dist/` at
`http://localhost:4322/`, and repeats sticky-nav clicks in mobile and desktop
viewports while measuring heading positions.

If Playwright reports a missing browser, run:

```sh
npx playwright install chromium
```

### GitHub Pages workflow failure

Use:

```sh
npm run deploy:watch
```

Or inspect manually:

```sh
gh run list --repo janga/www.walde.se --branch main --limit 3
gh run view <run-id> --repo janga/www.walde.se --log-failed
```

### Deploy refuses a dirty worktree

Run:

```sh
git status --short
```

Unexpected untracked or modified files should either be removed, committed
separately, or added deliberately to the content model before deploy. The
intended deploy model is to push an already committed `main` branch, not to
stage files during deployment.

## Command Reference

### Setup

```sh
npm install
npx playwright install chromium
```

### Local preview

```sh
npm run dev:local
npm run dev:status
npm run dev:logs
npm run dev:logs -- --follow
npm run dev:restart
npm run dev:stop
```

### Content and images

```sh
npm run content:check
npm run content:sync
npm run metadata:fix
npm run images
```

### Build

```sh
npm run build
npm run build:local
```

### Deploy

```sh
npm run deploy
npm run deploy -- --help
npm run deploy:commit -- "Describe the change"
npm run deploy:commit -- --help
npm run deploy:watch
npm run deploy:watch -- --help
```

### Diagnostics

```sh
npm run test:content-check
npm run test:navigation
npm run test:navigation:stress
npm run test:navigation:preview
```

`test:content-check` is a standalone regression test for `content:check` and
`content:sync` behavior against temporary fixtures. It is useful when changing
content validation or image-moving scripts. It is not part of the regular
build.

## Repository Structure

```text
content/
|-- site.md                         # Sections, text, image references, gallery metadata
`-- <section-id>/                   # Source images for each section, for example work/
public/
|-- CNAME                           # GitHub Pages custom domain
`-- bilder/generated/               # Generated WebP variants, not version-controlled
src/
|-- layouts/BaseLayout.astro        # Shared HTML shell and metadata
|-- pages/index.astro               # Renders the single page from content/site.md
|-- styles/global.css               # Layout, sticky navigation, responsive design
|-- content.config.ts               # Validates content/site.md
`-- data/generated-images.json      # Generated image manifest, version-controlled
scripts/
|-- deploy-site.mjs                 # Conservative local deploy command
|-- watch-pages-deploy.mjs          # GitHub Pages workflow monitor
|-- sync-content-sections.mjs       # Content validation and sync
|-- generate-images.mjs             # WebP generation pipeline
`-- fix-image-metadata.mjs          # Source image metadata helper
.github/workflows/deploy.yml        # Builds, caches image variants, deploys GitHub Pages
```

## GitHub Pages Deployment Model

GitHub Pages should use GitHub Actions as its source. The workflow in
`.github/workflows/deploy.yml` checks out the repository, installs Node and the
image tools, restores the generated image cache, runs `npm ci`, runs
`npm run build`, uploads the generated `dist/` artifact, and publishes it to
GitHub Pages.

The custom domain is stored in `public/CNAME` and copied into `dist/` during the
Astro build.
