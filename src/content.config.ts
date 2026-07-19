import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { isAbsolute } from 'node:path';
import { z } from 'astro/zod';

const siteDirectory = (process.env.CLI_GALLERY_SITE_DIR ?? 'site').trim();
if (!siteDirectory) {
	throw new Error('CLI_GALLERY_SITE_DIR must not be empty.');
}

const siteBase = siteDirectory.startsWith('.') || isAbsolute(siteDirectory)
	? siteDirectory
	: `./${siteDirectory}`;
const contentImageName = z.string().regex(/^[a-z0-9][a-z0-9.-]*\.(jpe?g|png)$/i);

const galleryImage = z.object({
	image: contentImageName,
	alt: z.string(),
	caption: z.string().optional(),
});

const site = defineCollection({
	loader: glob({ pattern: 'content.md', base: siteBase }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		copyrightOwner: z.string().min(1),
		sections: z.array(
			z.object({
				id: z.string().regex(/^[a-z0-9-]+$/),
				gallery: z.array(galleryImage).optional().default([]),
			}),
		).min(1),
	}),
});

export const collections = { site };
