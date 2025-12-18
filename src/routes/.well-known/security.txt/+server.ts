import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	const contact = env.SECURITY_CONTACT || "security@example.com";
	const canonical = env.SECURITY_CANONICAL || "/.well-known/security.txt";

	const content = `Contact: ${contact}
Preferred-Languages: en
Canonical: ${canonical}
`;

	return new Response(content, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
