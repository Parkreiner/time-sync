import { defineConfig } from "vitest/config";

// biome-ignore lint:style/noDefaultExport -- Vite expects this export type
export default defineConfig({
	test: {
		include: ["**/*.test.{ts,tsx}"],
		environment: "happy-dom",
		globalSetup: "./vitest.global-setup.ts",
	},
});
