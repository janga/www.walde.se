# Managing Images

Use this document when adding, replacing, or reorganizing Karin Walde's source
images. For the generic image pipeline, see
[norna Images And Metadata](https://github.com/janga/norna/blob/main/docs/images-and-metadata.md).

## Source Images

Original images live under:

```text
site/images/<section-id>/
```

Only images referenced from `site/content.md` are rendered. Image references in
frontmatter use only the filename.

The engine supports `.jpg`, `.jpeg`, and `.png` source files. Filenames must be
globally unique under `site/images/`.

## Adding Or Replacing Images

1. Put the source image in the directory matching the section id.
2. Add or update the gallery row in `site/content.md`.
3. Add meaningful `alt` text unless the content decision is intentionally empty.
4. Add or update the caption when the site should display one.
5. Run `npm run norna:content:check`.
6. Run `npm run build` before committing.

## Unreferenced Images

`content:check` reports source images that are kept under `site/images/` but not
mounted on the page. That can be intentional for archive or future-use images,
but new unreferenced source images should be deliberate.

## Generated Images

Generated WebP variants are written under:

```text
site/.norna/public/images/generated/
```

They are build-preparation output and are not versioned. The versioned manifest
is:

```text
site/.norna/generated-images.json
```

Do not edit generated WebP files or the generated public directory by hand.

## Copyright And Metadata

Copyright and usage restrictions for this repository are documented in
[`COPYRIGHT.md`](../COPYRIGHT.md). The visible footer copyright sentence is
configured in `site/config.mjs`.

The current `norna` engine does not provide a command for checking or
writing embedded image metadata. Generated WebP files are not a metadata source;
the engine creates them with embedded metadata stripped. Keep rights and credits
in site-owned documentation, captions, and source files as appropriate.
