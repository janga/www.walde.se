import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const contentImagePath = z.string().regex(/^[a-z0-9][a-z0-9./-]*\.(jpe?g|png)$/i);

const galleryImage = z.object({
	src: contentImagePath,
	alt: z.string(),
	caption: z.string().optional(),
});

const site = defineCollection({
	loader: glob({ pattern: 'site.md', base: './content' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		sections: z.array(
			z.object({
				id: z.string().regex(/^[a-z0-9-]+$/),
				title: z.string(),
				gallery: z.array(galleryImage).default([]),
			}),
		).min(1),
	}),
});

export const collections = { site };
