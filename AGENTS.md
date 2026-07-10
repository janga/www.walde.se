## Development

Before changing this project, read `README.md`.

When starting the dev server, use the local wrapper:

```sh
npm run dev:local
```

It starts Astro in background mode at `http://localhost:4321/` and opens that
URL in the browser. Manage the background server with `npm run dev:stop`,
`npm run dev:status`, and `npm run dev:logs`.

## Workflow

- Keep changes small and focused.
- Prefer editing `content/site.md` for content and gallery changes.
- Run `npm run content:check` before `npm run build` when you want a cheap
  preflight for content or image changes. `npm run build` also runs this check
  automatically before WebP generation starts.
- Run `npm run metadata:fix` only when new source images need copyright metadata.
- Run `npm run build` after content, layout, or image changes.
- Run `npm run test:navigation` after sticky navigation, anchor offset, or
  scroll behavior changes. If Playwright reports a missing Chromium browser,
  run `npx playwright install chromium` once. In sandboxed Codex sessions, this
  test may need escalation to launch Chromium.
- Use `npm run test:navigation:stress` when investigating intermittent anchor
  navigation races. Set `NAVIGATION_STRESS_RUNS=<count>` to adjust how many
  repeated mobile click rounds it runs.
- Use `npm run deploy -- "Commit message"` for a conservative local deploy
  from `main`: it runs the build, reviews `git status --short`, commits only
  allowed site/content changes, pushes `main`, and checks the GitHub Pages
  workflow. Tracked files under `content/` are allowed even when currently
  unreferenced; new untracked files are allowed only when they are referenced
  gallery images in the matching section directory. It does not run
  `npm run metadata:fix`.
- Before committing, run `git status --short` and make sure untracked files are
  intentional.
- Commit before pushing.
- Do not create branches unless the user asks for one.
- Do not push uncommitted changes.
- After pushing to `main`, check the latest GitHub Pages workflow with
  `gh run list --repo janga/www.walde.se --branch main --limit 3`. If the
  latest run failed, inspect it with `gh run view <run-id> --log-failed`.

## Validation Order

For content or image changes, use this order:

1. Run `npm run content:check`.
   - It validates section order, image references, duplicate image names, image
     directories, and lists images under `content/` that are not mounted because
     they are not referenced from `content/site.md`.
   - Fix these issues before running `npm run build`.
   - `npm run build` also runs this check automatically, but the separate
     command is faster when you only need content validation.
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

When adding, renaming, or moving sections, make sure these three things match
exactly:

- The frontmatter section `id`.
- The Markdown level 2 heading id, written as `## Section title {#section-id}`.
- The source image directory under `content/<section-id>/`.

If a gallery row is moved to another section in frontmatter, run
`npm run content:sync` before building so the corresponding image files move to
the matching section directory.

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

## Layout and Navigation

- The sticky navigation uses root `scroll-padding-top` to compensate for the
  fixed header area. Do not add section-level `scroll-margin-top` unless you are
  deliberately testing anchor offsets; combining both can make section links
  stop too early and show the previous section above the target heading.
- Section navigation must remain progressive enhancement: keep real
  `href="#section-id"` links so anchors work without JavaScript. With
  JavaScript, ordinary nav clicks use a controlled `requestAnimationFrame`
  scroll for consistent animation across browsers. JavaScript may measure the
  sticky header and correct nav clicks or direct hash URL loads when the browser
  lands in the wrong place, but it should not be the only way navigation works.
