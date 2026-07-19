import path from 'node:path';

const siteDirectoryEnvName = 'CLI_GALLERY_SITE_DIR';
const defaultSiteDirectory = 'site';

export const root = process.cwd();
export const siteDirectoryEnv = siteDirectoryEnvName;
export const siteDirectory = (process.env[siteDirectoryEnvName] ?? defaultSiteDirectory).trim();

if (!siteDirectory) {
	throw new Error(`${siteDirectoryEnvName} must not be empty.`);
}

const toPosixPath = (filePath) => filePath.split(path.sep).join('/');
const getPathLabel = (filePath) => {
	const relativePath = path.relative(root, filePath);

	if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
		return toPosixPath(relativePath);
	}

	return toPosixPath(filePath);
};

export const siteDir = path.resolve(root, siteDirectory);
export const siteConfigPath = path.join(siteDir, 'config.mjs');
export const siteContentPath = path.join(siteDir, 'content.md');
export const siteImagesDir = path.join(siteDir, 'images');
export const sitePublicDir = path.join(siteDir, 'public');
export const astroPublicDir = path.join(root, 'public');
export const generatedImagesDir = path.join(astroPublicDir, 'images', 'generated');
export const originalImagesDir = path.join(astroPublicDir, 'images', 'original');
export const generatedImagesManifestPath = path.join(root, 'src', 'data', 'generated-images.json');

export const siteDirLabel = getPathLabel(siteDir);
export const siteConfigLabel = getPathLabel(siteConfigPath);
export const siteContentLabel = getPathLabel(siteContentPath);
export const siteImagesLabel = getPathLabel(siteImagesDir);
export const sitePublicLabel = getPathLabel(sitePublicDir);
