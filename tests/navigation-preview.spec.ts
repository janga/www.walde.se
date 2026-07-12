import { expect, type Page, test } from '@playwright/test';

type NavTarget = {
	hash: string;
	label: string;
};

type AnchorMeasurement = {
	anchorOffset: string;
	elementsBelowHeader: string[];
	gap: number;
	hash: string;
	headerBottom: number;
	headingText: string;
	headingTop: number;
	innerHeight: number;
	label: string;
	round: number;
	scrollPaddingTop: string;
	scrollY: number;
	sectionTop: number;
	targetHash: string;
	viewport: string;
};

const viewports = [
	{ name: 'mobile', size: { width: 393, height: 852 }, hasTouch: true, isMobile: true },
	{ name: 'mobile-short', size: { width: 393, height: 740 }, hasTouch: true, isMobile: true },
	{ name: 'desktop', size: { width: 1440, height: 900 }, hasTouch: false, isMobile: false },
	{ name: 'desktop-wide', size: { width: 1980, height: 1200 }, hasTouch: false, isMobile: false },
];
const hiddenHeadingTolerance = -4;
const maximumAnchorGap = 120;
const stableSampleCount = 5;

const getPreviewRounds = () => {
	const rounds = Number.parseInt(process.env.NAVIGATION_PREVIEW_ROUNDS ?? '3', 10);
	return Number.isFinite(rounds) && rounds > 0 ? rounds : 3;
};

const getNavTargets = async (page: Page): Promise<NavTarget[]> => page.locator('.section-nav a').evaluateAll((links) => (
	links.map((link) => ({
		hash: link.getAttribute('href') ?? '',
		label: link.textContent?.trim() ?? '',
	})).filter((link) => link.hash.startsWith('#'))
));

const openSite = async (page: Page) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.section-nav a').first().waitFor();
	await page.waitForLoadState('networkidle').catch(() => {});
};

const measureAnchor = async (
	page: Page,
	target: NavTarget,
	round: number,
	viewport: string,
): Promise<AnchorMeasurement> => page.evaluate(({ hash, label, currentRound, viewportName }) => {
	const sectionId = hash.slice(1);
	const header = document.querySelector('.site-top');
	const section = document.getElementById(sectionId);
	const heading = section?.querySelector('h1, h2');
	const styles = getComputedStyle(document.documentElement);

	if (!(header instanceof HTMLElement) || !(section instanceof HTMLElement) || !(heading instanceof HTMLElement)) {
		throw new Error(`Cannot measure section heading for ${hash}.`);
	}

	const headerRect = header.getBoundingClientRect();
	const headingRect = heading.getBoundingClientRect();
	const sectionRect = section.getBoundingClientRect();
	const probeY = Math.min(window.innerHeight - 1, Math.max(headerRect.bottom + 8, 0));
	const probeX = Math.floor(window.innerWidth / 2);

	return {
		anchorOffset: styles.getPropertyValue('--site-top-anchor-offset').trim(),
		elementsBelowHeader: document.elementsFromPoint(probeX, probeY)
			.slice(0, 6)
			.map((element) => {
				const id = element.id ? `#${element.id}` : '';
				const className = typeof element.className === 'string' && element.className
					? `.${element.className.trim().split(/\s+/).join('.')}`
					: '';
				const text = element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60);

				return `${element.tagName.toLowerCase()}${id}${className}${text ? ` "${text}"` : ''}`;
			}),
		gap: headingRect.top - headerRect.bottom,
		hash: window.location.hash,
		headerBottom: headerRect.bottom,
		headingText: heading.textContent?.trim() ?? '',
		headingTop: headingRect.top,
		innerHeight: window.innerHeight,
		label,
		round: currentRound,
		scrollPaddingTop: styles.scrollPaddingTop,
		scrollY: window.scrollY,
		sectionTop: sectionRect.top,
		targetHash: hash,
		viewport: viewportName,
	};
}, { hash: target.hash, label: target.label, currentRound: round, viewportName: viewport });

const waitForAnchorToSettle = async (
	page: Page,
	target: NavTarget,
	round: number,
	viewport: string,
) => {
	const deadline = Date.now() + 7_000;
	const samples: AnchorMeasurement[] = [];
	let stableSamples = 0;
	let previous: AnchorMeasurement | null = null;
	let lastContextLoss = '';

	while (Date.now() < deadline) {
		try {
			const measurement = await measureAnchor(page, target, round, viewport);
			samples.push(measurement);
			samples.splice(0, Math.max(0, samples.length - 8));

			const isStable = previous
				&& measurement.hash === target.hash
				&& Math.abs(measurement.scrollY - previous.scrollY) < 1
				&& Math.abs(measurement.gap - previous.gap) < 0.5;

			stableSamples = isStable ? stableSamples + 1 : 0;
			previous = measurement;

			if (stableSamples >= stableSampleCount) {
				return measurement;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);

			if (!/Execution context was destroyed|Cannot find context|Target page/.test(message)) {
				throw error;
			}

			lastContextLoss = message;
			await page.waitForLoadState('domcontentloaded').catch(() => {});
		}

		await page.waitForTimeout(100);
	}

	throw new Error(JSON.stringify({
		message: `Anchor did not settle for ${target.hash}.`,
		lastContextLoss,
		samples,
	}, null, 2));
};

const expectAnchorMeasurement = (measurement: AnchorMeasurement) => {
	expect(measurement.hash, JSON.stringify(measurement, null, 2)).toBe(measurement.targetHash);
	expect(measurement.gap, JSON.stringify(measurement, null, 2)).toBeGreaterThanOrEqual(hiddenHeadingTolerance);
	expect(measurement.gap, JSON.stringify(measurement, null, 2)).toBeLessThanOrEqual(maximumAnchorGap);
};

for (const viewport of viewports) {
	test.describe(`preview sticky navigation on ${viewport.name}`, () => {
		test.use({
			hasTouch: viewport.hasTouch,
			isMobile: viewport.isMobile,
			viewport: viewport.size,
		});

		test('repeated clicks land on the target heading', async ({ page }) => {
			const rounds = getPreviewRounds();
			test.setTimeout(Math.max(90_000, rounds * viewports.length * 20_000));

			await openSite(page);
			const targets = await getNavTargets(page);

			for (let round = 0; round < rounds; round += 1) {
				for (const target of targets) {
					await page.locator(`.section-nav a[href="${target.hash}"]`).click();
					const measurement = await waitForAnchorToSettle(page, target, round, viewport.name);

					expectAnchorMeasurement(measurement);
				}
			}
		});
	});
}

test('preview direct hash loads land on target headings', async ({ page }) => {
	test.setTimeout(Math.max(120_000, viewports.length * 5 * 10_000));

	await openSite(page);
	const targets = await getNavTargets(page);

	for (const viewport of viewports) {
		await page.setViewportSize(viewport.size);

		for (const target of targets) {
			await page.goto(`/${target.hash}`, { waitUntil: 'domcontentloaded' });
			await page.locator('.section-nav a').first().waitFor();
			const measurement = await waitForAnchorToSettle(page, target, 0, viewport.name);

			expectAnchorMeasurement(measurement);
		}
	}
});
