import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentScript = path.join(repoRoot, 'scripts', 'sync-content-sections.mjs');
const tests = [];

const test = (name, run) => {
	tests.push({ name, run });
};

const fileExists = async (filePath) => access(filePath).then(() => true, () => false);

const runContentScript = (root, args, env = {}) => spawnSync(process.execPath, [contentScript, ...args], {
	cwd: root,
	encoding: 'utf8',
	env: {
		...process.env,
		...env,
	},
});

const getOutput = (result) => `${result.stdout}${result.stderr}`;

const writeFixtureFile = async (root, relativePath, contents = 'fixture image') => {
	const filePath = path.join(root, relativePath);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
};

const withTempProject = async ({ site, files, siteDirectory = 'site' }, run) => {
	const root = await mkdtemp(path.join(tmpdir(), 'walde-content-check-'));

	try {
		await writeFixtureFile(root, `${siteDirectory}/content.md`, site);

		for (const file of files) {
			await writeFixtureFile(root, file);
		}

		await run(root);
	} finally {
		await rm(root, { force: true, recursive: true });
	}
};

const brokenSite = `---
copyrightOwner: Test Owner
sections:
  - id: karin-walde
    gallery:
      - image: karin.jpg
  - id: min-konst
    gallery:
      - image: vav.jpeg
      - image: missing.jpeg
      - image: duplicate.jpg
      - image: duplicate.jpg
  - id: mitt-hem
    gallery:
      - image: home.jpg

---
## Karin Walde {#karin-walde}
Text.
## Min konst {#min-konst}
Text.
## Extra {#extra}
Text.
## Mitt hem {#mitt-hem}
Text.
`;

test('content:check groups section issues, global issues, and unreferenced images', async () => {
	await withTempProject({
		site: brokenSite,
		files: [
			'site/images/karin-walde/karin.jpg',
			'site/images/karin-walde/unreferenced.jpg',
			'site/images/min-konst/duplicate.jpg',
			'site/images/mitt-hem/home.jpg',
			'site/images/mitt-hem/vav.jpeg',
		],
	}, async (root) => {
		const result = runContentScript(root, ['--check']);
		const output = getOutput(result);

		assert.equal(result.status, 1, output);
		assert.match(output, /^Content check failed\./m);
		assert.match(output, /Section and Gallery Issues\n\n\[min-konst\]\n  Errors:/);
		assert.match(output, /Image "vav\.jpeg" is used here but is located in site\/images\/mitt-hem\/\./);
		assert.match(output, /Image "missing\.jpeg" does not exist anywhere under site\/images\/\./);
		assert.match(output, /Image "duplicate\.jpg" is referenced more than once in this section\./);
		assert.match(output, /\[extra\]\n  Warnings:/);
		assert.match(output, /Global Content Issues\n\nWarnings:\n- Markdown section order differs from frontmatter\./);
		assert.match(output, /Unreferenced Images\nThese files are kept in site\/images\/ but are not mounted on the site:/);
		assert.match(output, /site\/images\/karin-walde\/unreferenced\.jpg/);
	});
});

test('content:check respects CLI_GALLERY_SITE_DIR', async () => {
	await withTempProject({
		site: movableSite,
		siteDirectory: 'custom-site',
		files: [
			'custom-site/images/min-konst/move-me.jpg',
			'custom-site/images/mitt-hem/home.jpg',
		],
	}, async (root) => {
		const result = runContentScript(root, ['--check'], { CLI_GALLERY_SITE_DIR: 'custom-site' });
		const output = getOutput(result);

		assert.equal(result.status, 0, output);
		assert.match(output, /Content check passed\./);
	});
});

const movableSite = `---
copyrightOwner: Test Owner
sections:
  - id: min-konst
    gallery:
      - image: move-me.jpg
  - id: mitt-hem
    gallery:
      - image: home.jpg

---
## Min konst {#min-konst}
Text.
## Mitt hem {#mitt-hem}
Text.
`;

test('content:sync moves referenced images and keeps unreferenced images in place', async () => {
	await withTempProject({
		site: movableSite,
		files: [
			'site/images/mitt-hem/home.jpg',
			'site/images/mitt-hem/move-me.jpg',
			'site/images/mitt-hem/unreferenced.jpg',
		],
	}, async (root) => {
		const syncResult = runContentScript(root, ['--write', '--yes']);
		const syncOutput = getOutput(syncResult);

		assert.equal(syncResult.status, 0, syncOutput);
		assert.match(syncOutput, /Moved image "move-me\.jpg" to site\/images\/min-konst\/\./);
		assert.equal(await fileExists(path.join(root, 'site/images/min-konst/move-me.jpg')), true);
		assert.equal(await fileExists(path.join(root, 'site/images/mitt-hem/move-me.jpg')), false);
		assert.equal(await fileExists(path.join(root, 'site/images/mitt-hem/unreferenced.jpg')), true);

		const checkResult = runContentScript(root, ['--check']);
		const checkOutput = getOutput(checkResult);

		assert.equal(checkResult.status, 0, checkOutput);
		assert.match(checkOutput, /Content check passed\./);
		assert.match(checkOutput, /site\/images\/mitt-hem\/unreferenced\.jpg/);
	});
});

let failed = 0;

for (const { name, run } of tests) {
	try {
		await run();
		console.log(`ok - ${name}`);
	} catch (error) {
		failed += 1;
		console.error(`not ok - ${name}`);
		console.error(error);
	}
}

if (failed > 0) {
	process.exit(1);
}
