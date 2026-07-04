## Development

Before changing this project, read `README.md`.

When starting the dev server, use background mode:

```sh
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and
`astro dev logs`.

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
