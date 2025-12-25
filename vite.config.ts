import { execSync } from "child_process";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

function getCommitHash(): string {
	try {
		return execSync("git rev-parse --short HEAD").toString().trim();
	} catch {
		return "dev";
	}
}

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__COMMIT_HASH__: JSON.stringify(getCommitHash()),
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
});
