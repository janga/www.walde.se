import path from 'node:path';

export const root = process.cwd();
export const siteDir = path.join(root, 'site');
export const siteConfigPath = path.join(siteDir, 'config.mjs');
export const siteContentPath = path.join(siteDir, 'content.md');
export const siteImagesDir = path.join(siteDir, 'images');
export const sitePublicDir = path.join(siteDir, 'public');
export const astroPublicDir = path.join(root, 'public');
export const generatedImagesDir = path.join(astroPublicDir, 'images', 'generated');
export const originalImagesDir = path.join(astroPublicDir, 'images', 'original');
export const generatedImagesManifestPath = path.join(root, 'src', 'data', 'generated-images.json');

export const siteConfigLabel = 'site/config.mjs';
export const siteContentLabel = 'site/content.md';
export const siteImagesLabel = 'site/images';
export const sitePublicLabel = 'site/public';
