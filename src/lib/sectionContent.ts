import type { CollectionEntry } from 'astro:content';

type SiteSection = CollectionEntry<'site'>['data']['sections'][number];

const headingRegex = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;

const stripTags = (html: string) => html.replace(/<[^>]*>/g, '');

const decodeHtmlEntities = (value: string) =>
	value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

const slugify = (value: string) =>
	decodeHtmlEntities(stripTags(value))
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/å/g, 'a')
		.replace(/ä/g, 'a')
		.replace(/ö/g, 'o')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const getHeadingId = (attributes: string, headingHtml: string) => {
	const id = attributes.match(/\sid=(["'])(.*?)\1/i)?.[2];
	return id ? decodeHtmlEntities(id) : slugify(headingHtml);
};

export const getSectionHtml = (html: string, sections: SiteSection[]) => {
	const matches = Array.from(html.matchAll(headingRegex));
	const contentById = new Map<string, string>();
	const contentByTitleSlug = new Map<string, string>();

	for (let index = 0; index < matches.length; index += 1) {
		const match = matches[index];
		const attributes = match[1] ?? '';
		const headingHtml = match[2] ?? '';
		const contentStart = (match.index ?? 0) + match[0].length;
		const nextMatch = matches[index + 1];
		const contentEnd = nextMatch?.index ?? html.length;
		const content = html.slice(contentStart, contentEnd).trim();

		contentById.set(getHeadingId(attributes, headingHtml), content);
		contentByTitleSlug.set(slugify(headingHtml), content);
	}

	return Object.fromEntries(
		sections.map((section) => [
			section.id,
			contentById.get(section.id) ?? contentByTitleSlug.get(slugify(section.title)) ?? '',
		]),
	);
};
