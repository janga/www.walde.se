# Local Development

Use the site npm scripts when running `www.walde.se` locally. They call the
pinned `norna` package.

## Start The Site

```sh
npm install
npm run norna:dev
```

Open:

```text
http://localhost:4321/
```

The generic dev-server behavior is documented in
[norna Local Development](https://github.com/janga/norna/blob/main/docs/local-development.md).

## Manage The Local Server

```sh
npm run norna:dev:status
npm run norna:dev:logs
npm run norna:dev:logs -- --follow
npm run norna:dev:restart
npm run norna:dev:stop
```

Use this when content or image output appears stale:

```sh
npm run norna:build:local
```

## Validate Locally

Before committing site changes, run:

```sh
npm run norna:config:check
npm run norna:content:check
npm run build
```

`content:check` currently reports known unreferenced source images when they are
not mounted from `site/content.md`. Treat new unreferenced images as intentional
only when that is part of the content plan.
