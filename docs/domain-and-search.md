# Domain And Search

This site owns its custom-domain and search-engine static files under
`site/public/`. These files are copied into the published site during build.

## Versioned Files

```text
site/public/CNAME
site/public/robots.txt
site/public/sitemap.xml
site/public/favicon.ico
site/public/favicon.svg
```

`CNAME` configures the GitHub Pages custom domain. `robots.txt` points search
engines to the sitemap. `sitemap.xml` lists the public page URL.

## Update Together

When the public URL or custom domain changes, update these files together:

- `site/config.mjs`
- `site/public/CNAME`
- `site/public/robots.txt`
- `site/public/sitemap.xml`

Then run:

```sh
npm run gallery:config:check
npm run build
```

`site/public/` is source. `site/.cli-gallery/public/` is generated
build-preparation output and should not be edited directly.
