import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import {
	getBodySections,
	getFrontmatterSections,
	getImageIndex,
	readSiteFile,
} from './lib/site-content.mjs';

const root = process.cwd();
const sitePath = path.join(root, 'content', 'site.md');
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const shouldCheck = args.has('--check') || !shouldWrite;
const skipPrompt = args.has('--yes');

const fail = (message) => {
	console.error(message);
	process.exitCode = 1;
};

const promptForWrite = async () => {
	if (skipPrompt) return true;
	if (!process.stdin.isTTY) return false;

	const rl = createInterface({ input, output });
	const answer = await rl.question('This will rewrite Markdown sections in content/site.md and move gallery image files if needed. Continue? [y/N] ');
	rl.close();

	return answer.trim().toLowerCase() === 'y';
};

const { frontmatter, body } = await readSiteFile(sitePath);
const frontmatterSections = getFrontmatterSections(frontmatter);
const frontmatterIds = frontmatterSections.map((section) => section.id);
const { prelude, sections } = getBodySections(body);
const sectionsById = new Map();
const extraSections = [];
const imageIndex = await getImageIndex(path.join(root, 'content'), fail);
const imageMoves = [];
const referencedImages = new Map();
let hasProblem = false;

for (const section of sections) {
	if (!section.id) {
		console.warn(`Markdown section is missing an explicit heading id: ${section.heading}`);
		continue;
	}

	if (sectionsById.has(section.id)) {
		fail(`Duplicate Markdown section heading id: ${section.id}`);
		hasProblem = true;
		continue;
	}

	sectionsById.set(section.id, section);
}

for (const id of frontmatterIds) {
	if (!sectionsById.has(id)) {
		fail(`Cannot find heading for "${id}". Add a level 2 Markdown heading, for example: ## Heading {#${id}}`);
		hasProblem = true;
	}
}

for (const section of sections) {
	if (section.id && !frontmatterIds.includes(section.id)) {
		console.warn(`Markdown section exists but is not used in frontmatter: ${section.id}`);
		extraSections.push(section);
	}
}

const orderedSections = [
	...frontmatterIds.map((id) => sectionsById.get(id)).filter(Boolean),
	...extraSections,
];
const currentOrder = sections.map((section) => section.id).filter(Boolean);
const expectedOrder = orderedSections.map((section) => section.id).filter(Boolean);
const hasOrderMismatch =
	currentOrder.length !== expectedOrder.length ||
	currentOrder.some((id, index) => id !== expectedOrder[index]);

if (hasOrderMismatch) {
	console.warn('Markdown section order differs from frontmatter.');
}

for (const section of frontmatterSections) {
	for (const imageName of section.images) {
		if (imageName.includes('/') || imageName.includes('\\')) {
			fail(`Image reference "${imageName}" in section "${section.id}" must be a filename without a directory.`);
			hasProblem = true;
			continue;
		}

		if (referencedImages.has(imageName)) {
			fail(`Image "${imageName}" is referenced more than once, in sections "${referencedImages.get(imageName)}" and "${section.id}".`);
			hasProblem = true;
			continue;
		}

		referencedImages.set(imageName, section.id);

		const imagePath = imageIndex.get(imageName);
		if (!imagePath) {
			fail(`Image "${imageName}" referenced in section "${section.id}" does not exist under content/.`);
			hasProblem = true;
			continue;
		}

		const currentDirectory = path.basename(path.dirname(imagePath));
		if (currentDirectory !== section.id) {
			const targetPath = path.join(root, 'content', section.id, imageName);
			const targetExists = await stat(targetPath).then((entry) => entry.isFile()).catch(() => false);

			if (targetExists) {
				fail(`Cannot move image "${imageName}" to content/${section.id}/ because the target file already exists.`);
				hasProblem = true;
				continue;
			}

			imageMoves.push({ imageName, from: imagePath, to: targetPath, sectionId: section.id });

			if (!shouldWrite) {
				fail(`Image "${imageName}" is used in section "${section.id}" but is located in content/${currentDirectory}/. Run npm run content:sync to move it.`);
				hasProblem = true;
			}
		}
	}
}

if (hasProblem) process.exit(process.exitCode ?? 1);

if (shouldCheck) {
	if (!hasOrderMismatch && imageMoves.length === 0) {
		console.log('content/site.md: section order and gallery image locations match frontmatter.');
	}
	process.exit(process.exitCode ?? 0);
}

if (!hasOrderMismatch && imageMoves.length === 0) {
	console.log('content/site.md: no sync needed.');
	process.exit(0);
}

const canWrite = await promptForWrite();

if (!canWrite) {
	console.log('Aborted. No file was changed.');
	process.exit(1);
}

const nextBody = `${prelude}${orderedSections.map((section) => section.text).join('\n')}\n`;
if (hasOrderMismatch) {
	await writeFile(sitePath, `${frontmatter}${nextBody}`);
	console.log('content/site.md: Markdown sections were sorted according to frontmatter.');
}

for (const move of imageMoves) {
	await mkdir(path.dirname(move.to), { recursive: true });
	await rename(move.from, move.to);
	console.log(`Moved image "${move.imageName}" to content/${move.sectionId}/.`);
}
