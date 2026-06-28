## Development

Before changing this project, read `README.md`.

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Content and gallery images

- Keep all editable site content, section definitions, image references, and
  gallery metadata in `content/site.md`.
- The site is a single Astro page. Do not add separate routes or separate
  Markdown files for sections unless the user explicitly changes this decision.
- Put published images in the matching section directory under
  `public/bilder/site/`, for example:
  - `public/bilder/site/karin-walde/`
  - `public/bilder/site/min-konst/`
  - `public/bilder/site/cv/`
- Reference published images from `content/site.md` with absolute public paths,
  for example `/bilder/site/min-konst/verk.jpg`.
- Use lowercase, descriptive filenames with ASCII letters, numbers, and
  hyphens. Do not use spaces or Swedish characters in filenames.
- The common background image is configured in `site.config.json`.
