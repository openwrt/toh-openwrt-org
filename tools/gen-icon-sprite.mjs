#!/usr/bin/env node
/*
 * Builds the inline Lucide SVG sprite used by index.html.
 *
 * The sprite is inlined rather than fetched so that icons are available before
 * any network round-trip (the boot overlay needs them) and so the page keeps
 * working when opened straight from disk.
 *
 * Usage:
 *     npm pack lucide-static@<version>   # or point ICONS_DIR at an existing checkout
 *     node tools/gen-icon-sprite.mjs <path-to-lucide-static/icons> > static/img/icons.svg
 *
 * Then paste the output between the sprite markers in index.html.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Every icon the app renders. Keep alphabetical, and keep in sync with tohIcon()
// call sites in static/js/toh_conf.js and static/js/toh_main.js.
const ICONS = [
	'book-open',
	'camera',
	'check',
	'chevron-down',
	'chevron-left',
	'chevron-right',
	'circle-check',
	'circle-help',
	'circle-x',
	'clock',
	'cloud-download',
	'code',
	'cpu',
	'database',
	'download',
	'ellipsis',
	'external-link',
	'factory',
	'file-down',
	'filter',
	'git-branch',
	'git-commit-horizontal',
	'hard-drive',
	'heart',
	'image',
	'info',
	'landmark',
	'layers',
	'lightbulb',
	'list',
	'loader-circle',
	'memory-stick',
	'moon',
	'network',
	'panel-left-close',
	'panel-left-open',
	'pencil',
	'rotate-ccw',
	'router',
	'search',
	'shield',
	'sliders-horizontal',
	'square',
	'square-check',
	'square-minus',
	'star',
	'sun',
	'table-columns-split',
	'tag',
	'triangle-alert',
	'usb',
	'user',
	'wifi',
	'x',
	'zap',
];

const iconsDir = process.argv[2];
if (!iconsDir) {
	console.error('usage: node tools/gen-icon-sprite.mjs <path-to-lucide-static/icons>');
	process.exit(1);
}

const symbols = ICONS.map((name) => {
	const svg = readFileSync(join(iconsDir, `${name}.svg`), 'utf8');
	const body = svg
		.replace(/^[\s\S]*?<svg[^>]*>/, '')
		.replace(/<\/svg>\s*$/, '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join('');
	return `\t\t<symbol id="i-${name}" viewBox="0 0 24 24">${body}</symbol>`;
}).join('\n');

process.stdout.write(
	`<svg xmlns="http://www.w3.org/2000/svg" class="toh-icon-sprite" aria-hidden="true" focusable="false">\n` +
	`\t<defs>\n${symbols}\n\t</defs>\n` +
	`</svg>\n`
);
