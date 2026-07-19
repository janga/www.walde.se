import { pathToFileURL } from 'node:url';
import { siteConfigLabel, siteConfigPath } from './site-paths.mjs';

const { default: siteConfig } = await import(pathToFileURL(siteConfigPath).href);

const assertObject = (value, path) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${path} must be an object in ${siteConfigLabel}.`);
	}

	return value;
};

const readString = (object, key, path) => {
	const value = object[key];

	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${path}.${key} must be a non-empty string in ${siteConfigLabel}.`);
	}

	return value.trim();
};

const readOptionalString = (object, key, path) => {
	const value = object[key];

	if (value === undefined || value === null || value === '') {
		return null;
	}

	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${path}.${key} must be a non-empty string when set in ${siteConfigLabel}.`);
	}

	return value.trim();
};

const readBoolean = (object, key, path, fallback) => {
	const value = object[key] ?? fallback;

	if (typeof value !== 'boolean') {
		throw new Error(`${path}.${key} must be a boolean in ${siteConfigLabel}.`);
	}

	return value;
};

const readPositiveInteger = (object, key, path, fallback) => {
	const value = object[key] ?? fallback;

	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${path}.${key} must be a positive integer in ${siteConfigLabel}.`);
	}

	return value;
};

const readPositiveNumber = (object, key, path, fallback) => {
	const value = object[key] ?? fallback;

	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		throw new Error(`${path}.${key} must be a positive number in ${siteConfigLabel}.`);
	}

	return value;
};

const readUrl = (object, key, path) => {
	const value = readString(object, key, path);

	try {
		return new URL(value).href;
	} catch {
		throw new Error(`${path}.${key} must be an absolute URL in ${siteConfigLabel}.`);
	}
};

const readSmoothScroll = (navigation) => {
	const rawSmoothScroll = assertObject(navigation.smoothScroll ?? {}, 'navigation.smoothScroll');
	const minimumDurationMs = readPositiveInteger(rawSmoothScroll, 'minimumDurationMs', 'navigation.smoothScroll', 2_000);
	const maximumDurationMs = readPositiveInteger(rawSmoothScroll, 'maximumDurationMs', 'navigation.smoothScroll', 4_000);

	if (maximumDurationMs < minimumDurationMs) {
		throw new Error(`navigation.smoothScroll.maximumDurationMs must be greater than or equal to minimumDurationMs in ${siteConfigLabel}.`);
	}

	return Object.freeze({
		durationPerPixelMs: readPositiveNumber(rawSmoothScroll, 'durationPerPixelMs', 'navigation.smoothScroll', 0.22),
		enabled: readBoolean(rawSmoothScroll, 'enabled', 'navigation.smoothScroll', true),
		maximumDurationMs,
		minimumDurationMs,
	});
};

const readDateTimeFormat = (object, path) => {
	const dateTimeFormat = assertObject(object, path);
	const locale = readString(dateTimeFormat, 'locale', path);
	const timeZone = readString(dateTimeFormat, 'timeZone', path);
	const dateStyle = readString(dateTimeFormat, 'dateStyle', path);
	const timeStyle = readString(dateTimeFormat, 'timeStyle', path);

	try {
		new Intl.DateTimeFormat(locale, {
			dateStyle,
			timeStyle,
			timeZone,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${path} must be a valid Intl.DateTimeFormat configuration in ${siteConfigLabel}: ${message}`);
	}

	return Object.freeze({
		dateStyle,
		locale,
		timeStyle,
		timeZone,
	});
};

const readBuildInfo = (footer) => {
	const value = footer.buildInfo;

	if (value === undefined || value === null || value === false) {
		return null;
	}

	const buildInfo = assertObject(value, 'footer.buildInfo');

	return Object.freeze({
		enabled: readBoolean(buildInfo, 'enabled', 'footer.buildInfo', true),
		text: readString(buildInfo, 'text', 'footer.buildInfo'),
		dateTimeFormat: readDateTimeFormat(buildInfo.dateTimeFormat, 'footer.buildInfo.dateTimeFormat'),
	});
};

const rawConfig = assertObject(siteConfig, 'default export');
const rawSite = assertObject(rawConfig.site, 'site');
const rawNavigation = assertObject(rawConfig.navigation ?? {}, 'navigation');
const rawImages = assertObject(rawConfig.images ?? {}, 'images');
const rawFooter = assertObject(rawConfig.footer ?? {}, 'footer');
const rawGithub = assertObject(rawConfig.github, 'github');
const rawDeploy = assertObject(rawConfig.deploy ?? {}, 'deploy');
const rawDeployWatch = assertObject(rawDeploy.watch ?? {}, 'deploy.watch');

export const projectConfig = Object.freeze({
	site: Object.freeze({
		url: readUrl(rawSite, 'url', 'site'),
	}),
	navigation: Object.freeze({
		smoothScroll: readSmoothScroll(rawNavigation),
	}),
	images: Object.freeze({
		requireCopyrightMetadata: readBoolean(rawImages, 'requireCopyrightMetadata', 'images', true),
	}),
	footer: Object.freeze({
		buildInfo: readBuildInfo(rawFooter),
		copyrightMessage: readOptionalString(rawFooter, 'copyrightMessage', 'footer'),
	}),
	github: Object.freeze({
		repo: readString(rawGithub, 'repo', 'github'),
		branch: readString(rawGithub, 'branch', 'github'),
		pagesWorkflow: readString(rawGithub, 'pagesWorkflow', 'github'),
	}),
	deploy: Object.freeze({
		watch: Object.freeze({
			intervalMs: readPositiveInteger(rawDeployWatch, 'intervalMs', 'deploy.watch', 10_000),
			timeoutMs: readPositiveInteger(rawDeployWatch, 'timeoutMs', 'deploy.watch', 15 * 60_000),
			runLimit: readPositiveInteger(rawDeployWatch, 'runLimit', 'deploy.watch', 10),
		}),
	}),
});

export default projectConfig;
