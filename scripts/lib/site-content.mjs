import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { siteContentLabel, siteImagesLabel } from './site-paths.mjs';

export const supportedImageExtensions = new Set(['.jpg', '.jpeg', '.png']);

const h2Regex = /^##\s+.*$/gm;
const explicitHeadingIdRegex = /\s*\{#([a-z0-9-]+)\}\s*$/;

export const toPosixPath = (filePath) => filePath.split(path.sep).join('/');

export const splitSiteFile = (source) => {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

	if (!match) {
		throw new Error(`${siteContentLabel} is missing frontmatter delimited by ---.`);
	}

	return {
		frontmatter: match[0],
		frontmatterBody: match[1],
		body: source.slice(match[0].length),
	};
};

export const readSiteFile = async (sitePath) => splitSiteFile(await readFile(sitePath, 'utf8'));

export const getFrontmatterSections = (frontmatter) => {
	const sections = [];
	const lines = frontmatter.split(/\r?\n/);
	let inSections = false;
	let currentSection = null;

	for (const [index, line] of lines.entries()) {
		if (/^sections:\s*$/.test(line)) {
			inSections = true;
			continue;
		}

		if (!inSections) continue;
		if (/^[a-zA-Z0-9_-]+:/.test(line)) break;

		const sectionMatch = line.match(/^\s{2}-\s+id:\s*([a-z0-9-]+)\s*$/);
		if (sectionMatch) {
			currentSection = { id: sectionMatch[1], images: [], imageReferences: [] };
			sections.push(currentSection);
			continue;
		}

		const imageMatch = line.match(/^\s{6}-\s+image:\s*["']?([^"'\n]+)["']?\s*$/);
		if (imageMatch && currentSection) {
			const image = imageMatch[1].trim();
			currentSection.images.push(image);
			currentSection.imageReferences.push({ image, line: index + 1 });
		}
	}

	return sections;
};

export const getHeadingId = (heading) => heading.match(explicitHeadingIdRegex)?.[1];

export const getBodySections = (body) => {
	const matches = Array.from(body.matchAll(h2Regex));
	const prelude = matches.length > 0 ? body.slice(0, matches[0].index) : body;
	const sections = [];

	for (let index = 0; index < matches.length; index += 1) {
		const match = matches[index];
		const start = match.index ?? 0;
		const next = matches[index + 1];
		const end = next?.index ?? body.length;
		const text = body.slice(start, end).trimEnd();
		const heading = match[0];
		const id = getHeadingId(heading);

		sections.push({ id, heading, text });
	}

	return { prelude, sections };
};

export const getImageFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...await getImageFiles(entryPath));
		} else if (entry.isFile() && supportedImageExtensions.has(path.extname(entry.name).toLowerCase())) {
			files.push(entryPath);
		}
	}

	return files;
};

export const getImageIndex = async (contentDir, fail) => {
	const imageFiles = await getImageFiles(contentDir);
	const imagesByName = new Map();

	for (const imagePath of imageFiles) {
		const imageName = path.basename(imagePath);
		const existingPath = imagesByName.get(imageName);

		if (existingPath) {
			fail(`Duplicate image filename "${imageName}" found at ${siteImagesLabel}/${toPosixPath(path.relative(contentDir, existingPath))} and ${siteImagesLabel}/${toPosixPath(path.relative(contentDir, imagePath))}. Image filenames must be globally unique.`);
			continue;
		}

		imagesByName.set(imageName, imagePath);
	}

	return imagesByName;
};
