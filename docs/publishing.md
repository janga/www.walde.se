# Publishing

This document describes publishing for `www.walde.se`. For generic deploy
behavior, see
[cli-gallery Publishing](https://github.com/janga/cli-gallery/blob/main/docs/publishing.md).

## Workflow Ownership

The GitHub Pages workflow belongs to this repository:

```text
.github/workflows/deploy.yml
```

The workflow builds `dist/` from this repository and deploys it to GitHub Pages.
It also restores the generated image cache from
`site/.cli-gallery/public/images/generated` using a key based on
`site/.cli-gallery/generated-images.json`.

## Before Publishing

Run:

```sh
npm run config:check
npm run content:check
npm run build
git status --short
git diff
```

Review content, image, config, and generated manifest changes before committing.

## Publishing Flow

The normal flow is:

```sh
git add ...
git commit -m "Describe the change"
npm run deploy
```

`npm run deploy` expects the intended deploy branch to be committed and clean.
It does not create commits from uncommitted work.

After pushing directly to `main`, monitor the Pages workflow with:

```sh
npm run deploy:watch
```

## Failed Deploys

Useful GitHub CLI diagnostics:

```sh
gh run list --repo janga/www.walde.se --branch main --limit 3
gh run view RUN_ID --repo janga/www.walde.se --log-failed
```

Do not change generic deploy behavior in this repository. Engine deploy helpers
belong in `cli-gallery`.
