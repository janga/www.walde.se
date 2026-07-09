import { expect, type Page, test } from '@playwright/test';

const mobileViewport = { width: 393, height: 852 };
const alternateViewportHeights = [852, 780, 900, 812];
const hiddenHeadingTolerance = -4;
const getClickRounds = () => {
	const rounds = Number.parseInt(process.env.NAVIGATION_STRESS_RUNS ?? '10', 10);
	return Number.isFinite(rounds) && rounds > 0 ? rounds : 10;
};
const clickRounds = getClickRounds();
const hashLoadRounds = Math.max(3, Math.ceil(clickRounds / 5));

type NavTarget = {
	hash: string;
	label: string;
};

type AnchorMeasurement = {
	activeElement: string;
	anchorOffset: string;
	gap: number;
	hash: string;
	headerBottom: number;
	headingTop: number;
	innerHeight: number;
	label: string;
	round: number;
	scrollPaddingTop: string;
	scrollY: number;
	sectionTop: number;
	targetHash: string;
	viewportHeight: number;
};

const getNavTargets = async (page: Page): Promise<NavTarget[]> => page.locator('.section-nav a').evaluateAll((links) => (
	links.map((link) => ({
		hash: link.getAttribute('href') ?? '',
		label: link.textContent?.trim() ?? '',
	})).filter((link) => link.hash.startsWith('#'))
));

const openSite = async (page: Page, path = '/') => {
	await page.goto(path, { waitUntil: 'domcontentloaded' });
	await page.locator('.section-nav a').first().waitFor();
	await page.waitForLoadState('networkidle').catch(() => {});
};

const waitForScrollToSettle = async (page: Page) => {
	await page.evaluate(() => new Promise<void>((resolve) => {
		let previousY = window.scrollY;
		let stableFrames = 0;

		const check = () => {
			const currentY = window.scrollY;

			if (Math.abs(currentY - previousY) < 1) {
				stableFrames += 1;
			} else {
				stableFrames = 0;
				previousY = currentY;
			}

			if (stableFrames >= 8) {
				resolve();
				return;
			}

			requestAnimationFrame(check);
		};

		requestAnimationFrame(check);
	}));
};

const measureAnchor = async (
	page,
	target: NavTarget,
	round: number,
): Promise<AnchorMeasurement> => page.evaluate(({ hash, label, currentRound }) => {
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

	return {
		activeElement: document.activeElement?.tagName ?? '',
		anchorOffset: styles.getPropertyValue('--site-top-anchor-offset').trim(),
		gap: headingRect.top - headerRect.bottom,
		hash: window.location.hash,
		headerBottom: headerRect.bottom,
		headingTop: headingRect.top,
		innerHeight: window.innerHeight,
		label,
		round: currentRound,
		scrollPaddingTop: styles.scrollPaddingTop,
		scrollY: window.scrollY,
		sectionTop: sectionRect.top,
		targetHash: hash,
		viewportHeight: document.documentElement.clientHeight,
	};
}, { hash: target.hash, label: target.label, currentRound: round });

const expectAnchorMeasurement = (measurement: AnchorMeasurement) => {
	expect(measurement.hash, JSON.stringify(measurement, null, 2)).toBe(measurement.targetHash);
	expect(measurement.gap, JSON.stringify(measurement, null, 2)).toBeGreaterThanOrEqual(hiddenHeadingTolerance);
};

test.use({
	hasTouch: true,
	isMobile: true,
	viewport: mobileViewport,
});

test('repeated mobile nav clicks keep headings below the sticky navigation', async ({ page }) => {
	test.setTimeout(Math.max(120_000, clickRounds * 10_000));

	await openSite(page);
	const targets = await getNavTargets(page);

	for (let round = 0; round < clickRounds; round += 1) {
		for (const target of targets) {
			await page.locator(`.section-nav a[href="${target.hash}"]`).click();

			const targetIndex = targets.indexOf(target);
			const viewportHeight = alternateViewportHeights[(round + targetIndex) % alternateViewportHeights.length];
			await page.setViewportSize({ width: mobileViewport.width, height: viewportHeight });
			await waitForScrollToSettle(page);

			expectAnchorMeasurement(await measureAnchor(page, target, round));
		}
	}
});

test('mobile hash deep links keep headings below the sticky navigation', async ({ page }) => {
	test.setTimeout(Math.max(45_000, hashLoadRounds * 10_000));

	await openSite(page);
	const targets = await getNavTargets(page);

	for (let round = 0; round < hashLoadRounds; round += 1) {
		for (const target of targets) {
			const targetIndex = targets.indexOf(target);
			const viewportHeight = alternateViewportHeights[(round + targetIndex) % alternateViewportHeights.length];
			await page.setViewportSize({ width: mobileViewport.width, height: viewportHeight });
			await openSite(page, `/${target.hash}`);
			await waitForScrollToSettle(page);

			expectAnchorMeasurement(await measureAnchor(page, target, round));
		}
	}
});
