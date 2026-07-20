# Local Development

Use the site npm scripts when running `www.walde.se` locally. They call the
pinned `cli-gallery` package.

## Start The Site

```sh
npm install
npm run dev:local
```

Open:

```text
http://localhost:4321/
```

The generic dev-server behavior is documented in
[cli-gallery Local Development](https://github.com/janga/cli-gallery/blob/main/docs/local-development.md).

## Manage The Local Server

```sh
npm run dev:status
npm run dev:logs
npm run dev:logs -- --follow
npm run dev:restart
npm run dev:stop
```

Use this when content or image output appears stale:

```sh
npm run build:local
```

## Validate Locally

Before committing site changes, run:

```sh
npm run config:check
npm run content:check
npm run build
```

`content:check` currently reports known unreferenced source images when they are
not mounted from `site/content.md`. Treat new unreferenced images as intentional
only when that is part of the content plan.
