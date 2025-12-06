import * as auth from "./routes/auth";
import * as checks from "./routes/checks";
import * as services from "./routes/services";

type Handler = (
	req: Request,
	url: URL,
	params?: Record<string, string>,
) => Promise<Response>;

interface Route {
	pattern: RegExp;
	handlers: Partial<Record<string, Handler>>;
}

const basePath = process.env.API_BASE_PATH || "";

const routes: Route[] = [
	{
		pattern: /^\/auth\/login$/,
		handlers: { POST: auth.login },
	},
	{
		pattern: /^\/auth\/register$/,
		handlers: { POST: auth.register },
	},
	{
		pattern: /^\/auth\/user\/([^/]+)$/,
		handlers: { GET: auth.getUser },
	},
	{
		pattern: /^\/auth\/first-user$/,
		handlers: { GET: auth.isFirstUser },
	},
	{
		pattern: /^\/services$/,
		handlers: { GET: services.list, POST: services.create },
	},
	{
		pattern: /^\/services\/public$/,
		handlers: { GET: services.listPublic },
	},
	{
		pattern: /^\/services\/user\/([^/]+)$/,
		handlers: { GET: services.listByUser },
	},
	{
		pattern: /^\/services\/([^/]+)$/,
		handlers: {
			GET: services.get,
			PUT: services.update,
			DELETE: services.remove,
		},
	},
	{
		pattern: /^\/checks\/service\/([^/]+)$/,
		handlers: { GET: checks.getForService, POST: checks.runCheck },
	},
	{
		pattern: /^\/checks\/service\/([^/]+)\/latest$/,
		handlers: { GET: checks.getLatestForService },
	},
	{
		pattern: /^\/checks\/service\/([^/]+)\/stats$/,
		handlers: { GET: checks.getStatsForService },
	},
	{
		pattern: /^\/checks\/batch$/,
		handlers: { POST: checks.getLatestBatch },
	},
	{
		pattern: /^\/checker\/start\/([^/]+)$/,
		handlers: { POST: checks.startChecker },
	},
	{
		pattern: /^\/checker\/stop\/([^/]+)$/,
		handlers: { POST: checks.stopChecker },
	},
];

export async function router(
	req: Request,
	url: URL,
	method: string,
): Promise<Response> {
	let path = url.pathname;

	if (basePath && path.startsWith(basePath)) {
		path = path.slice(basePath.length) || "/";
	}

	for (const route of routes) {
		const match = path.match(route.pattern);
		if (match) {
			const handler = route.handlers[method];
			if (handler) {
				const params: Record<string, string> = {};
				if (match[1]) params.id = match[1];
				if (match[2]) params.id2 = match[2];
				return handler(req, url, params);
			}
			return Response.json({ error: "Method not allowed" }, { status: 405 });
		}
	}

	return Response.json({ error: "Not found" }, { status: 404 });
}
