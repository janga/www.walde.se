import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
	getFrontmatterSections,
	getImageIndex,
	readSiteFile,
	supportedImageExtensions,
} from './lib/site-content.mjs';
import projectConfig from './lib/project-config.mjs';
import {
	astroPublicDir,
	generatedImagesDir,
	generatedImagesManifestPath,
	originalImagesDir,
	siteConfigLabel,
	siteContentLabel,
	siteContentPath,
	siteImagesDir,
	siteImagesLabel,
} from './lib/site-paths.mjs';

const execFileAsync = promisify(execFile);

const imageMetadataVersion = 2;
const widths = [480, 768, 1080, 1440, 1920];
const creatorTags = ['Artist', 'Creator', 'By-line'];
const metadataReadTags = [
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
const metadataCopyTags = [
	'-XMP-dc:Creator',
	'-XMP-dc:Rights',
	'-XMP-xmpRights:Marked',
	'-XMP-xmpRights:Owner',
	'-XMP-photoshop:Credit',
	'-IPTC:By-line',
	'-IPTC:CopyrightNotice',
	'-IPTC:Credit',
	'-EXIF:Artist',
	'-EXIF:Copyright',
];

const run = async (command, args) => {
	const { stdout } = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 * 10 });
	return stdout.trim();
};

const canRun = async (command, args = ['-version']) => {
	try {
		await run(command, args);
		return true;
	} catch {
		return false;
	}
};

const getImageMagick = async () => {
	if (await canRun('magick')) {
		return {
			identify: (sourcePath) => run('magick', ['identify', '-format', '%w %h', sourcePath]),
			convert: (sourcePath, outputPath, width) => run('magick', [
				sourcePath,
				'-auto-orient',
				'-resize',
				`${width}x`,
				'-strip',
				'-quality',
				'82',
				outputPath,
			]),
		};
	}

	if (await canRun('identify') && await canRun('convert')) {
		return {
			identify: (sourcePath) => run('identify', ['-format', '%w %h', sourcePath]),
			convert: (sourcePath, outputPath, width) => run('convert', [
				sourcePath,
				'-auto-orient',
				'-resize',
				`${width}x`,
				'-strip',
				'-quality',
				'82',
				outputPath,
			]),
		};
	}

	throw new Error('ImageMagick is missing. Install either the "magick" command or both "identify" and "convert".');
};

const getExifTool = async () => {
	if (await canRun('exiftool', ['-ver'])) {
		return {
			read: (sourcePath) => run('exiftool', ['-json', ...metadataReadTags, sourcePath]),
			copy: (sourcePath, outputPath) => run('exiftool', [
				'-overwrite_original',
				'-TagsFromFile',
				sourcePath,
				...metadataCopyTags,
				outputPath,
			]),
		};
	}

	throw new Error('exiftool is missing. Install exiftool or use the GitHub Actions workflow that installs it.');
};

const toPublicPath = (filePath) => filePath.split(path.sep).join('/');
const getPublicPath = (filePath) => `/${toPublicPath(path.relative(astroPublicDir, filePath))}`;
const getSiteImagePath = (filePath) => toPublicPath(path.relative(siteImagesDir, filePath));
const getFilePathFromPublicPath = (publicPath) => path.join(astroPublicDir, publicPath.replace(/^\//, ''));

const getGeneratedPath = (sourcePath, width) => {
	const parsed = path.parse(path.relative(siteImagesDir, sourcePath));
	return path.join(generatedImagesDir, parsed.dir, `${parsed.name}-${width}.webp`);
};

const fail = (message) => {
	throw new Error(message);
};

const getReferencedImages = async () => {
	const { frontmatter } = await readSiteFile(siteContentPath);
	const sections = getFrontmatterSections(frontmatter);
	const references = [];

	for (const section of sections) {
		const imageReferences = section.imageReferences ?? section.images.map((image) => ({ image }));
		for (const { image, line } of imageReferences) {
			references.push({
				image,
				line,
				sectionId: section.id,
			});
		}
	}

	return references;
};

const getContentSourcePath = ({ image, line }, imageIndex) => {
	if (image.includes('/') || image.includes('\\') || image.startsWith('/')) {
		fail(`Image reference must be a filename without a directory: ${image}`);
	}

	const extension = path.extname(image).toLowerCase();
	if (!supportedImageExtensions.has(extension)) {
		fail(`Image reference uses an unsupported file type: ${image}`);
	}

	const sourcePath = imageIndex.get(image);

	if (!sourcePath) {
		fail(`Image file "${image}" does not exist anywhere under ${siteImagesLabel}/.`);
	}

	return sourcePath;
};

const getReferencedSources = async () => {
	const references = await getReferencedImages();
	const imageIndex = await getImageIndex(siteImagesDir, fail);
	const seen = new Map();
	const sources = [];

	for (const reference of references) {
		const sourcePath = getContentSourcePath(reference, imageIndex);
		const siteImagePath = getSiteImagePath(sourcePath);
		const imageName = path.basename(sourcePath);

		if (seen.has(imageName)) {
			const firstReference = seen.get(imageName);
			fail(`Image reference "${imageName}" appears more than once in ${siteContentLabel}, on lines ${firstReference.line} and ${reference.line}.`);
		}

		const fileStat = await stat(sourcePath).catch(() => null);
		if (!fileStat?.isFile()) {
			fail(`Image file does not exist: ${siteImagesLabel}/${siteImagePath}`);
		}

		const currentDirectory = path.basename(path.dirname(sourcePath));
		if (reference.sectionId && currentDirectory !== reference.sectionId) {
			fail(`Image "${imageName}" is used in section "${reference.sectionId}" but is located in ${siteImagesLabel}/${currentDirectory}/. Run npm run content:sync to move it.`);
		}

		seen.set(imageName, reference);
		sources.push(sourcePath);
	}

	return sources.sort();
};

const identify = async (sourcePath) => {
	const output = await imageMagick.identify(sourcePath);
	const [width, height] = output.split(' ').map(Number);
	return { width, height };
};

const convert = async (sourcePath, outputPath, width) => {
	await mkdir(path.dirname(outputPath), { recursive: true });
	await imageMagick.convert(sourcePath, outputPath, width);
	await exifTool.copy(sourcePath, outputPath);
};

const getHash = (value) => createHash('sha256').update(value).digest('hex');

const getSourceHash = async (sourcePath) => {
	const file = await readFile(sourcePath);
	return getHash(file);
};

const readMetadata = async (sourcePath) => {
	const output = await exifTool.read(sourcePath);
	return JSON.parse(output)[0] ?? {};
};

const hasCreatorMetadata = (metadata) => creatorTags.some((tag) => {
	const value = metadata[tag];
	return typeof value === 'string' ? value.trim() : Boolean(value);
});

const getImageMetadataHash = (metadata) => getHash(JSON.stringify(
	Object.fromEntries(metadataReadTags.map((tag) => {
		const key = tag.slice(1);
		return [key, metadata[key] ?? null];
	})),
));

const validateSourceMetadata = (sourcePath, metadata) => {
	if (!projectConfig.images.requireCopyrightMetadata) {
		return;
	}

	if (hasCreatorMetadata(metadata)) {
		return;
	}

	fail(`Image file is missing creator/artist metadata: ${siteImagesLabel}/${getSiteImagePath(sourcePath)}. Run npm run metadata:fix and commit the updated image, or set images.requireCopyrightMetadata to false in ${siteConfigLabel} for this site.`);
};

const getVariantWidths = ({ width }) => {
	const variantWidths = widths.filter((candidateWidth) => candidateWidth <= width);

	if (!variantWidths.includes(width)) {
		variantWidths.push(width);
	}

	return variantWidths;
};

const getVariants = (sourcePath, variantWidths) => variantWidths.map((width) => ({
	src: getPublicPath(getGeneratedPath(sourcePath, width)),
	width,
}));

const readManifest = async () => {
	try {
		return JSON.parse(await readFile(generatedImagesManifestPath, 'utf8'));
	} catch (error) {
		if (error?.code === 'ENOENT') {
			return {};
		}

		throw error;
	}
};

const fileExists = async (filePath) => {
	const fileStat = await stat(filePath).catch(() => null);
	return fileStat?.isFile() ?? false;
};

const hasGeneratedVariants = async (variants) => {
	for (const variant of variants) {
		if (!(await fileExists(getFilePathFromPublicPath(variant.src)))) {
			return false;
		}
	}

	return true;
};

const getReusableEntry = async (sourcePath, previousEntry, sourceHash, metadataHash) => {
	if (
		previousEntry?.sourceHash !== sourceHash
		|| previousEntry?.metadataVersion !== imageMetadataVersion
		|| previousEntry?.metadataHash !== metadataHash
		|| !Number.isFinite(previousEntry?.width)
		|| !Number.isFinite(previousEntry?.height)
	) {
		return null;
	}

	const variants = getVariants(sourcePath, getVariantWidths(previousEntry));

	if (!(await hasGeneratedVariants(variants))) {
		return null;
	}

	return {
		sourceHash,
		metadataVersion: imageMetadataVersion,
		metadataHash,
		width: previousEntry.width,
		height: previousEntry.height,
		variants,
	};
};

const listGeneratedFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
		if (error?.code === 'ENOENT') {
			return [];
		}

		throw error;
	});
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...await listGeneratedFiles(entryPath));
		} else if (entry.isFile()) {
			files.push(entryPath);
		}
	}

	return files;
};

const removeUnreferencedGeneratedFiles = async (manifest) => {
	const expectedFiles = new Set(
		Object.values(manifest)
			.flatMap((entry) => entry.variants ?? [])
			.map((variant) => getFilePathFromPublicPath(variant.src)),
	);
	const generatedFiles = await listGeneratedFiles(generatedImagesDir);

	for (const generatedFile of generatedFiles) {
		if (!expectedFiles.has(generatedFile)) {
			await rm(generatedFile, { force: true });
		}
	}
};

const imageMagick = await getImageMagick();
const exifTool = await getExifTool();

await rm(originalImagesDir, { recursive: true, force: true });
await mkdir(generatedImagesDir, { recursive: true });

const sources = await getReferencedSources();
const previousManifest = await readManifest();
const manifest = {};

for (const sourcePath of sources) {
	const imageName = path.basename(sourcePath);
	const sourceHash = await getSourceHash(sourcePath);
	const sourceMetadata = await readMetadata(sourcePath);
	validateSourceMetadata(sourcePath, sourceMetadata);
	const metadataHash = getImageMetadataHash(sourceMetadata);
	const reusableEntry = await getReusableEntry(sourcePath, previousManifest[imageName], sourceHash, metadataHash);

	if (reusableEntry) {
		manifest[imageName] = reusableEntry;
		continue;
	}

	const dimensions = await identify(sourcePath);
	const variantWidths = getVariantWidths(dimensions);
	const variants = getVariants(sourcePath, variantWidths);
	for (const width of variantWidths) {
		const outputPath = getGeneratedPath(sourcePath, width);
		await convert(sourcePath, outputPath, width);
	}

	manifest[imageName] = {
		sourceHash,
		metadataVersion: imageMetadataVersion,
		metadataHash,
		width: dimensions.width,
		height: dimensions.height,
		variants,
	};
}

await removeUnreferencedGeneratedFiles(manifest);
await mkdir(path.dirname(generatedImagesManifestPath), { recursive: true });
await writeFile(generatedImagesManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
