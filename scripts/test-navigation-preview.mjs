import { spawn } from 'node:child_process';

const root = process.cwd();
const host = 'localhost';
const port = 4322;
const url = `http://${host}:${port}/`;
const probeUrls = [url, `http://127.0.0.1:${port}/`, `http://[::1]:${port}/`];
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const sleep = (milliseconds) => new Promise((resolve) => {
	setTimeout(resolve, milliseconds);
});

const runInherit = (command, args, options = {}) => new Promise((resolve, reject) => {
	const child = spawn(command, args, {
		cwd: root,
		stdio: 'inherit',
		...options,
	});

	child.once('error', reject);
	child.once('exit', (code, signal) => {
		if (code === 0) {
			resolve();
			return;
		}

		const commandText = [command, ...args].join(' ');
		reject(new Error(signal
			? `${commandText} exited with signal ${signal}.`
			: `${commandText} exited with code ${code}.`));
	});
});

const isReachable = async () => {
	for (const probeUrl of probeUrls) {
		try {
			const response = await fetch(probeUrl, { signal: AbortSignal.timeout(1_000) });
			await response.arrayBuffer();
			return response.ok;
		} catch {
			// Try the next loopback address.
		}
	}

	return false;
};

const waitForPreview = async (previewProcess) => {
	const startedAt = Date.now();
	const timeoutMs = 30_000;

	while (Date.now() - startedAt < timeoutMs) {
		if (previewProcess.exitCode !== null) {
			throw new Error(`astro preview exited before ${url} became reachable.`);
		}

		if (await isReachable()) {
			return;
		}

		await sleep(500);
	}

	throw new Error(`Timed out waiting for ${url}`);
};

const stopPreview = async (previewProcess) => {
	if (!previewProcess || previewProcess.exitCode !== null) return;

	previewProcess.kill('SIGTERM');

	const stopped = await Promise.race([
		new Promise((resolve) => {
			previewProcess.once('exit', () => resolve(true));
		}),
		sleep(5_000).then(() => false),
	]);

	if (!stopped && previewProcess.exitCode === null) {
		previewProcess.kill('SIGKILL');
	}
};

let previewProcess;

try {
	await runInherit(npmBin, ['run', 'build']);

	previewProcess = spawn(npmBin, ['run', 'astro', '--', 'preview', '--host', host, '--port', String(port)], {
		cwd: root,
		stdio: 'inherit',
	});

	previewProcess.once('error', (error) => {
		throw error;
	});

	await waitForPreview(previewProcess);
	await runInherit(npmBin, ['exec', '--', 'playwright', 'test', 'tests/navigation-preview.spec.ts'], {
		env: {
			...process.env,
			PLAYWRIGHT_BASE_URL: url,
		},
	});
} finally {
	await stopPreview(previewProcess);
}
