import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import {
	getBodySections,
	getFrontmatterSections,
	getImageIndex,
	readSiteFile,
	toPosixPath,
} from './lib/site-content.mjs';
import {
	siteContentLabel,
	siteContentPath,
	siteImagesDir,
	siteImagesLabel,
} from './lib/site-paths.mjs';

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const shouldCheck = args.has('--check') || !shouldWrite;
const skipPrompt = args.has('--yes');
const issues = [];

const addIssue = ({ severity, message, fix, sectionId, sectionLabel }) => {
	issues.push({ severity, message, fix, sectionId, sectionLabel });
};

const fail = (message) => {
	addIssue({ severity: 'error', message });
};

const warn = (message) => {
	addIssue({ severity: 'warning', message });
};

const addSectionIssue = (sectionId, issue) => {
	addIssue({
		...issue,
		sectionId,
		sectionLabel: issue.sectionLabel ?? sectionId,
	});
};

const hasErrors = () => issues.some((issue) => issue.severity === 'error');

const promptForWrite = async () => {
	if (skipPrompt) return true;
	if (!process.stdin.isTTY) return false;

	const rl = createInterface({ input, output });
	const answer = await rl.question(`This will rewrite Markdown sections in ${siteContentLabel} and move gallery image files if needed. Continue? [y/N] `);
	rl.close();

	return answer.trim().toLowerCase() === 'y';
};

const { frontmatter, body } = await readSiteFile(siteContentPath);
const frontmatterSections = getFrontmatterSections(frontmatter);
const frontmatterIds = frontmatterSections.map((section) => section.id);
const { prelude, sections } = getBodySections(body);
const sectionsById = new Map();
const extraSections = [];
const imageIndex = await getImageIndex(siteImagesDir, fail);
const imageMoves = [];
const referencedImages = new Map();

const getUnreferencedImages = () => Array.from(imageIndex.entries())
	.filter(([imageName]) => !referencedImages.has(imageName))
	.map(([, imagePath]) => `${siteImagesLabel}/${toPosixPath(path.relative(siteImagesDir, imagePath))}`)
	.sort((left, right) => left.localeCompare(right, 'sv'));

const getSectionReportOrder = () => {
	const order = new Map();
	frontmatterIds.forEach((id, index) => order.set(id, index));
	extraSections.forEach((section, index) => {
		if (!order.has(section.id)) {
			order.set(section.id, frontmatterIds.length + index);
		}
	});
	return order;
};

const groupIssuesBySeverity = (groupedIssues) => [
	['error', 'Errors'],
	['warning', 'Warnings'],
].map(([severity, label]) => ({
	label,
	issues: groupedIssues.filter((issue) => issue.severity === severity),
})).filter((group) => group.issues.length > 0);

const formatIssue = (issue) => [
	`- ${issue.message}`,
	issue.fix ? `  Fix: ${issue.fix}` : null,
].filter(Boolean);

const getReportLines = (title) => {
	const lines = [title];
	const sectionIssues = issues.filter((issue) => issue.sectionId || issue.sectionLabel);
	const globalIssues = issues.filter((issue) => !issue.sectionId && !issue.sectionLabel);

	if (sectionIssues.length > 0) {
		const sectionOrder = getSectionReportOrder();
		const sectionGroups = new Map();

		for (const issue of sectionIssues) {
			const key = issue.sectionId ?? issue.sectionLabel;
			const label = issue.sectionLabel ?? issue.sectionId;

			if (!sectionGroups.has(key)) {
				sectionGroups.set(key, { label, issues: [] });
			}

			sectionGroups.get(key).issues.push(issue);
		}

		const orderedSectionGroups = Array.from(sectionGroups.entries()).sort(([leftKey], [rightKey]) => (
			(sectionOrder.get(leftKey) ?? Number.MAX_SAFE_INTEGER) -
			(sectionOrder.get(rightKey) ?? Number.MAX_SAFE_INTEGER) ||
			leftKey.localeCompare(rightKey, 'sv')
		));

		lines.push('', 'Section and Gallery Issues');

		for (const [, group] of orderedSectionGroups) {
			lines.push('', `[${group.label}]`);

			for (const severityGroup of groupIssuesBySeverity(group.issues)) {
				lines.push(`  ${severityGroup.label}:`);

				for (const issue of severityGroup.issues) {
					for (const line of formatIssue(issue)) {
						lines.push(`  ${line}`);
					}
				}
			}
		}
	}

	if (globalIssues.length > 0) {
		lines.push('', 'Global Content Issues');

		for (const severityGroup of groupIssuesBySeverity(globalIssues)) {
			lines.push('', `${severityGroup.label}:`);

			for (const issue of severityGroup.issues) {
				lines.push(...formatIssue(issue));
			}
		}
	}

	const unreferencedImages = getUnreferencedImages();

	if (unreferencedImages.length > 0) {
		lines.push(
			'',
			'Unreferenced Images',
			`These files are kept in ${siteImagesLabel}/ but are not mounted on the site:`,
		);

		for (const imagePath of unreferencedImages) {
			lines.push(`- ${imagePath}`);
		}
	}

	return lines;
};

const printReport = (title) => {
	const lines = getReportLines(title);
	const output = hasErrors() ? console.error : console.log;
	output(lines.join('\n'));
};

for (const section of sections) {
	if (!section.id) {
		addSectionIssue(null, {
			severity: 'warning',
			sectionLabel: section.heading,
			message: 'Markdown section is missing an explicit heading id.',
			fix: `Write the heading with an explicit id, for example "${section.heading} {#section-id}".`,
		});
		continue;
	}

	if (sectionsById.has(section.id)) {
		addSectionIssue(section.id, {
			severity: 'error',
			message: `Duplicate Markdown section heading id "${section.id}".`,
			fix: 'Each Markdown level 2 section heading must use a unique explicit id.',
		});
		continue;
	}

	sectionsById.set(section.id, section);
}

for (const id of frontmatterIds) {
	if (!sectionsById.has(id)) {
		addSectionIssue(id, {
			severity: 'error',
			message: `Cannot find a Markdown heading for section "${id}".`,
			fix: `Add a level 2 Markdown heading, for example "## Heading {#${id}}".`,
		});
	}
}

for (const section of sections) {
	if (section.id && !frontmatterIds.includes(section.id)) {
		addSectionIssue(section.id, {
			severity: 'warning',
			message: `Markdown section "${section.id}" exists but is not used in frontmatter.`,
			fix: 'Add it to frontmatter sections or remove the unused Markdown section.',
		});
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
	warn('Markdown section order differs from frontmatter.');
}

for (const section of frontmatterSections) {
	for (const imageName of section.images) {
		if (imageName.includes('/') || imageName.includes('\\')) {
			addSectionIssue(section.id, {
				severity: 'error',
				message: `Image reference "${imageName}" must be a filename without a directory.`,
				fix: `Use only the filename in ${siteContentLabel} and keep the file in the matching ${siteImagesLabel}/<section-id>/ directory.`,
			});
			continue;
		}

		if (referencedImages.has(imageName)) {
			const previousSectionId = referencedImages.get(imageName);
			const message = previousSectionId === section.id
				? `Image "${imageName}" is referenced more than once in this section.`
				: `Image "${imageName}" is referenced more than once, in sections "${previousSectionId}" and "${section.id}".`;
			const fix = 'Each image filename can be referenced by only one gallery row.';

			addSectionIssue(previousSectionId, { severity: 'error', message, fix });
			if (previousSectionId !== section.id) {
				addSectionIssue(section.id, { severity: 'error', message, fix });
			}
			continue;
		}

		referencedImages.set(imageName, section.id);

		const imagePath = imageIndex.get(imageName);
		if (!imagePath) {
			addSectionIssue(section.id, {
				severity: 'error',
				message: `Image "${imageName}" does not exist anywhere under ${siteImagesLabel}/.`,
				fix: `Add the source image to ${siteImagesLabel}/${section.id}/ or remove the gallery row.`,
			});
			continue;
		}

		const currentDirectory = path.basename(path.dirname(imagePath));
		if (currentDirectory !== section.id) {
			const targetPath = path.join(siteImagesDir, section.id, imageName);
			const targetExists = await stat(targetPath).then((entry) => entry.isFile()).catch(() => false);

			if (targetExists) {
				addSectionIssue(section.id, {
					severity: 'error',
					message: `Cannot move image "${imageName}" to ${siteImagesLabel}/${section.id}/ because the target file already exists.`,
					fix: 'Rename one of the files so image filenames remain globally unique.',
				});
				continue;
			}

			imageMoves.push({ imageName, from: imagePath, to: targetPath, sectionId: section.id });

			if (!shouldWrite) {
				addSectionIssue(section.id, {
					severity: 'error',
					message: `Image "${imageName}" is used here but is located in ${siteImagesLabel}/${currentDirectory}/.`,
					fix: 'Run npm run content:sync to move it.',
				});
			}
		}
	}
}

if (hasErrors()) {
	printReport(shouldWrite ? 'Content sync failed.' : 'Content check failed.');
	process.exit(1);
}

if (shouldCheck) {
	const title = issues.length > 0
		? 'Content check completed with warnings.'
		: 'Content check passed.';
	printReport(title);
	process.exit(0);
}

if (!hasOrderMismatch && imageMoves.length === 0) {
	console.log(`${siteContentLabel}: no sync needed.`);
	process.exit(0);
}

if (issues.length > 0) {
	printReport('Content sync completed with warnings.');
}

const canWrite = await promptForWrite();

if (!canWrite) {
	console.log('Aborted. No file was changed.');
	process.exit(1);
}

const nextBody = `${prelude}${orderedSections.map((section) => section.text).join('\n')}\n`;
if (hasOrderMismatch) {
	await writeFile(siteContentPath, `${frontmatter}${nextBody}`);
	console.log(`${siteContentLabel}: Markdown sections were sorted according to frontmatter.`);
}

for (const move of imageMoves) {
	await mkdir(path.dirname(move.to), { recursive: true });
	await rename(move.from, move.to);
	console.log(`Moved image "${move.imageName}" to ${siteImagesLabel}/${move.sectionId}/.`);
}
