import generatedImages from '../data/generated-images.json';

type GeneratedImage = {
	sourceHash?: string;
	metadataVersion?: number;
	metadataHash?: string;
	width: number;
	height: number;
	variants: Array<{
		src: string;
		width: number;
	}>;
};

const images = generatedImages as Record<string, GeneratedImage | undefined>;
const maxDisplayImageWidth = 1920;
const fallbackDisplayImageWidth = 1440;

export const getGeneratedImage = (src: string) => images[src];

export const getLinkedImageSrc = (src: string) => getGeneratedImage(src)?.variants.at(-1)?.src ?? src;

const getDisplayVariants = (variants: GeneratedImage['variants']) => {
	const sortedVariants = [...variants].sort((a, b) => a.width - b.width);
	const displayVariants = sortedVariants.filter((variant) => variant.width <= maxDisplayImageWidth);

	return displayVariants.length > 0 ? displayVariants : sortedVariants;
};

const getFallbackVariant = (variants: GeneratedImage['variants']) => (
	variants.filter((variant) => variant.width <= fallbackDisplayImageWidth).at(-1) ?? variants[0]
);

export const getImageAttributes = (src: string, sizes: string) => {
	const image = getGeneratedImage(src);

	if (!image) {
		return {
			src,
			sizes,
		};
	}

	const displayVariants = getDisplayVariants(image.variants);
	const fallbackVariant = getFallbackVariant(displayVariants);

	return {
		src: fallbackVariant?.src ?? src,
		srcset: displayVariants.map((variant) => `${variant.src} ${variant.width}w`).join(', '),
		sizes,
		style: `aspect-ratio: ${image.width} / ${image.height};`,
		width: image.width,
		height: image.height,
	};
};
