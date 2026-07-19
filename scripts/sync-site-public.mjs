import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import {
	astroPublicDir,
	sitePublicDir,
	sitePublicLabel,
} from './lib/site-paths.mjs';

const keepAstroPublicEntries = new Set(['images']);

const readDirectory = async (directory) => {
	try {
		return await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (error?.code === 'ENOENT') {
			return [];
		}

		throw error;
	}
};

await mkdir(astroPublicDir, { recursive: true });

for (const entry of await readDirectory(astroPublicDir)) {
	if (keepAstroPublicEntries.has(entry.name)) {
		continue;
	}

	await rm(path.join(astroPublicDir, entry.name), { force: true, recursive: true });
}

for (const entry of await readDirectory(sitePublicDir)) {
	await cp(
		path.join(sitePublicDir, entry.name),
		path.join(astroPublicDir, entry.name),
		{ force: true, recursive: true },
	);
}

console.log(`Synced ${sitePublicLabel}/ to public/.`);
