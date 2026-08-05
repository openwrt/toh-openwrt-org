#!/usr/bin/env node
/*
 * Checks that every icon the app asks for exists in the inlined sprite.
 *
 * A <use href="#i-missing"> renders nothing at all: no error, no console
 * warning, just a gap where the icon should be. That is how "cpu" and
 * "hard-drive" ended up referenced but absent - they were pruned from the
 * sprite while unused, then used again later - and how "chevron-left" was lost
 * in a rebase.
 *
 * Usage:
 *     node tools/check-icons.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync('index.html', 'utf8');
const sprite = new Set([...html.matchAll(/<symbol id="i-([a-z0-9-]+)"/g)].map((m) => m[1]));

const sources = ['index.html', ...readdirSync('static/js')
	.filter((f) => f.startsWith('toh_') && f.endsWith('.js'))
	.map((f) => join('static/js', f))];

const used = new Map();				// name -> where it was seen
for (const file of sources) {
	const text = readFileSync(file, 'utf8');
	const add = (name) => { if (!used.has(name)) used.set(name, file); };
	// <use href="#i-name">
	for (const m of text.matchAll(/href=['"]#i-([a-z0-9-]+)/g)) add(m[1]);
	// tohIcon('name extra-classes')
	for (const m of text.matchAll(/tohIcon\('([^']+)'\)/g)) add(m[1].trim().split(/\s+/)[0]);
}

const missing = [...used.entries()].filter(([name]) => !sprite.has(name));

if (missing.length) {
	console.error('icons referenced but not in the sprite:\n');
	for (const [name, file] of missing) {
		console.error(`  ${name.padEnd(24)} ${file}`);
	}
	console.error('\nAdd them to tools/gen-icon-sprite.mjs and regenerate.');
	process.exit(1);
}

console.log(`${sprite.size} symbols in the sprite, ${used.size} referenced, all resolve`);
