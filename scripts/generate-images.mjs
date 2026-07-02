import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const root = process.cwd();
const publicDir = path.join(root, 'public');
const contentDir = path.join(root, 'content');
const generatedDir = path.join(publicDir, 'bilder', 'generated');
const originalDir = path.join(publicDir, 'bilder', 'original');
const manifestPath = path.join(root, 'src', 'data', 'generated-images.json');
const siteContentPath = path.join(contentDir, 'site.md');
const widths = [480, 768, 1080, 1440];
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png']);

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

	throw new Error('ImageMagick saknas. Installera antingen kommandot "magick" eller "identify" och "convert".');
};

const toPublicPath = (filePath) => filePath.split(path.sep).join('/');
const getPublicPath = (filePath) => `/${toPublicPath(path.relative(publicDir, filePath))}`;
const getContentPath = (filePath) => toPublicPath(path.relative(contentDir, filePath));

const getGeneratedPath = (sourcePath, width) => {
	const parsed = path.parse(path.relative(contentDir, sourcePath));
	return path.join(generatedDir, parsed.dir, `${parsed.name}-${width}.webp`);
};

const getOriginalPath = (sourcePath) => path.join(originalDir, path.relative(contentDir, sourcePath));

const fail = (message) => {
	throw new Error(message);
};

const getReferencedImages = async () => {
	const siteContent = await readFile(siteContentPath, 'utf8');
	const references = [];
	const srcPattern = /^\s+-?\s*src:\s+["']?([^"'\n]+)["']?\s*$/gm;

	for (const match of siteContent.matchAll(srcPattern)) {
		const source = match[1].trim();
		const line = siteContent.slice(0, match.index).split('\n').length;
		references.push({ source, line });
	}

	return references;
};

const getContentSourcePath = ({ source, line }) => {
	if (source.startsWith('/')) {
		fail(`Bildreferensen på rad ${line} måste vara relativ till content/: ${source}`);
	}

	const extension = path.extname(source).toLowerCase();
	if (!supportedExtensions.has(extension)) {
		fail(`Bildreferensen på rad ${line} har en filtyp som inte stöds: ${source}`);
	}

	const normalizedSource = path.normalize(source);
	const sourcePath = path.resolve(contentDir, normalizedSource);
	const relativePath = path.relative(contentDir, sourcePath);

	if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		fail(`Bildreferensen på rad ${line} pekar utanför content/: ${source}`);
	}

	return sourcePath;
};

const getReferencedSources = async () => {
	const references = await getReferencedImages();
	const seen = new Map();
	const sources = [];

	for (const reference of references) {
		const sourcePath = getContentSourcePath(reference);
		const contentPath = getContentPath(sourcePath);

		if (seen.has(contentPath)) {
			fail(`Bildreferensen ${contentPath} förekommer både på rad ${seen.get(contentPath)} och ${reference.line}.`);
		}

		const fileStat = await stat(sourcePath).catch(() => null);
		if (!fileStat?.isFile()) {
			fail(`Bildfilen som anges på rad ${reference.line} finns inte: content/${contentPath}`);
		}

		seen.set(contentPath, reference.line);
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
};

const imageMagick = await getImageMagick();

await rm(generatedDir, { recursive: true, force: true });
await rm(originalDir, { recursive: true, force: true });
await mkdir(generatedDir, { recursive: true });
await mkdir(originalDir, { recursive: true });

const sources = await getReferencedSources();
const manifest = {};

for (const sourcePath of sources) {
	const dimensions = await identify(sourcePath);
	const originalPath = getOriginalPath(sourcePath);
	const variantWidths = widths.filter((width) => width <= dimensions.width);

	await mkdir(path.dirname(originalPath), { recursive: true });
	await copyFile(sourcePath, originalPath);

	if (!variantWidths.includes(dimensions.width)) {
		variantWidths.push(dimensions.width);
	}

	const variants = [];

	for (const width of variantWidths) {
		const outputPath = getGeneratedPath(sourcePath, width);
		await convert(sourcePath, outputPath, width);
		variants.push({
			src: getPublicPath(outputPath),
			width,
		});
	}

	manifest[getContentPath(sourcePath)] = {
		width: dimensions.width,
		height: dimensions.height,
		originalSrc: getPublicPath(originalPath),
		variants,
	};
}

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
