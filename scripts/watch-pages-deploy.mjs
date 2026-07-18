import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { projectConfig } from './lib/project-config.mjs';

const execFileAsync = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepo = projectConfig.github.repo;
const defaultWorkflow = projectConfig.github.pagesWorkflow;
const defaultBranch = projectConfig.github.branch;
const defaultSiteUrl = projectConfig.site.url;
const defaultPollIntervalMs = projectConfig.deploy.watch.intervalMs;
const defaultTimeoutMs = projectConfig.deploy.watch.timeoutMs;
const defaultRunLimit = projectConfig.deploy.watch.runLimit;
const runListFields = [
	'conclusion',
	'createdAt',
	'databaseId',
	'displayTitle',
	'event',
	'headBranch',
	'headSha',
	'name',
	'startedAt',
	'status',
	'updatedAt',
	'url',
	'workflowName',
].join(',');
const runViewFields = [
	'conclusion',
	'createdAt',
	'databaseId',
	'displayTitle',
	'event',
	'headBranch',
	'headSha',
	'jobs',
	'name',
	'startedAt',
	'status',
	'updatedAt',
	'url',
	'workflowName',
].join(',');

const usage = `
Usage: npm run deploy:watch -- [options]

Options:
  --repo <owner/name>     GitHub repository. Default: ${defaultRepo}
  --workflow <name>       Workflow name. Default: ${defaultWorkflow}
  --branch <name>         Branch to monitor. Default: ${defaultBranch}
  --sha <sha>             Commit SHA to monitor. Default: current HEAD
  --site-url <url>        Public site URL to print. Default: ${defaultSiteUrl}
  --interval <duration>   Poll interval, for example 5s or 0.5m. Default: 10s
  --timeout <duration>    Timeout, for example 15m or 900s. Default: 15m
  --limit <count>         Recent workflow runs to scan. Default: ${defaultRunLimit}
  -h, --help              Show this help.
`.trim();

const terminalStatus = new Set(['completed']);
const successfulConclusions = new Set(['success']);

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

const parseDuration = (value, optionName) => {
	const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/);

	if (!match) {
		fail(`${optionName} must be a duration such as 10s, 0.5m, or 900s.`);
	}

	const amount = Number(match[1]);
	const unit = match[2] ?? 's';

	if (!Number.isFinite(amount) || amount <= 0) {
		fail(`${optionName} must be greater than zero.`);
	}

	if (unit === 'ms') return Math.round(amount);
	if (unit === 's') return Math.round(amount * 1000);
	return Math.round(amount * 60_000);
};

const readOptionValue = (args, index, optionName) => {
	const value = args[index + 1];

	if (!value || value.startsWith('--')) {
		fail(`${optionName} requires a value.`);
	}

	return value;
};

const parseArgs = (args) => {
	const options = {
		branch: defaultBranch,
		intervalMs: defaultPollIntervalMs,
		limit: defaultRunLimit,
		repo: defaultRepo,
		sha: null,
		siteUrl: defaultSiteUrl,
		timeoutMs: defaultTimeoutMs,
		workflow: defaultWorkflow,
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '-h' || arg === '--help') {
			console.log(usage);
			process.exit(0);
		}

		if (arg === '--repo') {
			options.repo = readOptionValue(args, index, arg);
			index += 1;
			continue;
		}

		if (arg === '--workflow') {
			options.workflow = readOptionValue(args, index, arg);
			index += 1;
			continue;
		}

		if (arg === '--branch') {
			options.branch = readOptionValue(args, index, arg);
			index += 1;
			continue;
		}

		if (arg === '--sha') {
			options.sha = readOptionValue(args, index, arg);
			index += 1;
			continue;
		}

		if (arg === '--site-url') {
			options.siteUrl = readOptionValue(args, index, arg);
			index += 1;
			continue;
		}

		if (arg === '--interval') {
			options.intervalMs = parseDuration(readOptionValue(args, index, arg), arg);
			index += 1;
			continue;
		}

		if (arg === '--timeout') {
			options.timeoutMs = parseDuration(readOptionValue(args, index, arg), arg);
			index += 1;
			continue;
		}

		if (arg === '--limit') {
			const limit = Number(readOptionValue(args, index, arg));

			if (!Number.isInteger(limit) || limit <= 0) {
				fail('--limit must be a positive integer.');
			}

			options.limit = limit;
			index += 1;
			continue;
		}

		fail(`Unknown option: ${arg}\n${usage}`);
	}

	return options;
};

const formatCommandError = (command, args, error) => [
	`${[command, ...args].join(' ')} failed.`,
	error.stdout?.trim(),
	error.stderr?.trim(),
	error.message,
].filter(Boolean).join('\n');

const runCapture = async (command, args, options = {}) => {
	const { allowFailure = false, maxBuffer = 1024 * 1024 * 20 } = options;

	try {
		const { stdout } = await execFileAsync(command, args, {
			cwd: root,
			maxBuffer,
		});

		return stdout.trimEnd();
	} catch (error) {
		const output = [error.stdout, error.stderr].filter(Boolean).join('\n').trimEnd();

		if (allowFailure) {
			return output || error.message;
		}

		throw new Error(formatCommandError(command, args, error));
	}
};

const getCurrentSha = async () => (await runCapture('git', ['rev-parse', 'HEAD'])).trim();

const shortSha = (sha) => sha.slice(0, 7);

const sleep = (ms) => new Promise((resolve) => {
	setTimeout(resolve, ms);
});

const formatElapsed = (ms) => {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const seconds = totalSeconds % 60;
	const minutes = Math.floor(totalSeconds / 60) % 60;
	const hours = Math.floor(totalSeconds / 3600);

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatRunState = (run) => `${run.status ?? 'unknown'}${run.conclusion ? `/${run.conclusion}` : ''}`;

const getActionsUrl = (repo, branch) => (
	`https://github.com/${repo}/actions?query=branch%3A${encodeURIComponent(branch)}`
);

const getRecentRuns = async ({ branch, limit, repo, workflow }) => {
	const output = await runCapture('gh', [
		'run',
		'list',
		'--repo',
		repo,
		'--workflow',
		workflow,
		'--branch',
		branch,
		'--limit',
		String(limit),
		'--json',
		runListFields,
	]);

	return JSON.parse(output || '[]');
};

const getRunDetails = async (repo, runId) => {
	const output = await runCapture('gh', [
		'run',
		'view',
		String(runId),
		'--repo',
		repo,
		'--json',
		runViewFields,
	]);

	return JSON.parse(output || '{}');
};

const getFailedLogOutput = async (repo, runId) => runCapture('gh', [
	'run',
	'view',
	String(runId),
	'--repo',
	repo,
	'--log-failed',
], { allowFailure: true, maxBuffer: 1024 * 1024 * 50 });

const findRunForSha = (runs, sha) => runs.find((run) => run.headSha === sha) ?? null;

const hasTerminalState = (run) => terminalStatus.has(run.status) || Boolean(run.conclusion);

const isSuccess = (run) => successfulConclusions.has(run.conclusion);

const isProblemConclusion = (conclusion) => Boolean(conclusion) && !successfulConclusions.has(conclusion);

const getProblemJobs = (jobs = []) => jobs.filter((job) => (
	isProblemConclusion(job.conclusion)
	|| (job.status && job.status !== 'completed' && job.status !== 'success')
));

const getProblemSteps = (steps = []) => steps.filter((step) => isProblemConclusion(step.conclusion));

const getLogExcerpt = (output, maxLines = 160) => {
	const lines = output.trim().split(/\r?\n/).filter(Boolean);

	if (lines.length <= maxLines) {
		return lines.join('\n');
	}

	return [
		`... ${lines.length - maxLines} earlier log lines omitted ...`,
		...lines.slice(-maxLines),
	].join('\n');
};

const printRunSummary = (run, options, elapsedMs, stream = console.log) => {
	stream(`${options.workflow}: ${formatRunState(run)} after ${formatElapsed(elapsedMs)}`);
	stream(`Run ID: ${run.databaseId}`);
	stream(`Run URL: ${run.url ?? '(unknown)'}`);
	stream(`Actions URL: ${getActionsUrl(options.repo, options.branch)}`);
	stream(`Branch: ${run.headBranch ?? options.branch}`);
	stream(`Commit: ${run.headSha ?? options.sha}`);
	stream(`Site URL: ${options.siteUrl}`);
};

const printFailureDetails = async (run, options, elapsedMs) => {
	let details = run;

	try {
		details = {
			...run,
			...await getRunDetails(options.repo, run.databaseId),
		};
	} catch (error) {
		console.error(`Could not fetch run details: ${error.message}`);
	}

	console.error('');
	console.error('Deployment workflow did not complete successfully.');
	printRunSummary(details, options, elapsedMs, console.error);

	const jobs = Array.isArray(details.jobs) ? details.jobs : [];
	const problemJobs = getProblemJobs(jobs);

	if (problemJobs.length > 0) {
		console.error('');
		console.error('Failed or incomplete jobs:');

		for (const job of problemJobs) {
			console.error(`- ${job.name ?? '(unnamed job)'}`);
			console.error(`  Job ID: ${job.databaseId ?? '(unknown)'}`);
			console.error(`  Status: ${job.status ?? 'unknown'}${job.conclusion ? `/${job.conclusion}` : ''}`);
			console.error(`  Job URL: ${job.url ?? '(unknown)'}`);

			const problemSteps = getProblemSteps(job.steps);

			for (const step of problemSteps) {
				console.error(`  Step ${step.number ?? '?'}: ${step.name ?? '(unnamed step)'} (${step.conclusion})`);
			}
		}
	} else if (jobs.length > 0) {
		console.error('');
		console.error('No failed job was reported by GitHub CLI, but the run conclusion was not success.');
	}

	const failedLog = await getFailedLogOutput(options.repo, run.databaseId);
	const failedLogExcerpt = getLogExcerpt(failedLog);

	if (failedLogExcerpt) {
		console.error('');
		console.error('Failed log excerpt:');
		console.error(failedLogExcerpt);
	}

	console.error('');
	console.error(`Full failed logs: gh run view ${run.databaseId} --repo ${options.repo} --log-failed`);
};

const monitor = async () => {
	const options = parseArgs(process.argv.slice(2));
	options.sha ??= await getCurrentSha();

	const startedAt = Date.now();
	let lastRun = null;

	console.log(`Monitoring ${options.workflow} for ${options.repo}`);
	console.log(`Branch: ${options.branch}`);
	console.log(`Commit: ${shortSha(options.sha)} (${options.sha})`);
	console.log(`Poll interval: ${formatElapsed(options.intervalMs)}`);
	console.log(`Timeout: ${formatElapsed(options.timeoutMs)}`);
	console.log(`Actions URL: ${getActionsUrl(options.repo, options.branch)}`);
	console.log('');

	while (Date.now() - startedAt <= options.timeoutMs) {
		const elapsedMs = Date.now() - startedAt;
		const runs = await getRecentRuns(options);
		const run = findRunForSha(runs, options.sha);

		if (!run) {
			console.log(`[${formatElapsed(elapsedMs)}] Waiting for a run for ${shortSha(options.sha)}. Checked ${runs.length} recent runs.`);
		} else {
			lastRun = run;
			console.log(`[${formatElapsed(elapsedMs)}] Run ${run.databaseId}: ${formatRunState(run)} (${run.url})`);

			if (hasTerminalState(run)) {
				if (isSuccess(run)) {
					console.log('');
					printRunSummary(run, options, Date.now() - startedAt);
					return;
				}

				await printFailureDetails(run, options, Date.now() - startedAt);
				process.exit(1);
			}
		}

		const remainingMs = options.timeoutMs - (Date.now() - startedAt);
		if (remainingMs <= 0) break;

		await sleep(Math.min(options.intervalMs, remainingMs));
	}

	console.error('');
	console.error(`Timed out after ${formatElapsed(Date.now() - startedAt)} while waiting for ${options.workflow}.`);

	if (lastRun) {
		printRunSummary(lastRun, options, Date.now() - startedAt, console.error);
	} else {
		console.error(`No matching run was found for commit ${options.sha}.`);
		console.error(`Actions URL: ${getActionsUrl(options.repo, options.branch)}`);
	}

	process.exit(1);
};

try {
	await monitor();
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
