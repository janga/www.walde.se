import generatedImages from '../data/generated-images.json';

type GeneratedImage = {
	width: number;
	height: number;
	originalSrc: string;
	variants: Array<{
		src: string;
		width: number;
	}>;
};

const images = generatedImages as Record<string, GeneratedImage | undefined>;

export const getGeneratedImage = (src: string) => images[src];

export const getOriginalImageSrc = (src: string) => getGeneratedImage(src)?.originalSrc ?? src;

export const getImageAttributes = (src: string, sizes: string) => {
	const image = getGeneratedImage(src);

	if (!image) {
		return {
			src,
			sizes,
		};
	}

	const largestVariant = image.variants.at(-1);

	return {
		src: largestVariant?.src ?? src,
		srcset: image.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', '),
		sizes,
		width: image.width,
		height: image.height,
	};
};
