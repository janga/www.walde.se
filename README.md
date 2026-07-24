# www.walde.se

This repository contains the site-specific source for
[`https://www.walde.se/`](https://www.walde.se/), Karin Walde's official
single-page artist site.

The reusable gallery engine lives in
[`janga/cli-gallery`](https://github.com/janga/cli-gallery). This repository
does not own engine code; it owns Karin Walde's content, source images, static
domain/search files, site configuration, package lock, and GitHub Pages
workflow.

## Mental Model

- `cli-gallery` provides the generic CLI, renderer, validation, image
  generation, local preview, build, and deploy helpers.
- `www.walde.se` provides one concrete site that depends on an exact npm
  version of `@janga/cli-gallery`.
- Editable site content lives in `site/content.md`.
- Technical site settings live in `site/config.mjs`.
- Original images live in `site/images/<section-id>/`.
- Static public files such as `CNAME`, `robots.txt`, `sitemap.xml`, and favicons
  live in `site/public/`.

Read generic engine documentation in `cli-gallery`; use this repository's docs
for Karin Walde-specific maintenance and publishing context.

## Quick Start

```sh
npm install
npm run gallery:dev
```

The local preview runs at:

```text
http://localhost:4321/
```

Use `gallery:*` scripts for gallery-specific work. `npm run build` is kept as this pure site repository's publish build alias. Validate and build before committing site changes:

```sh
npm run gallery:config:check
npm run gallery:content:check
npm run build
```

## Common Tasks

- Understand this repository: [Site Overview](docs/site.md)
- Edit text, sections, captions, and alt text: [Editing Content](docs/editing-content.md)
- Maintain source images: [Managing Images](docs/managing-images.md)
- Run the site locally: [Local Development](docs/local-development.md)
- Publish the site: [Publishing](docs/publishing.md)
- Maintain domain and search files: [Domain And Search](docs/domain-and-search.md)
- Update the engine dependency: `npm run engine:update`. See [Maintenance](docs/maintenance.md)
  for version selection, checks, and commit guidance.
- Review licensing and usage restrictions: [Copyright](COPYRIGHT.md)

## Generic Engine Reference

For reusable `cli-gallery` behavior, see:

- [cli-gallery documentation](https://github.com/janga/cli-gallery/blob/main/docs/README.md)
- [Configuration](https://github.com/janga/cli-gallery/blob/main/docs/configuration.md)
- [Content](https://github.com/janga/cli-gallery/blob/main/docs/content.md)
- [Commands](https://github.com/janga/cli-gallery/blob/main/docs/commands.md)
- [Images And Metadata](https://github.com/janga/cli-gallery/blob/main/docs/images-and-metadata.md)
- [Publishing](https://github.com/janga/cli-gallery/blob/main/docs/publishing.md)

## Agent Instructions

`AGENTS.md` contains operating rules for coding agents. `CLAUDE.md` points to
the same instructions for Claude-specific tooling.
