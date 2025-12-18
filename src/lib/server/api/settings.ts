import { request } from "./client";
import type { SiteSettings } from "../../../types";

export async function getSettings(): Promise<SiteSettings> {
	const result = await request<{ settings: SiteSettings }>("/settings");
	return result.settings;
}

export async function updateSettings(
	settings: Partial<SiteSettings>,
	sessionId: string,
): Promise<SiteSettings> {
	const result = await request<{ settings: SiteSettings }>("/settings", {
		method: "PUT",
		body: JSON.stringify(settings),
		sessionId,
	});
	return result.settings;
}
