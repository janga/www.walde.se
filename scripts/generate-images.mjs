import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const root = process.cwd();
const publicDir = path.join(root, 'public');
const generatedDir = path.join(publicDir, 'bilder', 'generated');
const manifestPath = path.join(root, 'src', 'data', 'generated-images.json');
const widths = [480, 768, 1080, 1440];
const sourceRoots = [
	path.join(publicDir, 'bilder', 'cropped-bakgrund-3.jpg'),
	path.join(publicDir, 'bilder', 'site'),
];
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png']);

const run = async (command, args) => {
	const { stdout } = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 * 10 });
	return stdout.trim();
};

const getPublicPath = (filePath) => `/${path.relative(publicDir, filePath).split(path.sep).join('/')}`;

const getGeneratedPath = (sourcePath, width) => {
	const parsed = path.parse(path.relative(path.join(publicDir, 'bilder'), sourcePath));
	return path.join(generatedDir, parsed.dir, `${parsed.name}-${width}.webp`);
};

const walk = async (entry) => {
	const files = [];
	const stats = await readdir(entry, { withFileTypes: true }).catch(() => null);

	if (!stats) {
		return supportedExtensions.has(path.extname(entry).toLowerCase()) ? [entry] : [];
	}

	for (const stat of stats) {
		const fullPath = path.join(entry, stat.name);
		if (stat.isDirectory()) {
			files.push(...await walk(fullPath));
		} else if (supportedExtensions.has(path.extname(stat.name).toLowerCase())) {
			files.push(fullPath);
		}
	}

	return files;
};

const identify = async (sourcePath) => {
	const output = await run('magick', ['identify', '-format', '%w %h', sourcePath]);
	const [width, height] = output.split(' ').map(Number);
	return { width, height };
};

const convert = async (sourcePath, outputPath, width) => {
	await mkdir(path.dirname(outputPath), { recursive: true });
	await run('magick', [
		sourcePath,
		'-auto-orient',
		'-resize',
		`${width}x`,
		'-strip',
		'-quality',
		'82',
		outputPath,
	]);
};

await rm(generatedDir, { recursive: true, force: true });
await mkdir(generatedDir, { recursive: true });

const sources = (await Promise.all(sourceRoots.map(walk))).flat().sort();
const manifest = {};

for (const sourcePath of sources) {
	const dimensions = await identify(sourcePath);
	const variantWidths = widths.filter((width) => width <= dimensions.width);

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

	manifest[getPublicPath(sourcePath)] = {
		width: dimensions.width,
		height: dimensions.height,
		variants,
	};
}

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
