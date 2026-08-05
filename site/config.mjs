const siteUrl = 'https://www.walde.se/';

export default {
    site: {
	// Public canonical URL for this site.
	url: siteUrl,
    },			

    locale: {
	lang: 'sv',
	labels: {
	    skipToContent: 'Hoppa till innehåll',
	    sectionNavigation: 'Sektioner',
	    gallery: 'Galleri',
	},
    },

    typography: {
	fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
        //fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
    },
    navigation: {
	smoothScroll: {
	    // Set to false to make section links jump directly to the target anchor.
	    enabled: true,

	    // Minimum and maximum animation time for controlled anchor navigation.
	    minimumDurationMs: 2_000,
	    maximumDurationMs: 4_000,

	    // Additional duration per pixel of scroll distance, before min/max clamping.
	    durationPerPixelMs: 0.22,
	},
    },
    footer: {
	// Omit this value to hide the copyright sentence.
	copyrightMessage: '© Karin Walde. Bilder, konstverk och texter får inte användas utan tillstånd.',

	// Set enabled to false to hide the build timestamp while keeping its config.
	buildInfo: {
	    enabled: true,

	    // Text shown before the formatted build timestamp.
	    text: 'Byggd',

	    // Standard Intl.DateTimeFormat options for the build timestamp.
	    dateTimeFormat: {
		locale: 'sv-SE',
		timeZone: 'Europe/Stockholm',
		dateStyle: 'short',
		timeStyle: 'short',
	    },
	},
    },
    gallery: {
	width: '880px',
    },

    github: {
	// Repository and workflow details used by deploy scripts.
	repo: 'janga/www.walde.se',
	branch: 'main',
	pagesWorkflow: 'Deploy to GitHub Pages',
    },
    deploy: {
	watch: {
	    // Defaults for npm run deploy:watch.
	    intervalMs: 10_000,
	    timeoutMs: 15 * 60_000,
	    runLimit: 10,
	},
    },
};
