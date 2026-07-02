import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
const imageRightsProfilePath = path.join(tmpdir(), 'karin-walde-image-rights.xmp');
const imageMetadataVersion = 1;
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
				'-profile',
				imageRightsProfilePath,
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
				'-profile',
				imageRightsProfilePath,
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
const getFilePathFromPublicPath = (publicPath) => path.join(publicDir, publicPath.replace(/^\//, ''));

const getGeneratedPath = (sourcePath, width) => {
	const parsed = path.parse(path.relative(contentDir, sourcePath));
	return path.join(generatedDir, parsed.dir, `${parsed.name}-${width}.webp`);
};

const fail = (message) => {
	throw new Error(message);
};

const getSiteContent = () => readFile(siteContentPath, 'utf8');

const getFrontmatter = (siteContent) => {
	const match = siteContent.match(/^---\n([\s\S]*?)\n---/);

	if (!match) {
		fail('content/site.md saknar frontmatter.');
	}

	return match[1];
};

const getCopyrightOwner = async () => {
	const frontmatter = getFrontmatter(await getSiteContent());
	const match = frontmatter.match(/^copyrightOwner:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
	const copyrightOwner = (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();

	if (!copyrightOwner) {
		fail('content/site.md måste ange copyrightOwner i frontmatter.');
	}

	return copyrightOwner;
};

const getReferencedImages = async () => {
	const siteContent = await getSiteContent();
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

const getHash = (value) => createHash('sha256').update(value).digest('hex');

const getSourceHash = async (sourcePath) => {
	const file = await readFile(sourcePath);
	return getHash(file);
};

const escapeXml = (value) => value
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;')
	.replaceAll("'", '&apos;');

const getCopyrightNotice = (copyrightOwner) => `Copyright ${copyrightOwner}. All rights reserved.`;

const getImageRightsXmp = (copyrightOwner) => {
	const escapedOwner = escapeXml(copyrightOwner);
	const escapedNotice = escapeXml(getCopyrightNotice(copyrightOwner));

	return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">
<dc:creator><rdf:Seq><rdf:li>${escapedOwner}</rdf:li></rdf:Seq></dc:creator>
<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${escapedNotice}</rdf:li></rdf:Alt></dc:rights>
<xmpRights:Marked>True</xmpRights:Marked>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
};

const getImageMetadataHash = (copyrightOwner) => getHash([
	imageMetadataVersion,
	copyrightOwner,
	getCopyrightNotice(copyrightOwner),
].join('\n'));

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
		return JSON.parse(await readFile(manifestPath, 'utf8'));
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
	const generatedFiles = await listGeneratedFiles(generatedDir);

	for (const generatedFile of generatedFiles) {
		if (!expectedFiles.has(generatedFile)) {
			await rm(generatedFile, { force: true });
		}
	}
};

const imageMagick = await getImageMagick();

await rm(originalDir, { recursive: true, force: true });
await mkdir(generatedDir, { recursive: true });
const copyrightOwner = await getCopyrightOwner();
const metadataHash = getImageMetadataHash(copyrightOwner);
await writeFile(imageRightsProfilePath, getImageRightsXmp(copyrightOwner));

const sources = await getReferencedSources();
const previousManifest = await readManifest();
const manifest = {};

for (const sourcePath of sources) {
	const contentPath = getContentPath(sourcePath);
	const sourceHash = await getSourceHash(sourcePath);
	const reusableEntry = await getReusableEntry(sourcePath, previousManifest[contentPath], sourceHash, metadataHash);

	if (reusableEntry) {
		manifest[contentPath] = reusableEntry;
		continue;
	}

	const dimensions = await identify(sourcePath);
	const variantWidths = getVariantWidths(dimensions);
	const variants = getVariants(sourcePath, variantWidths);
	for (const width of variantWidths) {
		const outputPath = getGeneratedPath(sourcePath, width);
		await convert(sourcePath, outputPath, width);
	}

	manifest[contentPath] = {
		sourceHash,
		metadataVersion: imageMetadataVersion,
		metadataHash,
		width: dimensions.width,
		height: dimensions.height,
		variants,
	};
}

await removeUnreferencedGeneratedFiles(manifest);
await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
