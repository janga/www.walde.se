import { expect, test } from '@playwright/test';

const mobileViewport = { width: 393, height: 852 };
const desktopViewport = { width: 1280, height: 900 };
const maximumAnchorGap = 80;
const maximumAnchorWait = 7_000;
const minimumFullscreenSafeTextTop = 24;

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
		{ timeout: maximumAnchorWait },
	);
};

const measureNavTextHitTargets = async (page) => page.locator('.section-nav a').evaluateAll((links) => (
	links.map((link) => {
		const textRange = document.createRange();
		textRange.selectNodeContents(link);
		const textRect = textRange.getBoundingClientRect();
		textRange.detach();

		const x = textRect.left + textRect.width / 2;
		const y = textRect.top + textRect.height / 2;
		const hitElement = document.elementFromPoint(x, y);

		return {
			href: link.getAttribute('href'),
			label: link.textContent?.trim(),
			textTop: textRect.top,
			hitHref: hitElement instanceof HTMLAnchorElement
				? hitElement.getAttribute('href')
				: hitElement?.closest('a')?.getAttribute('href'),
		};
	})
));

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

		test('keeps the target aligned when layout above it changes during smooth scroll', async ({ page }) => {
			await openSite(page);

			await page.evaluate(() => {
				window.setTimeout(() => {
					const target = document.querySelector('#min-konst');
					const spacer = document.createElement('div');

					spacer.id = 'scroll-shift-probe';
					spacer.style.height = '180px';
					spacer.style.pointerEvents = 'none';
					target?.before(spacer);
				}, 500);
			});

			await page.locator('.section-nav a[href="#min-konst"]').click();
			await waitForAnchorPosition(page, 'min-konst');

			const measurement = await measureAnchor(page, 'min-konst');
			expect(measurement.hash).toBe('#min-konst');
			expect(measurement.gap).toBeGreaterThanOrEqual(-1);
			expect(measurement.gap).toBeLessThanOrEqual(maximumAnchorGap);
		});
	});
}

test.describe('desktop navigation hit targets', () => {
	test.use({
		hasTouch: false,
		isMobile: false,
		viewport: desktopViewport,
	});

	test('keeps labels below the top fullscreen browser chrome risk area', async ({ page }) => {
		await openSite(page);

		for (const target of await measureNavTextHitTargets(page)) {
			expect(target.textTop, target.label).toBeGreaterThanOrEqual(minimumFullscreenSafeTextTop);
			expect(target.hitHref, target.label).toBe(target.href);
		}
	});
});

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
