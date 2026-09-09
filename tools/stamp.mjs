// Stamp every local asset in index.html with a hash of its contents.
//
//	The page used to append "?c=<today's date>" to its own scripts from an
//	inline loader. That re-downloaded 363 KB of byte-identical files once a day
//	for every returning visitor, and it protected the wrong files: jQuery and
//	Tabulator, the two big ones, were plain tags with no key at all.
//
//	A content hash is the opposite trade. A file that did not change keeps its
//	URL and is never fetched again; a file that did change gets a new one and
//	cannot be served stale. It also makes a long Cache-Control on /static/ safe
//	to ask for, which a date-based key never could be.
//
//	Run it before tagging a release:  node tools/stamp.mjs
//	Check it in CI:                   node tools/stamp.mjs && git diff --exit-code index.html
//
//	Idempotent: running it twice in a row changes nothing.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'index.html');

// src="static/…" or href="static/…", with or without a stamp already on it
const ASSET = /((?:src|href)=")(static\/[^"?]+)(\?v=[0-9a-f]{8})?"/g;

let html = readFileSync(PAGE, 'utf8');
let stamped = 0;
const missing = [];

html = html.replace(ASSET, (whole, attr, path, old) => {
	const file = join(ROOT, path);
	if (!existsSync(file)) {
		missing.push(path);
		return whole;
	}
	const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
	stamped++;
	return `${attr}${path}?v=${hash}"`;
});

if (missing.length) {
	console.error('index.html references files that do not exist:');
	missing.forEach(p => console.error('  ' + p));
	process.exit(1);
}

const before = readFileSync(PAGE, 'utf8');
if (before === html) {
	console.log(`index.html: ${stamped} assets, all stamps current`);
} else {
	writeFileSync(PAGE, html);
	console.log(`index.html: ${stamped} assets stamped`);
}
