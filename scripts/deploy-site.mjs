import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
	getFrontmatterSections,
	readSiteFile,
	supportedImageExtensions,
	toPosixPath,
} from './lib/site-content.mjs';

const execFileAsync = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const branch = 'main';
const repo = 'janga/www.walde.se';
const pagesWorkflow = 'Deploy to GitHub Pages';
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);
const commitMessage = args.join(' ').trim();
const allowedExactPaths = new Set([
	'astro.config.mjs',
	'package-lock.json',
	'package.json',
	'public/CNAME',
	'public/favicon.ico',
	'public/favicon.svg',
	'public/robots.txt',
	'public/sitemap.xml',
	'tsconfig.json',
]);
const failedConclusions = new Set(['failure', 'startup_failure', 'timed_out']);

const usage = 'Usage: npm run deploy -- "Commit message"';

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

const runCapture = async (command, commandArgs, options = {}) => {
	const { stdout } = await execFileAsync(command, commandArgs, {
		cwd: root,
		maxBuffer: 1024 * 1024 * 20,
		...options,
	});

	return stdout;
};

const runInherit = (command, commandArgs) => new Promise((resolve, reject) => {
	const child = spawn(command, commandArgs, {
		cwd: root,
		stdio: 'inherit',
	});

	child.once('error', reject);
	child.once('exit', (code, signal) => {
		if (code === 0) {
			resolve();
			return;
		}

		const commandText = [command, ...commandArgs].join(' ');
		reject(new Error(signal
			? `${commandText} exited with signal ${signal}.`
			: `${commandText} exited with code ${code}.`));
	});
});

const printStatusShort = async () => {
	const status = await runCapture('git', ['status', '--short']);
	console.log('git status --short');
	console.log(status.trim() || '(clean)');
};

const parseStatus = (statusBuffer) => {
	const records = statusBuffer.toString('utf8').split('\0');
	const entries = [];

	for (let index = 0; index < records.length;) {
		const record = records[index];
		index += 1;

		if (!record) continue;

		const status = record.slice(0, 2);
		const filePath = record.slice(3);
		const entry = { status, path: filePath, fromPath: null };

		if (status.includes('R') || status.includes('C')) {
			entry.fromPath = records[index] || null;
			index += 1;
		}

		entries.push(entry);
	}

	return entries;
};

const getStatusEntries = async () => parseStatus(await runCapture(
	'git',
	['status', '--porcelain=v1', '-z'],
	{ encoding: 'buffer' },
));

const getExpectedImagePaths = async () => {
	const sitePath = path.join(root, 'content', 'site.md');
	const { frontmatter } = await readSiteFile(sitePath);
	const imagePaths = new Set();

	for (const section of getFrontmatterSections(frontmatter)) {
		for (const image of section.images) {
			if (image.includes('/') || image.includes('\\')) continue;
			if (!supportedImageExtensions.has(path.extname(image).toLowerCase())) continue;

			imagePaths.add(toPosixPath(path.join('content', section.id, image)));
		}
	}

	return imagePaths;
};

const isUntracked = (entry) => entry.status === '??';

const isExpectedUntracked = (entry, expectedImagePaths) => (
	isUntracked(entry) && expectedImagePaths.has(entry.path)
);

const isAllowedPath = (entry, filePath, expectedImagePaths) => (
	filePath === 'content/site.md'
	|| (!isUntracked(entry) && filePath.startsWith('content/'))
	|| expectedImagePaths.has(filePath)
	|| filePath.startsWith('src/')
	|| allowedExactPaths.has(filePath)
);

const getEntryPaths = (entry) => [entry.path, entry.fromPath].filter(Boolean);

const formatEntry = (entry) => `${entry.status} ${getEntryPaths(entry).join(' <- ')}`;

const assertMainBranch = async () => {
	const currentBranch = (await runCapture('git', ['branch', '--show-current'])).trim();

	if (currentBranch !== branch) {
		fail(`Refusing to deploy from branch "${currentBranch || '(detached HEAD)'}". Switch to ${branch} first.`);
	}
};

const assertDeployableStatus = async (entries, expectedImagePaths) => {
	if (entries.length === 0) {
		fail('Refusing to deploy: no changes to commit after npm run build.');
	}

	const unexpectedUntracked = entries.filter((entry) => (
		isUntracked(entry) && !isExpectedUntracked(entry, expectedImagePaths)
	));

	if (unexpectedUntracked.length > 0) {
		fail([
			'Refusing to deploy: unexpected untracked files are present.',
			'Only new referenced gallery images under content/<section-id>/ are staged automatically.',
			...unexpectedUntracked.map((entry) => `- ${formatEntry(entry)}`),
		].join('\n'));
	}

	const unexpectedEntries = entries.filter((entry) => (
		!getEntryPaths(entry).every((filePath) => isAllowedPath(entry, filePath, expectedImagePaths))
	));

	if (unexpectedEntries.length > 0) {
		fail([
			'Refusing to deploy: changes outside the deploy allowlist are present.',
			'Commit them separately or update the deploy script deliberately.',
			...unexpectedEntries.map((entry) => `- ${formatEntry(entry)}`),
		].join('\n'));
	}
};

const getStagePaths = (entries) => [...new Set(entries.flatMap(getEntryPaths))].sort();

const assertCleanWorktree = async () => {
	const entries = await getStatusEntries();

	if (entries.length > 0) {
		await printStatusShort();
		fail('Refusing to push: uncommitted changes remain after commit.');
	}
};

const getLatestPagesRun = async () => {
	const output = await runCapture('gh', [
		'run',
		'list',
		'--repo',
		repo,
		'--workflow',
		pagesWorkflow,
		'--branch',
		branch,
		'--limit',
		'1',
		'--json',
		'databaseId,conclusion,status,url',
	]);
	const runs = JSON.parse(output || '[]');

	return runs[0] ?? null;
};

if (args.includes('--help') || args.includes('-h')) {
	console.log(usage);
	process.exit(0);
}

if (!commitMessage) {
	fail(`Commit message is required.\n${usage}`);
}

try {
	await assertMainBranch();
	await runInherit(npmBin, ['run', 'build']);
	await printStatusShort();

	const entries = await getStatusEntries();
	const expectedImagePaths = await getExpectedImagePaths();
	await assertDeployableStatus(entries, expectedImagePaths);

	const stagePaths = getStagePaths(entries);
	await runInherit('git', ['add', '--', ...stagePaths]);
	await runInherit('git', ['commit', '-m', commitMessage]);
	await assertCleanWorktree();
	await runInherit('git', ['push', 'origin', branch]);
	await runInherit('gh', ['run', 'list', '--repo', repo, '--branch', branch, '--limit', '3']);

	const latestRun = await getLatestPagesRun();
	if (!latestRun) {
		console.warn(`No ${pagesWorkflow} runs found for ${branch}.`);
		process.exit(0);
	}

	if (failedConclusions.has(latestRun.conclusion)) {
		console.error(`${pagesWorkflow} run ${latestRun.databaseId} failed. Inspecting failed logs.`);
		await runInherit('gh', ['run', 'view', String(latestRun.databaseId), '--log-failed']);
		process.exit(1);
	}

	console.log(`${pagesWorkflow} latest run: ${latestRun.status}${latestRun.conclusion ? `/${latestRun.conclusion}` : ''}`);
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
