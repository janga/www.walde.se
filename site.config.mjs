const siteUrl = 'https://www.walde.se/';

export default {
	site: {
		url: siteUrl,
	},
	github: {
		repo: 'janga/www.walde.se',
		branch: 'main',
		pagesWorkflow: 'Deploy to GitHub Pages',
	},
	deploy: {
		watch: {
			intervalMs: 10_000,
			timeoutMs: 15 * 60_000,
			runLimit: 10,
		},
	},
};
