import { Echo } from "@atums/echo";
import { SQL } from "bun";
import { runMigrations } from "./migrations";
import { router } from "./router";
import { initializeCheckers } from "./routes/checks";

const logger = new Echo({ disableFile: true });

const dbUrl = process.env.DATABASE_URL || "postgres://localhost:5432/status";
export const sql = new SQL(dbUrl);

await runMigrations(sql);
await initializeCheckers();

const server = Bun.serve({
	hostname: process.env.API_HOST || "0.0.0.0",
	port: process.env.API_PORT || 3001,
	async fetch(req) {
		const url = new URL(req.url);
		const method = req.method;

		try {
			const response = await router(req, url, method);
			return response;
		} catch (err) {
			logger.error("Request error:", err);
			return Response.json({ error: "Internal server error" }, { status: 500 });
		}
	},
});

logger.info(`API server running on http://${server.hostname}:${server.port}`);
