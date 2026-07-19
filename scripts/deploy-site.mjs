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
import { projectConfig } from './lib/project-config.mjs';
import {
	siteConfigLabel,
	siteContentLabel,
	siteContentPath,
	siteImagesLabel,
	sitePublicLabel,
} from './lib/site-paths.mjs';

const execFileAsync = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const branch = projectConfig.github.branch;
const repo = projectConfig.github.repo;
const pagesWorkflow = projectConfig.github.pagesWorkflow;
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);
const mode = args[0] === 'commit' ? 'commit' : 'deploy';
const modeArgs = mode === 'commit' ? args.slice(1) : args;
const allowedExactPaths = new Set([
	'astro.config.mjs',
	'package-lock.json',
	'package.json',
	siteConfigLabel,
	`${sitePublicLabel}/CNAME`,
	`${sitePublicLabel}/favicon.ico`,
	`${sitePublicLabel}/favicon.svg`,
	`${sitePublicLabel}/robots.txt`,
	`${sitePublicLabel}/sitemap.xml`,
	'tsconfig.json',
]);
const failedConclusions = new Set(['action_required', 'cancelled', 'failure', 'startup_failure', 'timed_out']);

const deployUsage = [
	'Usage: npm run deploy',
	'',
	`Publishes an already committed ${branch} branch: builds, verifies a clean worktree,`,
	`pushes ${branch} when local ${branch} is ahead of origin/${branch}, and checks GitHub Pages.`,
	`If local ${branch} already matches origin/${branch}, it skips push and checks Pages.`,
	'',
	'For the old build-and-commit convenience flow, use:',
	'npm run deploy:commit -- "Commit message"',
].join('\n');
const deployCommitUsage = [
	'Usage: npm run deploy:commit -- "Commit message"',
	'',
	`Builds, stages only allowed site changes, commits, pushes ${branch},`,
	'and checks GitHub Pages. Does not run npm run metadata:fix.',
].join('\n');

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
	const { frontmatter } = await readSiteFile(siteContentPath);
	const imagePaths = new Set();

	for (const section of getFrontmatterSections(frontmatter)) {
		for (const image of section.images) {
			if (image.includes('/') || image.includes('\\')) continue;
			if (!supportedImageExtensions.has(path.extname(image).toLowerCase())) continue;

			imagePaths.add(toPosixPath(path.join(siteImagesLabel, section.id, image)));
		}
	}

	return imagePaths;
};

const isUntracked = (entry) => entry.status === '??';

const isExpectedUntracked = (entry, expectedImagePaths) => (
	isUntracked(entry)
	&& (
		expectedImagePaths.has(entry.path)
		|| entry.path.startsWith(`${sitePublicLabel}/`)
	)
);

const isAllowedPath = (entry, filePath, expectedImagePaths) => (
	filePath === siteContentLabel
	|| (!isUntracked(entry) && filePath.startsWith(`${siteImagesLabel}/`))
	|| filePath.startsWith(`${sitePublicLabel}/`)
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
			`Only new referenced gallery images under ${siteImagesLabel}/<section-id>/ are staged automatically.`,
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

const assertCleanWorktree = async (message) => {
	const entries = await getStatusEntries();

	if (entries.length > 0) {
		await printStatusShort();
		fail(message);
	}
};

const fetchRemoteMain = async () => {
	await runInherit('git', ['fetch', 'origin']);
};

const getRemoteRelation = async () => {
	const output = (await runCapture('git', [
		'rev-list',
		'--left-right',
		'--count',
		`origin/${branch}...HEAD`,
	])).trim();
	const [behind, ahead] = output.split(/\s+/).map(Number);

	if (!Number.isInteger(behind) || !Number.isInteger(ahead)) {
		fail(`Could not compare HEAD with origin/${branch}.`);
	}

	return { ahead, behind };
};

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const assertPushableBranch = async () => {
	const relation = await getRemoteRelation();

	if (relation.behind > 0 && relation.ahead > 0) {
		fail([
			`Refusing to deploy: local ${branch} and origin/${branch} have diverged.`,
			`Local ${branch} is ${plural(relation.ahead, 'commit')} ahead and ${plural(relation.behind, 'commit')} behind origin/${branch}.`,
			'Reconcile the branches before deploying.',
		].join('\n'));
	}

	if (relation.behind > 0) {
		fail([
			`Refusing to deploy: local ${branch} is ${plural(relation.behind, 'commit')} behind origin/${branch}.`,
			'Pull or rebase before deploying.',
		].join('\n'));
	}

	return relation;
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

const checkPagesWorkflow = async () => {
	await runInherit('gh', ['run', 'list', '--repo', repo, '--branch', branch, '--limit', '3']);

	const latestRun = await getLatestPagesRun();
	if (!latestRun) {
		console.warn(`No ${pagesWorkflow} runs found for ${branch}.`);
		process.exit(0);
	}

	if (failedConclusions.has(latestRun.conclusion)) {
		console.error(`${pagesWorkflow} run ${latestRun.databaseId} failed. Inspecting failed logs.`);
		await runInherit('gh', ['run', 'view', String(latestRun.databaseId), '--repo', repo, '--log-failed']);
		process.exit(1);
	}

	console.log(`${pagesWorkflow} latest run: ${latestRun.status}${latestRun.conclusion ? `/${latestRun.conclusion}` : ''}`);
};

const deployCommittedMain = async () => {
	if (modeArgs.length > 0) {
		fail([
			'npm run deploy no longer accepts a commit message.',
			'Commit your changes first, then run npm run deploy.',
			'Use npm run deploy:commit -- "Commit message" for the old build-and-commit convenience flow.',
		].join('\n'));
	}

	await assertMainBranch();
	await assertCleanWorktree('Refusing to deploy: commit or discard local changes before deploying.');
	await fetchRemoteMain();
	await assertPushableBranch();
	await runInherit(npmBin, ['run', 'build']);
	await printStatusShort();
	await assertCleanWorktree('Refusing to deploy: npm run build produced uncommitted changes. Commit them before deploying.');
	await fetchRemoteMain();

	const relation = await assertPushableBranch();

	if (relation.ahead > 0) {
		await runInherit('git', ['push', 'origin', branch]);
	} else {
		console.log(`Local ${branch} matches origin/${branch}; nothing to push.`);
	}

	await checkPagesWorkflow();
};

const deployWithCommit = async () => {
	const commitMessage = modeArgs.join(' ').trim();

	if (!commitMessage) {
		fail(`Commit message is required.\n${deployCommitUsage}`);
	}

	await assertMainBranch();
	await fetchRemoteMain();
	await assertPushableBranch();
	await runInherit(npmBin, ['run', 'build']);
	await printStatusShort();

	const entries = await getStatusEntries();
	const expectedImagePaths = await getExpectedImagePaths();
	await assertDeployableStatus(entries, expectedImagePaths);

	const stagePaths = getStagePaths(entries);
	await runInherit('git', ['add', '--', ...stagePaths]);
	await runInherit('git', ['commit', '-m', commitMessage]);
	await assertCleanWorktree('Refusing to push: uncommitted changes remain after commit.');
	await fetchRemoteMain();
	await assertPushableBranch();
	await runInherit('git', ['push', 'origin', branch]);
	await checkPagesWorkflow();
};

if (modeArgs.includes('--help') || modeArgs.includes('-h')) {
	console.log(mode === 'commit' ? deployCommitUsage : deployUsage);
	process.exit(0);
}

try {
	if (mode === 'commit') {
		await deployWithCommit();
	} else {
		await deployCommittedMain();
	}
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
