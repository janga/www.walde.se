import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://localhost:4321/';
const probeUrls = [url, 'http://127.0.0.1:4321/', 'http://[::1]:4321/'];
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const testTargets = process.argv.slice(2);
const playwrightTargets = testTargets.length > 0 ? testTargets : ['tests/navigation.spec.ts'];

const sleep = (milliseconds) => new Promise((resolve) => {
	setTimeout(resolve, milliseconds);
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

	try {
		await execFileAsync('curl', ['-fsI', url], {
			cwd: root,
			maxBuffer: 1024 * 1024,
		});
		return true;
	} catch {
		return false;
	}
};

const waitForServer = async () => {
	const startedAt = Date.now();
	const timeoutMs = 30_000;

	while (Date.now() - startedAt < timeoutMs) {
		if (await isReachable()) {
			return;
		}

		await sleep(500);
	}

	throw new Error(`Timed out waiting for ${url}`);
};

const runCapture = async (command, args) => execFileAsync(command, args, {
	cwd: root,
	maxBuffer: 1024 * 1024 * 10,
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

const ensureServer = async () => {
	if (await isReachable()) {
		return false;
	}

	await runInherit(npmBin, ['run', 'dev:local'], {
		env: {
			...process.env,
			WALDE_NO_OPEN: '1',
		},
	});
	await waitForServer();

	return true;
};

const stopServer = async () => {
	await runCapture(npmBin, ['run', 'dev:stop']).catch(() => {});
};

let startedServer = false;

try {
	startedServer = await ensureServer();
	await runInherit(npmBin, ['exec', '--', 'playwright', 'test', ...playwrightTargets], {
		env: {
			...process.env,
			PLAYWRIGHT_BASE_URL: url,
		},
	});
} finally {
	if (startedServer) {
		await stopServer();
	}
}
