import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
	loader: glob({ pattern: ['*.md', '!README.md'], base: './content/pages' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		hidden: z.boolean().default(false),
	}),
});

const galleries = defineCollection({
	loader: glob({
		pattern: '*/gallery.json',
		base: './content/galleries',
		generateId: ({ entry }) => entry.split('/')[0],
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		placeholder: z.string().default('Under konstruktion'),
		images: z.array(
			z.object({
				file: z.string(),
				title: z.string(),
				alt: z.string(),
				caption: z.string().optional(),
				year: z.union([z.string(), z.number()]).optional(),
				order: z.number().int(),
			}),
		),
	}),
});

export const collections = { pages, galleries };
