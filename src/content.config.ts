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
	text: z.string().optional(),
});

const contentGroup = z.object({
	title: z.string(),
	items: z.array(z.string()).optional(),
	text: z.array(z.string()).optional(),
});

const contact = z.object({
	phone: z.string().optional(),
	email: z.string().email().optional(),
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
				intro: z.array(z.string()).default([]),
				contact: contact.optional(),
				image: image.optional(),
				groups: z.array(contentGroup).default([]),
				gallery: z.array(galleryImage).default([]),
			}),
		).min(1),
	}),
});

export const collections = { site };
