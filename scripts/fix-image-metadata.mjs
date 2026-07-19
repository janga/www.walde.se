import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
	siteContentLabel,
	siteContentPath,
	siteImagesDir,
} from './lib/site-paths.mjs';

const execFileAsync = promisify(execFile);

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png']);
const metadataTags = [
	'-Artist',
	'-Creator',
	'-By-line',
	'-Copyright',
	'-Rights',
	'-CopyrightNotice',
	'-Credit',
	'-Marked',
	'-Owner',
];
const metadataFieldNames = metadataTags.map((tag) => tag.slice(1));

const run = async (command, args) => {
	const { stdout } = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 * 10 });
	return stdout.trim();
};

const fail = (message) => {
	throw new Error(message);
};

const getFrontmatter = (siteContent) => {
	const match = siteContent.match(/^---\n([\s\S]*?)\n---/);

	if (!match) {
		fail(`${siteContentLabel} is missing frontmatter.`);
	}

	return match[1];
};

const getCopyrightOwner = async () => {
	const frontmatter = getFrontmatter(await readFile(siteContentPath, 'utf8'));
	const match = frontmatter.match(/^copyrightOwner:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
	const copyrightOwner = (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();

	if (!copyrightOwner) {
		fail(`${siteContentLabel} must define copyrightOwner in frontmatter.`);
	}

	return copyrightOwner;
};

const listImageFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...await listImageFiles(entryPath));
			continue;
		}

		if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
			files.push(entryPath);
		}
	}

	return files.sort();
};

const readMetadata = async (imagePath) => {
	const output = await run('exiftool', ['-json', ...metadataTags, imagePath]);
	return JSON.parse(output)[0] ?? {};
};

const hasAnyManagedMetadata = (metadata) => metadataFieldNames.some((tag) => {
	const value = metadata[tag];
	return typeof value === 'string' ? value.trim() : Boolean(value);
});

const writeMetadata = async (imagePath, copyrightOwner) => {
	const copyrightNotice = `Copyright ${copyrightOwner}. All rights reserved.`;

	await run('exiftool', [
		'-overwrite_original',
		`-XMP-dc:Creator=${copyrightOwner}`,
		`-XMP-dc:Rights=${copyrightNotice}`,
		'-XMP-xmpRights:Marked=True',
		`-XMP-xmpRights:Owner=${copyrightOwner}`,
		`-XMP-photoshop:Credit=${copyrightOwner}`,
		`-IPTC:By-line=${copyrightOwner}`,
		`-IPTC:CopyrightNotice=${copyrightNotice}`,
		`-IPTC:Credit=${copyrightOwner}`,
		`-EXIF:Artist=${copyrightOwner}`,
		`-EXIF:Copyright=${copyrightNotice}`,
		imagePath,
	]);
};

await run('exiftool', ['-ver']).catch(() => {
	fail('exiftool is missing. Install exiftool before writing metadata to source images.');
});

const copyrightOwner = await getCopyrightOwner();
const images = await listImageFiles(siteImagesDir);
let updated = 0;
let skipped = 0;

for (const imagePath of images) {
	const fileStat = await stat(imagePath);

	if (!fileStat.isFile()) {
		continue;
	}

	const metadata = await readMetadata(imagePath);

	if (hasAnyManagedMetadata(metadata)) {
		skipped += 1;
		continue;
	}

	await writeMetadata(imagePath, copyrightOwner);
	updated += 1;
}

console.log(`Metadata complete: ${updated} updated, ${skipped} left unchanged.`);
