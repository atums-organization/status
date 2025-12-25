import { getSettings } from "$lib/server/api";
import { env } from "$env/dynamic/public";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
	let siteName = "atums/status";
	let siteIcon = "";
	let siteUrl = "";
	let sourceUrl = "";
	let discordUrl = "";

	try {
		const settings = await getSettings();
		siteName = settings.siteName || "atums/status";
		siteIcon = settings.siteIcon || "";
		siteUrl = settings.siteUrl || "";
		sourceUrl = settings.sourceUrl || "";
		discordUrl = settings.discordUrl || "";
	} catch {}

	const parts = siteName.split("/");
	const brand = parts[0] || siteName;
	const suffix = parts.length > 1 ? `/${parts.slice(1).join("/")}` : "";

	const apiUrl = env.PUBLIC_API_URL || "http://localhost:3001/api";

	return {
		site: {
			name: siteName,
			icon: siteIcon,
			brand,
			suffix,
			url: siteUrl,
			sourceUrl,
			discordUrl,
		},
		apiUrl,
	};
};
