import { execSync } from "child_process";
import { ok } from "../utils/response";

let commitHash = "dev";

try {
	const generated = await import("../version.generated");
	commitHash = generated.VERSION;
} catch {
	try {
		commitHash = execSync("git rev-parse --short HEAD").toString().trim();
	} catch {}
}

const rateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const windowStart = now - RATE_LIMIT_WINDOW;

	for (const [key, timestamp] of rateLimit) {
		if (timestamp < windowStart) rateLimit.delete(key);
	}

	const key = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
	const count = rateLimit.get(key) || 0;

	if (count >= RATE_LIMIT_MAX) return true;

	rateLimit.set(key, count + 1);
	return false;
}

export async function get(req: Request): Promise<Response> {
	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
		|| req.headers.get("x-real-ip")
		|| "unknown";

	if (isRateLimited(ip)) {
		return new Response(JSON.stringify({ error: "rate limited" }), {
			status: 429,
			headers: { "Content-Type": "application/json" },
		});
	}

	return ok({ version: commitHash });
}
