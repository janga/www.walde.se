import siteConfig from '../../site.config.mjs';

const assertObject = (value, path) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${path} must be an object in site.config.mjs.`);
	}

	return value;
};

const readString = (object, key, path) => {
	const value = object[key];

	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${path}.${key} must be a non-empty string in site.config.mjs.`);
	}

	return value.trim();
};

const readPositiveInteger = (object, key, path, fallback) => {
	const value = object[key] ?? fallback;

	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${path}.${key} must be a positive integer in site.config.mjs.`);
	}

	return value;
};

const readUrl = (object, key, path) => {
	const value = readString(object, key, path);

	try {
		return new URL(value).href;
	} catch {
		throw new Error(`${path}.${key} must be an absolute URL in site.config.mjs.`);
	}
};

const rawConfig = assertObject(siteConfig, 'default export');
const rawSite = assertObject(rawConfig.site, 'site');
const rawGithub = assertObject(rawConfig.github, 'github');
const rawDeploy = assertObject(rawConfig.deploy ?? {}, 'deploy');
const rawDeployWatch = assertObject(rawDeploy.watch ?? {}, 'deploy.watch');

export const projectConfig = Object.freeze({
	site: Object.freeze({
		url: readUrl(rawSite, 'url', 'site'),
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
