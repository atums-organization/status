import { env } from "$env/dynamic/public";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
	const siteName = env.PUBLIC_SITE_NAME || "atums/status";
	const siteUrl = env.PUBLIC_SITE_URL || "";
	const sourceUrl = env.PUBLIC_SOURCE_URL || "";
	const discordUrl = env.PUBLIC_DISCORD_URL || "";

	const parts = siteName.split("/");
	const brand = parts[0] || siteName;
	const suffix = parts.length > 1 ? `/${parts.slice(1).join("/")}` : "";

	return {
		site: {
			name: siteName,
			brand,
			suffix,
			url: siteUrl,
			sourceUrl,
			discordUrl,
		},
	};
};
