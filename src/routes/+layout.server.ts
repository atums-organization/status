import { getSettings } from "$lib/server/api";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
	let siteName = "atums/status";
	let siteUrl = "";
	let sourceUrl = "";
	let discordUrl = "";

	try {
		const settings = await getSettings();
		siteName = settings.siteName || "atums/status";
		siteUrl = settings.siteUrl || "";
		sourceUrl = settings.sourceUrl || "";
		discordUrl = settings.discordUrl || "";
	} catch {
		// defaults if api kills itself
	}

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
