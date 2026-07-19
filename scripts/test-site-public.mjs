import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const syncScript = path.join(repoRoot, 'scripts', 'sync-site-public.mjs');
const tests = [];

const test = (name, run) => {
	tests.push({ name, run });
};

const fileExists = async (filePath) => access(filePath).then(() => true, () => false);

const runSyncScript = (root, env = {}) => spawnSync(process.execPath, [syncScript], {
	cwd: root,
	encoding: 'utf8',
	env: {
		...process.env,
		...env,
	},
});

const getOutput = (result) => `${result.stdout}${result.stderr}`;

const writeFixtureFile = async (root, relativePath, contents) => {
	const filePath = path.join(root, relativePath);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
};

const readFixtureFile = (root, relativePath) => readFile(path.join(root, relativePath), 'utf8');

const withTempProject = async (run) => {
	const root = await mkdtemp(path.join(tmpdir(), 'walde-site-public-'));

	try {
		await run(root);
	} finally {
		await rm(root, { force: true, recursive: true });
	}
};

test('site:public copies configured public files, removes stale root public files, and keeps images output', async () => {
	await withTempProject(async (root) => {
		await writeFixtureFile(root, 'custom-site/public/CNAME', 'example.com\n');
		await writeFixtureFile(root, 'custom-site/public/robots.txt', 'User-agent: *\nAllow: /\n');
		await writeFixtureFile(root, 'custom-site/public/nested/source.txt', 'source file\n');
		await writeFixtureFile(root, 'public/stale.txt', 'stale root file\n');
		await writeFixtureFile(root, 'public/nested/old.txt', 'stale nested file\n');
		await writeFixtureFile(root, 'public/images/generated/keep.webp', 'generated image\n');

		const result = runSyncScript(root, { CLI_GALLERY_SITE_DIR: 'custom-site' });
		const output = getOutput(result);

		assert.equal(result.status, 0, output);
		assert.match(output, /Synced custom-site\/public\/ to public\/\./);
		assert.equal(await readFixtureFile(root, 'public/CNAME'), 'example.com\n');
		assert.equal(await readFixtureFile(root, 'public/robots.txt'), 'User-agent: *\nAllow: /\n');
		assert.equal(await readFixtureFile(root, 'public/nested/source.txt'), 'source file\n');
		assert.equal(await fileExists(path.join(root, 'public/stale.txt')), false);
		assert.equal(await fileExists(path.join(root, 'public/nested/old.txt')), false);
		assert.equal(await readFixtureFile(root, 'public/images/generated/keep.webp'), 'generated image\n');
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
