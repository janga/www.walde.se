const formatErrorMessage = (error) => {
	if (error instanceof SyntaxError) {
		return [
			'site/config.mjs contains invalid JavaScript syntax.',
			error.message,
		].join('\n');
	}

	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
};

try {
	const { projectConfig } = await import('./lib/project-config.mjs');

	console.log('Config check passed.');
	console.log(`Site URL: ${projectConfig.site.url}`);
	console.log(`Require image copyright metadata: ${projectConfig.images.requireCopyrightMetadata}`);
	console.log(`GitHub repo: ${projectConfig.github.repo}`);
	console.log(`Deploy branch: ${projectConfig.github.branch}`);
	console.log(`Pages workflow: ${projectConfig.github.pagesWorkflow}`);
} catch (error) {
	console.error('Config check failed.');
	console.error(formatErrorMessage(error));
	process.exit(1);
}
