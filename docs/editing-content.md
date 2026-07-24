# Editing Content

Use this document when changing Karin Walde's page text, section order, gallery
rows, alt text, or captions. For the generic content schema, see
[cli-gallery Content](https://github.com/janga/cli-gallery/blob/main/docs/content.md).

## Source File

Edit:

```text
site/content.md
```

The frontmatter defines the section order, presentation overrides, and gallery
rows. The Markdown body contains the visible section text. Each frontmatter
section must have a matching level 2 Markdown heading with the same explicit id.

## What To Preserve

- Do not translate or rewrite Karin Walde's public text as part of technical
  maintenance.
- Do not change captions or alt text unless that is the intended content task.
- Keep the frontmatter section `id`, Markdown heading id, and image directory in
  sync.
- Keep gallery image references as filenames only, not paths.

## Presentation

This site uses `defaultPresentation` in frontmatter for the common section text
layout, with section-specific overrides under `sections[].presentation` when a
section needs different heading or body presentation.

Read the actual current values in `site/content.md`. The generic allowed values
and fallback behavior are documented in
[cli-gallery Content](https://github.com/janga/cli-gallery/blob/main/docs/content.md).

## Checks

After content edits:

```sh
npm run gallery:content:check
```

After changing section order or moving gallery rows between sections:

```sh
npm run gallery:sync
npm run gallery:content:check
```

`content:sync` may rewrite Markdown section order and move referenced image
files into the matching `site/images/<section-id>/` directory. Review the diff
before committing.
