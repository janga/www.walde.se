import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';

const root = process.cwd();
const sitePath = path.join(root, 'content', 'site.md');
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const shouldCheck = args.has('--check') || !shouldWrite;
const skipPrompt = args.has('--yes');
const h2Regex = /^##\s+.*$/gm;
const explicitHeadingIdRegex = /\s*\{#([a-z0-9-]+)\}\s*$/;

const fail = (message) => {
	console.error(message);
	process.exitCode = 1;
};

const splitSiteFile = (source) => {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

	if (!match) {
		throw new Error('content/site.md is missing frontmatter delimited by ---.');
	}

	return {
		frontmatter: match[0],
		body: source.slice(match[0].length),
	};
};

const getFrontmatterSectionIds = (frontmatter) => {
	const ids = [];
	const lines = frontmatter.split(/\r?\n/);
	let inSections = false;

	for (const line of lines) {
		if (/^sections:\s*$/.test(line)) {
			inSections = true;
			continue;
		}

		if (!inSections) continue;
		if (/^[a-zA-Z0-9_-]+:/.test(line)) break;

		const match = line.match(/^\s{2}-\s+id:\s*([a-z0-9-]+)\s*$/);
		if (match) ids.push(match[1]);
	}

	return ids;
};

const getHeadingId = (heading) => heading.match(explicitHeadingIdRegex)?.[1];

const getBodySections = (body) => {
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

const promptForWrite = async () => {
	if (skipPrompt) return true;
	if (!process.stdin.isTTY) return false;

	const rl = createInterface({ input, output });
	const answer = await rl.question('This will rewrite the Markdown sections in content/site.md. Continue? [y/N] ');
	rl.close();

	return answer.trim().toLowerCase() === 'y';
};

const source = await readFile(sitePath, 'utf8');
const { frontmatter, body } = splitSiteFile(source);
const frontmatterIds = getFrontmatterSectionIds(frontmatter);
const { prelude, sections } = getBodySections(body);
const sectionsById = new Map();
const extraSections = [];
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

if (hasProblem) process.exit(process.exitCode ?? 1);

if (shouldCheck) {
	if (!hasOrderMismatch) {
		console.log('content/site.md: section order matches frontmatter.');
	}
	process.exit(process.exitCode ?? 0);
}

if (!hasOrderMismatch) {
	console.log('content/site.md: no reordering needed.');
	process.exit(0);
}

const canWrite = await promptForWrite();

if (!canWrite) {
	console.log('Aborted. No file was changed.');
	process.exit(1);
}

const nextBody = `${prelude}${orderedSections.map((section) => section.text).join('\n')}\n`;
await writeFile(sitePath, `${frontmatter}${nextBody}`);
console.log('content/site.md: Markdown sections were sorted according to frontmatter.');
