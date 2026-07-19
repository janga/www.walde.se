import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const contentImageName = z.string().regex(/^[a-z0-9][a-z0-9.-]*\.(jpe?g|png)$/i);

const galleryImage = z.object({
	image: contentImageName,
	alt: z.string(),
	caption: z.string().optional(),
});

const site = defineCollection({
	loader: glob({ pattern: 'content.md', base: './site' }),
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
