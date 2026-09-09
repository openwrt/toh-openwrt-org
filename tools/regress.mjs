#!/usr/bin/env node
/*
 * Responsive and behavioural regression checks for the ToH page.
 *
 * Run from the repository root:
 *
 *     npm install          # once: puts playwright in node_modules (dev only,
 *                          # the page itself needs no build step)
 *     npx playwright install chromium
 *     npm test             # = node tools/regress.mjs
 *
 * The script serves the repository over a local port itself and caches the
 * ~4MB device dump in tools/.cache/ on first run, so tests are fast and see
 * identical data on every pass. Delete the cache to test against fresh data.
 *
 * Every request carries ?cache=<run id>, which defeats the page's daily asset
 * cache key - edits made today are picked up rather than served stale.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, createReadStream, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(ROOT, 'tools', '.cache');

// --- the device data, cached ------------------------------------------------
async function cached(name, url) {
	const path = join(CACHE_DIR, name);
	if (!existsSync(path)) {
		mkdirSync(CACHE_DIR, { recursive: true });
		console.log('fetching', url);
		const res = await fetch(url);
		if (!res.ok) throw new Error(url + ' -> ' + res.status);
		writeFileSync(path, Buffer.from(await res.arrayBuffer()));
	}
	return readFileSync(path);
}
const toh = await cached('toh.json', 'https://openwrt.org/toh.json');
const versions = await cached('versions.json', 'https://downloads.openwrt.org/.versions.json');

// --- a static server over the repo, on an ephemeral port ---------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
	'.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.md': 'text/plain' };
const server = createServer((req, res) => {
	// decodeURIComponent throws on a malformed escape ("%zz"), and an exception
	// here would take the whole server - and the suite - down with it
	let rel;
	try { rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, ''); }
	catch { res.writeHead(400); res.end(); return; }
	const path = normalize(join(ROOT, rel || 'index.html'));
	const file = path.endsWith('/') ? join(path, 'index.html') : path;
	// ROOT + separator, not a bare prefix: "/repo/toh" is a prefix of a sibling
	// "/repo/toh-secrets", which "../toh-secrets/x" resolves into
	if ((file !== ROOT && !file.startsWith(ROOT + '/') && !file.startsWith(ROOT + '\\'))
		|| !existsSync(file) || !statSync(file).isFile()) {
		res.writeHead(404); res.end(); return;
	}
	res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
	createReadStream(file).on('error', () => { res.destroy(); }).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port;
const CACHE = 'r' + Date.now();

// --- harness -----------------------------------------------------------------
const results = [];
const check = (name, ok) => { results.push([name, !!ok]); };

const browser = await chromium.launch();
const ctx = await browser.newContext();

async function open(w, h, qs = '') {
	const page = await ctx.newPage();
	await page.setViewportSize({ width: w, height: h });
	await page.route('**://openwrt.org/toh.json*', r =>
		r.fulfill({ contentType: 'application/json', body: toh }));
	await page.route('**://downloads.openwrt.org/.versions.json*', r =>
		r.fulfill({ contentType: 'application/json', body: versions }));
	await page.route('**://openwrt.org/_media/**', r => r.abort());
	page.on('pageerror', e => { console.log('  [PAGEERROR]', e.message); check('no page error', false); });
	await page.goto(BASE + '/index.html?cache=' + CACHE + '&' + qs, { waitUntil: 'load' });
	await page.waitForFunction(() => window.tabuTable && tabuTable.getData().length > 0, null, { timeout: 180000 });
	await page.waitForTimeout(1500);
	return page;
}

const state = page => page.evaluate(() => {
	const hold = document.querySelector('.tabulator-tableholder');
	const side = document.getElementById('toh-sidebar');
	const bar = document.getElementById('toh-summary');
	return {
		view: toh_current_view,
		cards: toh_cards_on,
		cols: tabuTable.getColumns().filter(c => c.isVisible()).length,
		presetSize: (toh_colPresets[toh_current_view] || []).length,
		scrollW: hold ? hold.scrollWidth : 0,
		clientW: hold ? hold.clientWidth : 0,
		docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
		url: buildBrowserUrl(false),
		lit: [...document.querySelectorAll('#toh-cols-presets A.toh-selected')].map(a => a.dataset.key),
		sideTop: Math.round(side.getBoundingClientRect().top),
		barH: Math.round(bar.getBoundingClientRect().height),
		summaryOn: document.body.classList.contains('toh-summary-on'),
		cardCount: document.querySelectorAll('.toh-card-dev').length,
		rowH: (() => { const r = document.querySelector('#toh-table .tabulator-row');
			return r ? Math.round(r.getBoundingClientRect().height) : 0; })(),
		active: tabuTable.getRows('active').length,
		dl: (() => {
			const c = [...document.querySelectorAll('#toh-table .tabulator-cell[tabulator-field="VIRT_download"]')];
			return { total: c.length, labelled: c.filter(x => /\d+\.\d+/.test(x.textContent)).length };
		})(),
	};
});

// 1. Every width : which renderer, and does anything scroll sideways ---------
console.log('\n--- width sweep ---');
let TOTAL = 0;
const sweep = {};
for (const w of [1920, 1600, 1280, 1100, 1000, 900, 760, 700, 673, 390, 360, 344, 320]) {
	const page = await open(w, 900);
	const s = await state(page);
	sweep[w] = s;
	if (!TOTAL) { TOTAL = await page.evaluate(() => tabuTable.getDataCount()); }
	const over = s.scrollW - s.clientW;
	console.log(String(w).padStart(5) + 'px  ' + String(s.view).padEnd(8)
		+ ' cards=' + String(s.cards).padEnd(6) + ' cols=' + String(s.cols).padStart(2)
		+ '  ' + String(s.scrollW).padStart(5) + '/' + String(s.clientW).padStart(5)
		+ (over > 1 ? '  SCROLLS ' + over : '  fits'));
	await page.close();
}
check('1920 fits without scrolling sideways', sweep[1920].scrollW <= sweep[1920].clientW + 1);
check('1600 fits without scrolling sideways', sweep[1600].scrollW <= sweep[1600].clientW + 1);
check('1280 fits without scrolling sideways', sweep[1280].scrollW <= sweep[1280].clientW + 1);
check('1100 fits without scrolling sideways', sweep[1100].scrollW <= sweep[1100].clientW + 1);
check('1000 and below never scroll sideways',
	[1000, 900, 760].every(w => sweep[w].scrollW <= sweep[w].clientW + 1));
check('the table never grows as the window shrinks',
	[1920, 1600, 1280, 1100, 1000, 900, 760].every((w, i, a) =>
		i === 0 || sweep[a[i - 1]].clientW >= sweep[w].clientW));
check('desktop shows exactly the default preset',
	sweep[1600].view === 'normal' && sweep[1600].cols === sweep[1600].presetSize);
check('the download column names a release, not another arrow',
	sweep[1600].dl.total === 30 && sweep[1600].dl.labelled > 0);
check('narrow viewports open on the tablet preset',
	[1000, 900, 760].every(w => sweep[w].view === 'tablet' && sweep[w].cols === sweep[w].presetSize));
check('phones get cards instead', sweep[700].cards && sweep[390].cards);
check('nothing overflows the document', Object.values(sweep).every(s => !s.docOverflow));
check('the preset button is lit', sweep[1600].lit[0] === 'normal' && sweep[900].lit[0] === 'tablet');
check('neither default names itself in the URL',
	!sweep[1600].url.includes('view=') && !sweep[900].url.includes('view='));

// 2. An explicit ?view= beats the viewport ----------------------------------
console.log('\n--- explicit view ---');
let page = await open(900, 1000, 'view=normal');
let s = await state(page);
console.log('900px + ?view=normal ->', s.view, s.cols, 'cols');
check('an explicit ?view= wins over the viewport',
	s.view === 'normal' && s.cols === sweep[1600].cols);
check('and stays in the shared URL', s.url.includes('view=normal'));
await page.close();

// 3. Resizing follows the breakpoint, until the visitor chooses -------------
console.log('\n--- resize ---');
page = await open(1600, 900);
const r1 = await state(page);
await page.setViewportSize({ width: 900, height: 900 });
await page.waitForTimeout(1400);
const r2 = await state(page);
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(1400);
const r3 = await state(page);
await page.evaluate(() => $('#toh-cols-presets A[data-key=mini]').trigger('click'));
await page.waitForTimeout(1200);
const r4 = await state(page);
await page.setViewportSize({ width: 900, height: 900 });
await page.waitForTimeout(1400);
const r5 = await state(page);
console.log([r1, r2, r3, r4, r5].map(x => x.view).join(' -> '));
check('resizing narrow switches renderer without a reload', r2.view === 'tablet');
check('resizing back restores the desktop preset', r3.view === 'normal');
check('a hand-picked view survives a resize', r4.view === 'mini' && r5.view === 'mini');
await page.close();

// 4. The sticky summary row -------------------------------------------------
console.log('\n--- summary row ---');
page = await open(1500, 900);
const s1 = await state(page);
await page.evaluate(() => { document.body.scrollTop = 900; });
await page.waitForTimeout(700);
const s2 = await state(page);
await page.evaluate(() => { document.body.scrollTop = 0; });
await page.waitForTimeout(400);
await page.click('#toh-search-input-model');
await page.type('#toh-search-input-model', 'Archer', { delay: 25 });
await page.waitForTimeout(1500);
await page.evaluate(() => $('.toh-filters-list INPUT[data-key]').first().trigger('click'));
await page.waitForTimeout(1500);
await page.evaluate(() => { document.body.scrollTop = 900; });
await page.waitForTimeout(700);
const sum = await page.evaluate(() => ({
	chips: [...document.querySelectorAll('#toh-summary-chips .toh-summary-chip')]
		.map(c => c.textContent.replace(/\s+/g, ' ').trim()),
	count: document.getElementById('toh-summary-count').textContent.trim(),
	rows: tabuTable.getRows('active').length,
}));
console.log('chips:', JSON.stringify(sum.chips), '| count:', sum.count);
check('the bar is hidden at the top of the page', !s1.summaryOn && s1.barH === 0);
check('it appears once the hero has gone', s2.summaryOn && s2.barH === 44);
check('the sidebar sticks below it', s2.sideTop === 60 + 44);
check('it names the search and the filters', sum.chips.length === 2 && sum.chips[0].includes('Archer'));
check('it counts what is left', /of/.test(sum.count) && sum.rows < TOTAL);
const before = sum.rows;
await page.evaluate(() => $('#toh-summary-chips .toh-summary-chip-drop[data-field=model]').trigger('click'));
await page.waitForTimeout(1400);
const dropped = await page.evaluate(() => tabuTable.getRows('active').length);
check('dropping a chip drops only that term', dropped > before);
await page.evaluate(() => $('#toh-summary-clear').trigger('click'));
await page.waitForTimeout(1400);
const cleared = await page.evaluate(() => ({
	rows: tabuTable.getRows('active').length,
	chips: document.querySelectorAll('#toh-summary-chips .toh-summary-chip').length,
}));
check('Clear empties the bar and the filters', cleared.rows === TOTAL && cleared.chips === 0);
await page.close();

// 5. Row density ------------------------------------------------------------
console.log('\n--- density ---');
page = await open(1500, 900);
const d1 = await state(page);
await page.evaluate(() => $('.toh-density-but[data-density=compact]').trigger('click'));
await page.waitForTimeout(1200);
const d2 = await state(page);
const page2 = await open(1500, 900);			// same context: the cookie applies
const d3 = await state(page2);
console.log('rows:', d1.rowH, '->', d2.rowH, '-> reload', d3.rowH);
check('comfortable is the height the table always had', d1.rowH === 34);
check('compact shortens the rows without a reload', d2.rowH === 28);
check('the choice survives a reload', d3.rowH === 28);
await page2.evaluate(() => $('.toh-density-but[data-density=comfortable]').trigger('click'));
await page2.waitForTimeout(1000);
check('switching back restores it', (await state(page2)).rowH === 34);
await page.close(); await page2.close();

// 6. The phone card renderer ------------------------------------------------
console.log('\n--- cards ---');
page = await open(390, 844);
const c1 = await state(page);
const card = await page.evaluate(() => {
	const c = document.querySelector('.toh-card-dev');
	return {
		brand: c.querySelector('.toh-card-brand').textContent,
		model: c.querySelector('.toh-card-model').textContent,
		stateText: c.querySelector('.toh-card-state').textContent.trim(),
		specs: c.querySelectorAll('.toh-card-spec').length,
		y: Math.round(c.getBoundingClientRect().top + document.body.scrollTop),
		pager: document.getElementById('toh-cards-page').textContent,
	};
});
console.log('first card:', card.brand, '/', card.model, '/', card.stateText, '| y =', card.y);
check('the phone draws 30 cards, no table', c1.cards && c1.cardCount === 30);
check('a card says brand, model, support state and specs',
	!!card.brand && !!card.model && card.stateText.length > 0 && card.specs >= 2);
check('the pager reports page and total',
	new RegExp('Page 1 of \\d+ · ' + TOTAL.toLocaleString('en-US') + ' devices').test(card.pager));
check('the first device is on the opening screen', card.y < 844);

await page.click('#toh-cards-next');
await page.waitForTimeout(1200);
check('Next pages through Tabulator', (await page.evaluate(() => tabuTable.getPage())) === 2);

await page.evaluate(() => $('.toh-card-dev').first().find('.toh-card-fav').trigger('click'));
await page.evaluate(() => {
	const id = $('.toh-card-dev').first().attr('data-id');
	tohCompareToggle(id, !tohCompareHas(id));
});
await page.waitForTimeout(900);
const shared = await page.evaluate(() => ({
	favs: toh_favorites.length, cmps: toh_compare.length,
	tray: !document.getElementById('toh-compare-tray').classList.contains('toh-hidden'),
}));
check('favouriting from a card reaches the shared state', shared.favs === 1);
check('comparing from a card reaches the shared state', shared.cmps === 1);
check('the compare tray opens from a card', shared.tray);

await page.evaluate(() => $('.toh-card-dev').first().find('.toh-card-details').trigger('click'));
await page.waitForTimeout(900);
const sheet = await page.evaluate(() => {
	const b = document.getElementById('toh-sheet-body');
	return {
		open: !document.getElementById('toh-sheet').classList.contains('toh-hidden'),
		title: !!b.querySelector('.toth-details-title'),
		groups: b.querySelectorAll('.toh-details-group').length,
		chars: b.textContent.trim().length,
	};
});
console.log('sheet:', JSON.stringify(sheet));
check('Details opens the sheet with the real details',
	sheet.open && sheet.title && sheet.groups >= 3 && sheet.chars > 400);
await page.evaluate(() => tohSheetClose());
await page.waitForTimeout(500);
check('closing the sheet leaves the cards up',
	(await page.evaluate(() => !document.getElementById('toh-sheet').classList.contains('toh-hidden'))) === false);

// 6b. Phone chrome, from the PR #54 review -----------------------------------
// The drawer covered 70% of the screen, the info card charged 32px of border
// and margin for itself, and the tap rows were pointer-sized.
const chrome = await page.evaluate(() => {
	document.body.classList.add('toh-sidebar-open');
	const side = document.getElementById('toh-sidebar').getBoundingClientRect();
	const info = document.getElementById('toh-info').getBoundingClientRect();
	document.body.classList.remove('toh-sidebar-open');
	return { drawer: Math.round(side.width), info: Math.round(info.width), vw: window.innerWidth };
});
console.log('phone chrome:', JSON.stringify(chrome));
check('the filter drawer covers the phone screen', chrome.drawer === chrome.vw);
check('the info section uses the full width', chrome.info === chrome.vw);
await page.close();

// a touch device gets tap-sized rows; a mouse keeps the tuned density
const touchCtx = await browser.newContext({ hasTouch: true, isMobile: true,
	viewport: { width: 390, height: 844 } });
const tp = await touchCtx.newPage();
await tp.route('**://openwrt.org/toh.json*', r => r.fulfill({ contentType: 'application/json', body: toh }));
await tp.route('**://downloads.openwrt.org/.versions.json*', r => r.fulfill({ contentType: 'application/json', body: versions }));
await tp.route('**://openwrt.org/_media/**', r => r.abort());
await tp.goto(BASE + '/index.html?cache=' + CACHE + '&touch=1', { waitUntil: 'load' });
await tp.waitForFunction(() => window.tabuTable && tabuTable.getData().length > 0, null, { timeout: 180000 });
await tp.waitForTimeout(1500);
const tapH = await tp.evaluate(() => {
	const a = document.querySelector('.toh-filter-feature .toh-filter-title A');
	return a ? Math.round(a.getBoundingClientRect().height) : 0;
});
console.log('filter row on a touch device:', tapH + 'px');
check('touch devices get tap-sized filter rows', tapH >= 40);
await tp.close(); await touchCtx.close();

// 7. The device search matches what the Device column shows ------------------
console.log('\n--- device search & flash filter ---');
page = await open(1500, 900);
const search = async (q) => {
	await page.evaluate(() => $('#toh-search-input-model').val('').trigger('keyup'));
	await page.waitForTimeout(600);
	await page.click('#toh-search-input-model');
	await page.type('#toh-search-input-model', q, { delay: 15 });
	await page.waitForTimeout(1200);
	return page.evaluate(() => ({
		n: tabuTable.getRows('active').length,
		models: tabuTable.getData('active').slice(0, 10).map(r => r.brand + ' / ' + r.model),
	}));
};
const t = await search('Turris');
console.log('"Turris" ->', t.n);
check('a brand-only search finds the whole family', t.n >= 8 && t.models.some(m => /omnia/i.test(m)));
const o = await search('turris omnia');
check('brand + model words narrow it down', o.n >= 1 && o.models.every(m => /omnia/i.test(m)));
check('a model-only search still works', (await search('Archer C7')).n >= 1);
check('there is exactly one search box', 1 === await page.evaluate(() => $('.toh-search-input').length));

await page.evaluate(() => $('#toh-search-input-model').val('').trigger('keyup'));
await page.waitForTimeout(600);
const flash = (v) => page.evaluate(async (val) => {
	tabuTable.setHeaderFilterValue('flashmb', /^\d+$/.test(val) ? { minimum: val, search: '' } : { minimum: '', search: val });
	await new Promise(r => setTimeout(r, 600));
	const n = tabuTable.getRows('active').length;
	tabuTable.setHeaderFilterValue('flashmb', null);
	return n;
}, v);
check('a number in the flash filter means minimum MB', (await flash('512')) < TOTAL);
check('text in the flash filter searches', (await flash('NAND')) < TOTAL);
check('the flash filter is one readable input', 1 === await page.evaluate(() =>
	document.querySelectorAll('.tabulator-col[tabulator-field="flashmb"] .tabulator-header-filter input').length));
// a bare flash size gets its MB unit, and the extra chip (eMMC/NAND) is kept
const flashCell = await page.evaluate(() => {
	const d = tabuTable.getData().find(r => Array.isArray(r.flashmb)
		&& r.flashmb.length === 2 && /^\d+$/.test(String(r.flashmb[0])) && /eMMC/i.test(String(r.flashmb[1])));
	const col = tabuTable.getColumn('flashmb');
	return FormatterArray({ getValue: () => d.flashmb }, col.getDefinition().formatterParams);
});
console.log('flash "8/eMMC" renders as:', flashCell);
check('a bare flash size shows its unit', /\d+ MB \+ eMMC/i.test(flashCell));
// the phone card and the details chip share the rule with the cell: never
// "8, eMMC MB" again (the unit glued onto the wrong token)
const flashTexts = await page.evaluate(() => {
	const d = tabuTable.getData().find(r => Array.isArray(r.flashmb)
		&& r.flashmb.length === 2 && /^\d+$/.test(String(r.flashmb[0])) && /eMMC/i.test(String(r.flashmb[1])));
	const card = document.createElement('div');
	card.innerHTML = tohCardHtml({ getData: () => d });
	const details = document.createElement('div');
	details.innerHTML = tohDeviceDetailsHtml({ getData: () => d });
	const chip = [...details.querySelectorAll('.toh-details-chip')]
		.map(c => c.textContent).find(t => /Flash/.test(t)) || '';
	return { card: card.textContent, chip };
});
check('the phone card says "8 MB + eMMC", not "8, eMMC MB"',
	/\d+ MB \+ eMMC/i.test(flashTexts.card) && !/eMMC MB/i.test(flashTexts.card));
check('the details flash chip agrees', /\d+ MB \+ eMMC/i.test(flashTexts.chip));

// the static server itself: malformed escapes must not kill it, and a path
// resolving into a sibling directory that shares ROOT as a string prefix
// must not be served
// %2e%2e, not a literal "../": fetch collapses dot segments client-side, so a
// literal one never reaches the server. Encoded, it arrives intact and only
// decodeURIComponent turns it into "..", which is the path the guard must stop.
const srvBad = await fetch(BASE + '/%zz').then(r => r.status).catch(() => 'dead');
const srvUp = await fetch(BASE + '/%2e%2e/' + ROOT.split('/').pop() + '-x/etc').then(r => r.status).catch(() => 'dead');
const srvOut = await fetch(BASE + '/%2e%2e/%2e%2e/%2e%2e/etc/hosts').then(r => r.status).catch(() => 'dead');
const srvOk = await fetch(BASE + '/index.html').then(r => r.status).catch(() => 'dead');
check('a malformed escape gets 400, not a dead server', srvBad === 400 && srvOk === 200);
check('an encoded traversal into a sibling directory is refused', srvUp === 404);
check('an encoded traversal out of the repo is refused', srvOut === 404);

// 8. The details download block ----------------------------------------------
console.log('\n--- details downloads ---');
const ids = await page.evaluate(() => {
	const rows = tabuTable.getData();
	return {
		cur: rows.find(r => /^\d/.test(String(r.supportedcurrentrel)) && r.firmwareopenwrtinstallurl && r.target)?.deviceid,
		old: rows.find(r => String(r.supportedcurrentrel).toLowerCase() === 'eol' && r.firmwareopenwrtinstallurl)?.deviceid,
		none: rows.find(r => !r.firmwareopenwrtinstallurl && !r.firmwareopenwrtupgradeurl)?.deviceid,
	};
});
const dlrow = (id) => page.evaluate((i) => {
	const d = tabuTable.getData().find(r => r.deviceid === i);
	const el = document.createElement('div'); el.innerHTML = tohDeviceDownloadsHtml(d);
	return {
		main: el.querySelector('.toh-dlrow-main')?.textContent.trim() || null,
		olders: [...el.querySelectorAll('.toh-dlrow-old')].map(a => a.textContent.trim().replace(/\s+/g, ' ')),
		empty: el.innerHTML === '',
	};
}, id);
const da = await dlrow(ids.cur), db = await dlrow(ids.old), dc = await dlrow(ids.none);
console.log('current:', JSON.stringify(da.main), '| eol olders:', db.olders.length, '| none empty:', dc.empty);
check('a supported device leads with the current build', da.main !== null && /\d+\.\d+/.test(da.main));
check('its recorded images sit under it, release named', da.olders.length > 0 && /\d+\.\d+/.test(da.olders[0]));
check('an EOL device gets no primary, only the recorded image', db.main === null && db.olders.length > 0);
check('a device with nothing gets no block at all', dc.empty);
await page.close();

// 8b. Compare : each column is a card that opens the device's full details ---
console.log('\n--- compare cards ---');
page = await open(1500, 950);
const cmp = await page.evaluate(async () => {
	const ids = tabuTable.getData().slice(0, 3).map(d => d.deviceid);
	ids.forEach(id => tohCompareToggle(id, true));
	tohOpenCompare();
	await new Promise(r => setTimeout(r, 400));
	const cards = [...document.querySelectorAll('#toh-compare-body .toh-compare-card')];
	const linkTitles = [...document.querySelectorAll('#toh-compare-body .toh-compare-devlink')].map(a => a.title);
	// click the first card's name -> the details sheet opens over the comparison
	cards[0].click();
	await new Promise(r => setTimeout(r, 400));
	const sheet = document.getElementById('toh-sheet');
	const open = !sheet.classList.contains('toh-hidden');
	const groups = sheet.querySelectorAll('.toh-details-group').length;
	tohSheetClose();
	await new Promise(r => setTimeout(r, 200));
	const backToCompare = !document.getElementById('toh-compare-panel').classList.contains('toh-hidden');
	return { cards: cards.length, badges: document.querySelectorAll('#toh-compare-body .toh-compare-badge .toh-badge').length,
		linkTitles, open, groups, backToCompare };
});
console.log('cards:', cmp.cards, '| link kinds:', JSON.stringify([...new Set(cmp.linkTitles)]), '| sheet groups:', cmp.groups);
check('the comparison shows a card per device', cmp.cards === 3);
check('each card carries a support badge', cmp.badges === 3);
check('cards link out to the forum / wiki', cmp.linkTitles.some(t => /forum/i.test(t)));
check('clicking a card opens the full details over the comparison', cmp.open && cmp.groups >= 3);
check('closing the details returns to the comparison', cmp.backToCompare);
await page.close();

// 8c. The details view explains the release warning triangle -----------------
console.log('\n--- partial support notice ---');
page = await open(1500, 900);
const notices = await page.evaluate(() => {
	const rows = tabuTable.getData();
	const partial = rows.find(r => /^\d/.test(String(r.supportedcurrentrel))
		&& r.unsupported_functions && String(r.unsupported_functions).trim()
		&& !/never supported/i.test(String(r.unsupported_functions)));
	const never = rows.find(r => /never supported/i.test(String(r.unsupported_functions)));
	const clean = rows.find(r => /^\d/.test(String(r.supportedcurrentrel))
		&& (!r.unsupported_functions || String(r.unsupported_functions).trim() === '-'
			|| String(r.unsupported_functions).trim() === ''));
	const text = (id) => {
		const el = document.createElement('div');
		el.innerHTML = tohDeviceDetailsHtml({ getData: () => rows.find(r => r.deviceid === id) });
		return [...el.querySelectorAll('.toh-notice')].map(n => n.textContent.replace(/\s+/g, ' ').trim());
	};
	return { partial: text(partial.deviceid), never: text(never.deviceid), clean: text(clean.deviceid) };
});
console.log('partial:', JSON.stringify(notices.partial));
check('a partly-supported device explains what does not work',
	notices.partial.some(n => /Partly supported/.test(n) && /Does not work/.test(n)));
check('a never-supported device says so, not "unknown"',
	notices.never.some(n => /Not supported/.test(n)) && !notices.never.some(n => /unknown/i.test(n)));
check('a fully supported device gets no warning notice',
	!notices.clean.some(n => /Partly supported|Not supported|No longer/.test(n)));

const extras = await page.evaluate(() => {
	const withCommit = tabuTable.getData().find(r => r.supportedsincecommit && r.deviceid);
	const el = document.createElement('div');
	el.innerHTML = tohDeviceDetailsHtml({ getData: () => withCommit });
	return {
		rowsHasCommit: toh_compare_rows.some(s => s.fields.includes('supportedsincecommit')),
		rowsNoDupRelease: !toh_compare_rows.some(s => s.fields.includes('supportedcurrentrel')),
		editLink: !!el.querySelector('a.toh-details-edit'),
		editIsExternal: el.querySelector('a.toh-details-edit')?.getAttribute('target') === '_blank',
	};
});
check('the comparison drops the duplicate release and adds the commit',
	extras.rowsHasCommit && extras.rowsNoDupRelease);
check('a device page offers a wiki edit link', extras.editLink && extras.editIsExternal);
check('Edit is no longer a table column', await page.evaluate(() =>
	tabuTable.getColumns().every(c => c.getField() !== 'VIRT_edit')));
await page.close();

// 9. Device data is HTML-escaped before it reaches the DOM -------------------
// toh.json is community-edited wiki data; a field carrying markup must not
// become live HTML. Payload probes both the angle brackets and the single
// quote (attributes in this code are written with either kind).
console.log('\n--- escaping ---');
page = await open(1500, 900);
const esc = await page.evaluate(() => {
	const evil = "x'\"><img src=x onerror=alert(1)>";
	const row = { getValue: () => evil, getRow: () => ({ getData: () => ({
		brand: evil, model: evil, deviceid: evil, cpu: evil }) }) };
	return {
		attr: tohAttr(evil),
		device: FormatterDevice(row),
		cell: tohCompareCell('brand', { brand: evil, model: evil }),
	};
});
// the injected "<img" must never survive as a real tag: escaped output carries
// "&lt;img", so the raw "<img" substring is the thing that would be a live tag
const noRawImg = s => !/<img/i.test(s);
check('tohAttr escapes the single quote', esc.attr.includes('&#39;') && !esc.attr.includes("'"));
check('tohAttr escapes angle brackets', !/<|>/.test(esc.attr));
check('the Device formatter escapes the payload', noRawImg(esc.device));
check('the compare cell escapes the payload', noRawImg(esc.cell));
await page.close();

// N. Foldables : the cover screen, and unfolding back into the table --------
// The pager's Next button used to be clipped off the right edge below 416px,
// which left no way at all to reach page 2 of 101 on a Z Fold cover screen.
console.log('\n--- foldables ---');
{
	const page = await open(344, 882);
	const fold = await page.evaluate(() => {
		const next = document.getElementById('toh-cards-next');
		const off = [...document.querySelectorAll('button, a, input')]
			.filter(e => { const r = e.getBoundingClientRect();
				return r.width > 0 && r.height > 0 && r.right > window.innerWidth + 0.5; })
			.filter(e => !e.closest('#toh-collections-list'))   // a deliberate scroll shelf
			.map(e => e.id || e.className);
		return {
			nextRight: next ? Math.round(next.getBoundingClientRect().right) : null,
			inner: window.innerWidth,
			docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
			offscreen: off,
		};
	});
	console.log('  344px: doc overflow ' + fold.docOverflow
		+ ' | Next right ' + fold.nextRight + '/' + fold.inner
		+ (fold.offscreen.length ? ' | offscreen: ' + fold.offscreen.join(', ') : ''));
	check('nothing overflows the cover screen', !fold.docOverflow);
	check('the card pager stays on the cover screen', fold.nextRight !== null && fold.nextRight <= fold.inner);
	check('no control is pushed off the cover screen', fold.offscreen.length === 0);

	// Tabulator builds itself inside a display:none container down here, so it
	// holds no row elements; unfolding has to redraw or the table comes back
	// as a header, a footer and nothing in between.
	const folded = await page.evaluate(() => document.querySelectorAll('#toh-table .tabulator-row').length);
	await page.setViewportSize({ width: 841, height: 673 });
	await page.waitForTimeout(1200);
	const unfolded = await page.evaluate(() => document.querySelectorAll('#toh-table .tabulator-row').length);
	console.log('  unfold 344->841: rows ' + folded + ' -> ' + unfolded);
	check('unfolding the device renders the table', unfolded > 0);
	await page.close();
}

// N+1. Shareable state : every parameter survives the next filter change -----
// buildBrowserUrl() rewrites the whole query from state, so a parameter it does
// not model is destroyed within a second of boot. ?device= used to be one.
console.log('\n--- shareable URLs ---');
{
	const id = JSON.parse(toh).entries[0][0];
	const page = await open(1280, 900, 'device=' + encodeURIComponent(id));
	const after = await page.evaluate(() => location.search);
	check('?device= survives the boot rewrite', after.includes('device='));
	await page.evaluate(() => buildBrowserUrl());
	const later = await page.evaluate(() => location.search);
	check('?device= survives a later URL rebuild', later.includes('device='));
	console.log('  ' + after + '  ->  ' + later);
	await page.close();
}

// N+2. Wiki data cannot reach the DOM as markup -----------------------------
// A poisoned dataset through every renderer at once. The formatters are the
// part that kept leaking: they are handed to innerHTML on trust.
console.log('\n--- injection sweep ---');
{
	const data = JSON.parse(toh);
	const ci = Object.fromEntries(data.columns.map((c, i) => [c, i]));
	const PWN = '<img src=pwn onerror="window.__xss=(window.__xss||0)+1">';
	for (const f of ['brand', 'model', 'cpu', 'target', 'packagearchitecture',
					 'gpios', 'ethernet100mports', 'forumsearch']) {
		if (ci[f] !== undefined) { data.entries[0][ci[f]] = PWN; }
	}
	if (ci.wikideviurl !== undefined) { data.entries[0][ci.wikideviurl] = 'javascript:window.__jsurl=1'; }

	const page = await ctx.newPage();
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.addInitScript(() => { window.__xss = 0; window.__jsurl = 0; });
	await page.route('**://openwrt.org/toh.json*', r =>
		r.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
	await page.route('**://downloads.openwrt.org/.versions.json*', r =>
		r.fulfill({ contentType: 'application/json', body: versions }));
	await page.route('**://openwrt.org/_media/**', r => r.abort());
	await page.goto(BASE + '/index.html?cache=' + CACHE, { waitUntil: 'load' });
	await page.waitForFunction(() => window.tabuTable && tabuTable.getData().length > 0, null, { timeout: 180000 });
	await page.waitForTimeout(1500);

	const bad = await page.evaluate(() => ({
		fired: window.__xss,
		nodes: document.querySelectorAll('img[src^="pwn"]').length,
		jsHrefs: document.querySelectorAll('a[href^="javascript:"]').length,
	}));
	console.log('  executions ' + bad.fired + ' | injected nodes ' + bad.nodes
		+ ' | javascript: hrefs ' + bad.jsHrefs);
	check('a poisoned dataset executes nothing', bad.fired === 0);
	check('a poisoned dataset injects no elements', bad.nodes === 0);
	check('a wiki URL cannot become a javascript: link', bad.jsHrefs === 0);
	await page.close();
}

// N+2b. Facet pages : the related chips lead somewhere -----------------------
// Every facet has a page of its own, so every related chip should be a link.
// It used to test the current page's type instead of the related field, which
// left the brand page's Targets and the target page's Manufacturers as dead
// spans - the one navigation these pages exist to offer.
console.log('\n--- facet cross-links ---');
{
	const page = await open(1280, 900);
	for (const [type, param] of [['brand', 'brand'], ['target', 'target'], ['chipset', 'chipset']]) {
		const value = await page.evaluate(t => {
			const f = toh_facets[t];
			const seen = tohCountBy(tohRows(), f.field);
			return seen.length ? seen[0][0] : null;
		}, type);
		if (!value) { check(type + ' page has a value to open', false); continue; }
		const links = await page.evaluate(([t, v]) => {
			tohOpenFacet(t, v, false);
			const chips = document.querySelectorAll('#toh-facet-body .toh-facet-chips .toh-facet-chip');
			const linked = document.querySelectorAll('#toh-facet-body .toh-facet-chips a.js-toh-facet');
			return { chips: chips.length, linked: linked.length,
				types: [...new Set([...linked].map(a => a.dataset.type))] };
		}, [type, value]);
		console.log('  ' + type.padEnd(8) + ' "' + String(value).slice(0, 24) + '" : '
			+ links.linked + '/' + links.chips + ' chips link'
			+ (links.types.length ? ' -> ' + links.types.join(',') : ''));
		check('the ' + type + ' page links its related chips',
			links.chips > 0 && links.linked === links.chips);
	}
	await page.close();
}

// N+3. The RAM parser cannot throw inside a sorter --------------------------
console.log('\n--- value parsing ---');
{
	const page = await open(1280, 900);
	const ram = await page.evaluate(() => {
		const t = v => { try { return _getCleanNumber(v, 'ram'); } catch (e) { return 'THREW'; } };
		return { list: t('8 GB, 16 GB'), gb: t('4 GB'), mb: t('512 MB'),
				 prose: t('more than 4GB'), noisy: t('DDR3 2 GB') };
	});
	console.log('  ' + JSON.stringify(ram));
	check('a comma-separated RAM list does not throw', ram.list === 16385);
	check('GB still ranks just above its MB equivalent', ram.gb === 4097);
	check('MB parses as a number, not a string', ram.mb === 512);
	check('the wiki wording "more than 4GB" parses', ram.prose === 4097);
	await page.close();
}

// ---------------------------------------------------------------------------
console.log('\n--- results ---');
results.forEach(([n, ok]) => console.log((ok ? 'PASS' : 'FAIL') + '  ' + n));
const bad = results.filter(([, ok]) => !ok).length;
console.log('\n' + (results.length - bad) + '/' + results.length + ' passed');
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
