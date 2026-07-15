import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const { pluginOutputName } = JSON.parse(
	readFileSync(new URL("./package.json", import.meta.url), "utf-8")
);

export default defineConfig({
	// Output a single file named after `pluginOutputName` in package.json.
	entry: {
		[pluginOutputName]: "./src/main.ts",
	},
	outDir: "./dist",
	platform: "node",
	format: "cjs",
	// Emit a `.js` file (Firebot expects a plain `.js` plugin file).
	outExtensions: () => ({ js: ".js" }),
	clean: true,
	// Keep the bundle as one file.
	unbundle: false,
	// Minify, but preserve identifier names. The Firebot plugin loader relies on
	// the exported plugin object's function names (e.g. `onLoad`) staying intact.
	minify: {
		mangle: false,
		compress: true,
	},
	// Firebot provides the types library at runtime; never bundle it.
	deps: {
		neverBundle: ["@crowbartools/firebot-types"],
	},
	// No type declarations needed for a plugin bundle.
	dts: false,
	// Allow importing .html files as strings
	loader: {
		".html": "text"
	},
});
