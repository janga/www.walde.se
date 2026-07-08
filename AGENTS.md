## Development

Before changing this project, read `README.md`.

When starting the dev server, use background mode:

```sh
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and
`astro dev logs`.

## Workflow

- Keep changes small and focused.
- Prefer editing `content/site.md` for content and gallery changes.
- Run `npm run content:check` before `npm run build` for content or image
  changes. This catches cheap content, filename, reference, and placement
  problems before WebP generation starts.
- Run `npm run metadata:fix` only when new source images need copyright metadata.
- Run `npm run build` after content, layout, or image changes, but only after
  `npm run content:check` has passed.
- Before committing, run `git status --short` and make sure untracked files are
  intentional.
- Commit before pushing.
- Do not create branches unless the user asks for one.
- Do not push uncommitted changes.

## Validation Order

For content or image changes, use this order:

1. Run `npm run content:check`.
   - It validates section order, image references, duplicate image names, image
     directories, and lists images under `content/` that are not mounted because
     they are not referenced from `content/site.md`.
   - Fix these issues before running `npm run build`.
2. Run `npm run metadata:fix` only when new source images are added or when the
   build reports missing creator/artist metadata.
   - Commit source images that were updated by metadata fixing.
3. Run `npm run build`.
   - This generates WebP variants and can update `src/data/generated-images.json`.
4. Review `git status --short`.
   - Include referenced new source images.
   - Include `content/site.md`.
   - Include `src/data/generated-images.json` when image generation changed it.
   - Do not commit unreferenced images unless the user explicitly asks for them.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Content and Gallery Images

- Keep all editable site content, section definitions, image references, and
  gallery metadata in `content/site.md`.
- The site is a single Astro page. Do not add separate routes or separate
  Markdown files for sections unless the user explicitly changes this decision.
- Put source images in the matching section directory under `content/`, next to
  `site.md`, for example:
  - `content/karin-walde/`
  - `content/min-konst/`
  - `content/runrondellerna/`
  - `content/om-mig/`
- Reference images from `content/site.md` with the `image` field and a filename
  only, for example `image: verk.jpg`.
- Image filenames must be globally unique under `content/`.
- Keep image files in the directory matching the section `id`. If a gallery row
  is moved to another section in frontmatter, run `npm run content:sync` to move
  the file into the matching section directory.
- Use lowercase, descriptive filenames with ASCII letters, numbers, and
  hyphens. Do not use spaces or Swedish characters in filenames.
- Run `npm run content:check` to validate section order and gallery image
  placement without changing files.
- Run `npm run content:sync` to sort Markdown sections according to frontmatter
  and move gallery images into matching section directories.
