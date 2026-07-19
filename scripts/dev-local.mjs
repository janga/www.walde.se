import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = 'localhost';
const port = 4321;
const url = `http://${host}:${port}/`;
const probeUrls = [url, `http://127.0.0.1:${port}/`, `http://[::1]:${port}/`];
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const skipOpen = process.env.WALDE_NO_OPEN === '1';
const statePath = path.join(root, '.astro', 'dev-local.json');
const logPath = path.join(root, '.astro', 'dev.log');
const command = process.argv[2] ?? 'start';

const runAstro = async (args, options = {}) => execFileAsync(npmBin, ['run', 'astro', '--', ...args], {
	cwd: root,
	maxBuffer: 1024 * 1024 * 10,
	...options,
});

const syncSitePublic = async () => execFileAsync(npmBin, ['run', 'site:public'], {
	cwd: root,
	maxBuffer: 1024 * 1024 * 10,
});

const getPortPids = async () => {
	try {
		const { stdout } = await execFileAsync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
		return [...new Set(stdout.trim().split(/\s+/).map(Number).filter(Number.isInteger))];
	} catch (error) {
		if (error.code === 1 || error.code === 'ENOENT') {
			return [];
		}

		throw error;
	}
};

const readState = async () => {
	try {
		return JSON.parse(await readFile(statePath, 'utf8'));
	} catch (error) {
		if (error.code === 'ENOENT') {
			return null;
		}

		throw error;
	}
};

const writeState = async (pid) => {
	await mkdir(path.dirname(statePath), { recursive: true });
	await writeFile(statePath, `${JSON.stringify({
		pid,
		port,
		url,
		startedAt: new Date().toISOString(),
	}, null, 2)}\n`);
};

const removeState = async () => {
	await rm(statePath, { force: true });
};

const isPortFreeOnHost = (loopbackHost) => new Promise((resolve, reject) => {
	const server = net.createServer();

	server.once('error', (error) => {
		if (error.code === 'EADDRINUSE') {
			resolve(false);
			return;
		}

		if (error.code === 'EADDRNOTAVAIL') {
			resolve(true);
			return;
		}

		reject(error);
	});
	server.once('listening', () => {
		server.close(() => resolve(true));
	});
	server.listen({ port, host: loopbackHost, ipv6Only: loopbackHost === '::1' });
});

const isPortFree = async () => {
	for (const loopbackHost of ['127.0.0.1', '::1']) {
		if (!(await isPortFreeOnHost(loopbackHost))) {
			return false;
		}
	}

	return true;
};

const sleep = (milliseconds) => new Promise((resolve) => {
	setTimeout(resolve, milliseconds);
});

const isServerReachable = async () => {
	for (const probeUrl of probeUrls) {
		try {
			const response = await fetch(probeUrl, { signal: AbortSignal.timeout(1_000) });
			await response.arrayBuffer();
			return true;
		} catch {
			// Try the next loopback address.
		}
	}

	return false;
};

const waitForServer = async () => {
	const startedAt = Date.now();
	const timeoutMs = 30_000;

	while (Date.now() - startedAt < timeoutMs) {
		if (await isServerReachable()) {
			return;
		}

		await sleep(500);
	}

	throw new Error(`Timed out waiting for ${url}`);
};

const waitForPidToStopListening = async (pid) => {
	const startedAt = Date.now();
	const timeoutMs = 5_000;

	while (Date.now() - startedAt < timeoutMs) {
		if (!(await getPortPids()).includes(pid)) {
			return true;
		}

		await sleep(250);
	}

	return false;
};

const openBrowser = async () => {
	if (skipOpen) {
		console.log(`Browser open skipped. Open ${url}`);
		return;
	}

	if (process.platform === 'darwin') {
		await execFileAsync('open', [url]);
		return;
	}

	if (process.platform === 'win32') {
		await execFileAsync('cmd', ['/c', 'start', '', url]);
		return;
	}

	await execFileAsync('xdg-open', [url]);
};

const stopServer = async ({ quiet = false } = {}) => {
	const state = await readState();

	await runAstro(['dev', 'stop']).catch(() => {});

	if (!state?.pid) {
		if (!quiet) {
			console.log('No dev:local server is tracked.');
		}
		return;
	}

	const listeningPids = await getPortPids();

	if (!listeningPids.includes(state.pid)) {
		await removeState();
		if (!quiet) {
			console.log('No tracked dev:local server is running.');
		}
		return;
	}

	process.kill(state.pid, 'SIGTERM');

	if (!(await waitForPidToStopListening(state.pid))) {
		process.kill(state.pid, 'SIGKILL');
		await waitForPidToStopListening(state.pid);
	}

	await removeState();

	if (!quiet) {
		console.log(`Stopped dev:local server on ${url}.`);
	}
};

const startServer = async ({ open = true } = {}) => {
	await stopServer({ quiet: true });

	const existingPids = await getPortPids();
	if (existingPids.length > 0 || !(await isPortFree())) {
		throw new Error(`Port ${port} is already in use. Stop the process using it, then rerun npm run dev:local.`);
	}

	await syncSitePublic();
	await runAstro(['dev', '--background', '--host', host, '--port', String(port)]);
	await waitForServer();

	const startedPids = await getPortPids();
	await writeState(startedPids[0] ?? null);
	if (open) {
		await openBrowser();
	} else {
		console.log(`Browser open skipped. Open ${url}`);
	}

	console.log(`Astro dev server is running at ${url}`);
	console.log('Manage it with npm run dev:status, npm run dev:logs, npm run dev:restart, and npm run dev:stop.');
};

const showStatus = async () => {
	const state = await readState();
	const listeningPids = await getPortPids();
	const reachable = await isServerReachable();

	if (state?.pid && listeningPids.includes(state.pid)) {
		const reachability = reachable ? '' : ' The listener is active, but the URL probe did not respond.';
		console.log(`dev:local is running at ${url} (pid ${state.pid}).${reachability}`);
		return;
	}

	if (reachable) {
		const detail = state?.pid
			? `the tracked pid ${state.pid} is not listening`
			: 'no dev:local state file was found';
		console.log(`A server is responding at ${url}, but ${detail}.`);
		return;
	}

	if (state) {
		await removeState();
	}

	console.log(`No dev:local server is running at ${url}.`);
};

const showLogs = async () => {
	const shouldFollow = process.argv.includes('--follow');

	if (shouldFollow) {
		const tail = spawn('tail', ['-n', '80', '-f', logPath], { stdio: 'inherit' });
		await new Promise((resolve, reject) => {
			tail.once('exit', resolve);
			tail.once('error', reject);
		});
		return;
	}

	try {
		const lines = (await readFile(logPath, 'utf8')).trimEnd().split('\n');
		console.log(lines.slice(-80).join('\n'));
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log('No dev log found.');
			return;
		}

		throw error;
	}
};

if (command === 'start') {
	await startServer({ open: !skipOpen });
} else if (command === 'status') {
	await showStatus();
} else if (command === 'logs') {
	await showLogs();
} else if (command === 'restart') {
	await startServer({ open: false });
} else if (command === 'stop') {
	await stopServer();
} else {
	throw new Error(`Unknown dev-local command: ${command}`);
}
