import { sql } from "../index";
import { getAuthContext, requireAuth, requireAdmin } from "../utils/auth";
import { ok, badRequest, unauthorized, forbidden } from "../utils/response";

export interface SiteSettings {
	siteName: string;
	siteIcon: string;
	siteUrl: string;
	sourceUrl: string;
	discordUrl: string;
	securityContact: string;
	securityCanonical: string;
}

export async function getSettings(): Promise<SiteSettings> {
	const rows = await sql`SELECT key, value FROM settings`;

	const map: Record<string, string> = {};
	for (const row of rows) {
		map[row.key as string] = row.value as string;
	}

	return {
		siteName: map.site_name || "atums/status",
		siteIcon: map.site_icon || "",
		siteUrl: map.site_url || "",
		sourceUrl: map.source_url || "",
		discordUrl: map.discord_url || "",
		securityContact: map.security_contact || "",
		securityCanonical: map.security_canonical || "/.well-known/security.txt",
	};
}

export async function get(): Promise<Response> {
	const settings = await getSettings();
	return ok({ settings });
}

export async function update(req: Request): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const body = await req.json();
	const { siteName, siteIcon, siteUrl, sourceUrl, discordUrl, securityContact, securityCanonical } = body;

	const updates: Array<{ key: string; value: string }> = [];

	if (typeof siteName === "string") {
		updates.push({ key: "site_name", value: siteName });
	}
	if (typeof siteIcon === "string") {
		if (siteIcon !== "") {
			try {
				const url = new URL(siteIcon);
				const path = url.pathname.toLowerCase();
				if (!path.endsWith(".jpg") && !path.endsWith(".jpeg") && !path.endsWith(".png")) {
					return badRequest("Site icon must be a .jpg or .png URL");
				}
			} catch {
				return badRequest("Site icon must be a valid URL");
			}
		}
		updates.push({ key: "site_icon", value: siteIcon });
	}
	if (typeof siteUrl === "string") {
		updates.push({ key: "site_url", value: siteUrl });
	}
	if (typeof sourceUrl === "string") {
		updates.push({ key: "source_url", value: sourceUrl });
	}
	if (typeof discordUrl === "string") {
		updates.push({ key: "discord_url", value: discordUrl });
	}
	if (typeof securityContact === "string") {
		updates.push({ key: "security_contact", value: securityContact });
	}
	if (typeof securityCanonical === "string") {
		updates.push({ key: "security_canonical", value: securityCanonical });
	}

	if (updates.length === 0) {
		return badRequest("No valid settings provided");
	}

	for (const { key, value } of updates) {
		await sql`
			INSERT INTO settings (key, value, updated_at)
			VALUES (${key}, ${value}, NOW())
			ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
		`;
	}

	const settings = await getSettings();
	return ok({ settings });
}

export async function getSecurityTxt(): Promise<Response> {
	const settings = await getSettings();
	const content = `Contact: ${settings.securityContact || "security@example.com"}
Preferred-Languages: en
Canonical: ${settings.securityCanonical || "/.well-known/security.txt"}
`;
	return new Response(content, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}
