import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// toh_main.js is a classic browser script, not a module. Running it in a vm
// context with the few globals it touches at load time exposes its function
// declarations on the context object, where the tests can call them.
export function loadTohMain(extraGlobals = {}) {
	const jq = () => ({ ready() {} });
	jq.fn = {};
	const context = createContext({
		$: jq,
		jQuery: jq,
		document: {},
		console,
		Tabulator: { extendModule() {} },
		...extraGlobals,
	});
	const source = readFileSync(
		join(root, "static", "js", "toh_main.js"),
		"utf8",
	);
	runInContext(source, context, { filename: "static/js/toh_main.js" });
	return context;
}
