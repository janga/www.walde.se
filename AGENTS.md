## Development

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

- Keep editable page content in `content/pages/` and gallery metadata in
  `content/galleries/<gallery-slug>/gallery.json`.
- Put new master images in the matching
  `content/galleries/<gallery-slug>/originals/` directory. The directory, not
  the filename, determines which gallery owns an image.
- Use lowercase, descriptive filenames with ASCII letters, numbers, and
  hyphens. Do not use spaces or Swedish characters in filenames.
- Never place gallery master images in `public/`. Future generated web images
  belong in `public/bilder/generated/<gallery-slug>/`.
- Do not implement or run image generation until that workflow is explicitly
  requested. The intended sizes and formats live in `site.config.json`.
- Preserve the existing public route slugs when migrating content from the
  WordPress site.
