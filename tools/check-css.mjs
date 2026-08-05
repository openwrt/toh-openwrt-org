#!/usr/bin/env node
/*
 * Checks that toh.css parses as a whole.
 *
 * An unterminated rule at the end of the file is harmless - the browser closes
 * it at EOF - right up until someone appends to the file, at which point every
 * rule they added silently becomes part of it and is discarded. That is exactly
 * what happened to the status notices, and it is invisible: the file is served,
 * the class is on the element, and nothing is styled.
 *
 * Usage:
 *     node tools/check-css.mjs [path]
 */

import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'static/css/toh.css';
const css = readFileSync(path, 'utf8');

// blank out comments, keeping line numbers intact
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

let depth = 0;
let line = 1;
let openedAt = [];
const problems = [];

for (const ch of stripped) {
	if (ch === '\n') {
		line++;
	} else if (ch === '{') {
		depth++;
		openedAt.push(line);
	} else if (ch === '}') {
		depth--;
		openedAt.pop();
		if (depth < 0) {
			problems.push(`line ${line}: closing brace with nothing open`);
			depth = 0;
		}
	}
}

if (depth > 0) {
	problems.push(
		`${depth} rule(s) never closed, the first opened at line ${openedAt[0]} - ` +
		`everything after it is discarded by the browser`
	);
}

// a declaration outside any rule is dropped too, and just as quietly
let inRule = 0;
line = 1;
for (const raw of stripped.split('\n')) {
	const text = raw.trim();
	inRule += (raw.match(/{/g) || []).length - (raw.match(/}/g) || []).length;
	if (inRule === 0 && /^[a-z-]+\s*:\s*[^;]+;$/.test(text)) {
		problems.push(`line ${line}: "${text}" sits outside any rule`);
	}
	line++;
}

if (problems.length) {
	console.error(`${path}\n`);
	problems.forEach((p) => console.error('  ' + p));
	process.exit(1);
}
console.log(`${path}: braces balanced, ${css.split('\n').length} lines`);
