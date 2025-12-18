import { getSettings } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	try {
		const settings = await getSettings();
		const contact = settings.securityContact || "security@example.com";
		const canonical = settings.securityCanonical || "/.well-known/security.txt";

		const content = `Contact: ${contact}
Preferred-Languages: en
Canonical: ${canonical}
`;

		return new Response(content, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	} catch {
		return new Response(
			`Contact: security@example.com
Preferred-Languages: en
Canonical: /.well-known/security.txt
`,
			{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
		);
	}
};
