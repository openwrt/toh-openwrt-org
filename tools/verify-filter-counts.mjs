#!/usr/bin/env node
/*
 * Checks the filter counts shown in the sidebar against Tabulator's own engine.
 *
 * The counts are computed by tohCountFeatures() in toh_main.js, which mirrors
 * Tabulator's comparison semantics rather than calling it - running the real
 * filter 43 times costs well over a second of redraws. This script proves the
 * two agree, so the numbers next to each filter are the numbers you get when
 * you click it.
 *
 * Usage:
 *     python3 -m http.server 8817        # from the repo root
 *     node tools/verify-filter-counts.mjs [url]
 *
 * Exits non-zero if any filter disagrees.
 */

import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:8817/index.html';

// Playwright's bundled Chromium, not a system Chrome channel: the latter is
// often absent in CI or on a machine that only ran `npx playwright install`.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page
	.waitForFunction(
		() => getComputedStyle(document.querySelector('#toh-boot-overlay')).display === 'none',
		{ timeout: 90000 }
	)
	.catch(() => {
		throw new Error('the table never finished loading');
	});
await page.waitForTimeout(1000);

const result = await page.evaluate(async () => {
	const ours = tohCountFeatures();
	const theirs = {};

	// Tabulator, for real, one feature at a time
	for (const key of Object.keys(toh_filterFeatures)) {
		const filters = [];
		toh_filterFeatures[key].filters.forEach((f) => {
			if (typeof f === 'object') {
				filters.push(f);
			}
		});
		tabuTable.setFilter(filters);
		theirs[key] = tabuTable.getDataCount('active');
	}
	tabuTable.clearFilter();

	return { ours, theirs, total: tabuTable.getDataCount() };
});

const rows = Object.keys(result.ours).sort();
const bad = rows.filter((k) => result.ours[k] !== result.theirs[k]);

console.log(`${rows.length} filters checked against ${result.total} devices\n`);
for (const k of rows) {
	const ok = result.ours[k] === result.theirs[k];
	if (!ok || process.env.VERBOSE) {
		console.log(
			`${ok ? 'ok  ' : 'FAIL'}  ${k.padEnd(22)} ours=${String(result.ours[k]).padStart(5)}  tabulator=${String(result.theirs[k]).padStart(5)}`
		);
	}
}

await browser.close();

if (bad.length) {
	console.error(`\n${bad.length} filter(s) disagree: ${bad.join(', ')}`);
	process.exit(1);
}
console.log('all filter counts match Tabulator');
