import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const publicImagePath = z.string().startsWith('/');

const image = z.object({
	src: publicImagePath,
	alt: z.string(),
	caption: z.string().optional(),
});

const galleryImage = z.object({
	src: publicImagePath,
	alt: z.string(),
	title: z.string().optional(),
	year: z.union([z.string(), z.number()]).optional(),
	technique: z.string().optional(),
	material: z.string().optional(),
	dimensions: z.string().optional(),
	edition: z.string().optional(),
	location: z.string().optional(),
	status: z.string().optional(),
	caption: z.string().optional(),
	text: z.string().optional(),
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
				image: image.optional(),
				gallery: z.array(galleryImage).default([]),
			}),
		).min(1),
	}),
});

export const collections = { site };
