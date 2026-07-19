## Agent Instructions

`README.md` is the canonical project manual. Read it before changing this
project. Read `README-local.md` too when touching site-specific content,
deployment settings, domain files, or current-site documentation.

Keep this file limited to agent operating rules. If a fact is useful to a human
maintainer, put it in `README.md` or `README-local.md` instead of duplicating it
here.

## Working Rules

- Keep changes small and focused.
- Do not create branches unless the user asks for one.
- Do not push uncommitted changes.
- Before committing, run `git status --short` and make sure untracked files are
  intentional.
- Commit before pushing.
- After pushing to `main`, run `npm run deploy:watch` to monitor the GitHub
  Pages workflow for the current local commit.
- Keep technical project settings in `site/config.mjs`; do not hardcode the
  public URL, GitHub repo, deploy branch, Pages workflow name, footer text,
  smooth-scroll timing, or image metadata policy in scripts or components.
- The site source directory defaults to `site/` and can be overridden with
  `CLI_GALLERY_SITE_DIR` or `cli-gallery --site-dir <path>`. Do not
  reintroduce local copies of engine path-resolution scripts.
- Keep editable content, section definitions, image references, gallery alt
  text, and captions in the selected site `content.md`; for this repository the
  default path is `site/content.md`.
- Keep site-specific static files in the selected site `public/`; for this
  repository the default path is `site/public/`. Root `public/` is copied build
  preparation output plus generated image output.
- Do not add routes or split sections into separate Markdown files unless the
  user explicitly changes the single-page architecture.

## Command Choices

- Start the dev server with `npm run dev:local`. Manage it with
  `npm run dev:stop`, `npm run dev:restart`, `npm run dev:status`, and
  `npm run dev:logs`.
- Run `npm run config:check` after changing `site/config.mjs` or config
  validation behavior.
- Run `npm run content:check` before `npm run build` when changing content or
  gallery images.
- Run `npm run content:sync` after moving gallery rows between sections so image
  files move to the matching section directory.
- Run `npm run metadata:fix` only when new source images need copyright
  metadata, or when build warnings identify missing metadata that should be
  written intentionally.
- Run `npm run site:public` after changing `site/public/` when you need the
  local root `public/` copy without a full build.
- Run `npm run build` after content, layout, config, or image-pipeline changes.
- Run `npm run build:local` when a local preview may be using stale content and
  should be rebuilt and restarted.
- Engine behavior tests live in the `cli-gallery` repository. This repository
  should normally verify site changes with `npm run config:check`,
  `npm run content:check`, and `npm run build`.

## Implementation Notes

- Preserve progressive enhancement in section navigation: keep real
  `href="#section-id"` links so anchors work without JavaScript.
- The sticky navigation uses root `scroll-padding-top` to compensate for the
  fixed header area. Avoid section-level `scroll-margin-top` unless you are
  deliberately testing anchor offsets.
- When adding, renaming, or moving sections, keep the frontmatter section `id`,
  the Markdown heading id, and the `site/images/<section-id>/` image directory in
  sync.
- Do not commit unreferenced source images unless the user explicitly asks for
  them.
