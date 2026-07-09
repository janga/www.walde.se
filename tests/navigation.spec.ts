import { expect, test } from '@playwright/test';

const mobileViewport = { width: 393, height: 852 };
const desktopViewport = { width: 1280, height: 900 };
const maximumAnchorGap = 80;

type AnchorMeasurement = {
	hash: string;
	headerBottom: number;
	headingTop: number;
	gap: number;
};

const getNavTargets = async (page) => page.locator('.section-nav a').evaluateAll((links) => (
	links.map((link) => ({
		hash: link.getAttribute('href') ?? '',
		label: link.textContent?.trim() ?? '',
	})).filter((link) => link.hash.startsWith('#'))
));

const measureAnchor = async (page, sectionId: string): Promise<AnchorMeasurement> => page.evaluate((id) => {
	const header = document.querySelector('.site-top');
	const section = document.getElementById(id);
	const heading = section?.querySelector('h1, h2');

	if (!(header instanceof HTMLElement) || !(heading instanceof HTMLElement)) {
		throw new Error(`Cannot measure section heading for ${id}.`);
	}

	const headerBottom = header.getBoundingClientRect().bottom;
	const headingTop = heading.getBoundingClientRect().top;

	return {
		hash: window.location.hash,
		headerBottom,
		headingTop,
		gap: headingTop - headerBottom,
	};
}, sectionId);

const openSite = async (page, path = '/') => {
	await page.goto(path, { waitUntil: 'domcontentloaded' });
	await page.locator('.section-nav a').first().waitFor();
	await page.waitForLoadState('networkidle').catch(() => {});
};

const waitForAnchorPosition = async (page, sectionId: string) => {
	await page.waitForFunction(
		({ id, maximumGap }) => {
			const header = document.querySelector('.site-top');
			const section = document.getElementById(id);
			const heading = section?.querySelector('h1, h2');

			if (!(header instanceof HTMLElement) || !(heading instanceof HTMLElement)) {
				return false;
			}

			const headerBottom = header.getBoundingClientRect().bottom;
			const headingTop = heading.getBoundingClientRect().top;
			const gap = headingTop - headerBottom;

			return window.location.hash === `#${id}` && gap >= -1 && gap <= maximumGap;
		},
		{ id: sectionId, maximumGap: maximumAnchorGap },
		{ timeout: 4_000 },
	);
};

for (const scenario of [
	{ name: 'mobile', viewport: mobileViewport, isMobile: true, hasTouch: true },
	{ name: 'desktop', viewport: desktopViewport, isMobile: false, hasTouch: false },
]) {
	test.describe(`section navigation on ${scenario.name}`, () => {
		test.use({
			hasTouch: scenario.hasTouch,
			isMobile: scenario.isMobile,
			viewport: scenario.viewport,
		});

		test('positions each section heading below the sticky navigation', async ({ page }) => {
			await openSite(page);

			for (const target of await getNavTargets(page)) {
				const sectionId = target.hash.slice(1);
				await page.locator(`.section-nav a[href="${target.hash}"]`).click();
				await waitForAnchorPosition(page, sectionId);

				const measurement = await measureAnchor(page, sectionId);
				expect(measurement.hash, target.label).toBe(target.hash);
				expect(measurement.gap, target.label).toBeGreaterThanOrEqual(-1);
				expect(measurement.gap, target.label).toBeLessThanOrEqual(maximumAnchorGap);
			}
		});

		test('positions direct hash links below the sticky navigation', async ({ page }) => {
			await openSite(page);

			for (const target of await getNavTargets(page)) {
				const sectionId = target.hash.slice(1);
				await openSite(page, `/${target.hash}`);
				await waitForAnchorPosition(page, sectionId);

				const measurement = await measureAnchor(page, sectionId);
				expect(measurement.hash, target.label).toBe(target.hash);
				expect(measurement.gap, target.label).toBeGreaterThanOrEqual(-1);
				expect(measurement.gap, target.label).toBeLessThanOrEqual(maximumAnchorGap);
			}
		});
	});
}

test.describe('section navigation without JavaScript', () => {
	test.use({
		hasTouch: true,
		isMobile: true,
		javaScriptEnabled: false,
		viewport: mobileViewport,
	});

	test('keeps hash links usable as a fallback', async ({ page }) => {
		await openSite(page);
		await page.locator('.section-nav a[href="#om-mig"]').click();

		const measurement = await measureAnchor(page, 'om-mig');
		expect(measurement.hash).toBe('#om-mig');
		expect(measurement.gap).toBeGreaterThanOrEqual(-1);
	});
});
