import { clearSession, getSessionId } from "$lib/server";
import * as api from "$lib/server/api";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { env } from "$env/dynamic/public";

export const load: PageServerLoad = async ({ cookies, params }) => {
	const groupName = decodeURIComponent(params.group);
	const sessionId = getSessionId(cookies);
	const timezone = env.PUBLIC_TIMEZONE || "UTC";
	const discordUrl = env.PUBLIC_DISCORD_URL || null;

	let services;
	let user = null;

	if (!sessionId) {
		services = await api.getPublicServices();
	} else {
		user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			services = await api.getPublicServices();
		} else {
			services = await api.getServices();
		}
	}

	const filtered = services.filter(
		(s) => s.groupName?.toLowerCase() === groupName.toLowerCase(),
	);

	if (filtered.length === 0) {
		error(404, { message: `Group "${groupName}" not found` });
	}

	const serviceIds = filtered.map((s) => s.id);
	const [checks, uptime, activeEvents, recentEvents] =
		serviceIds.length > 0
			? await Promise.all([
					api.getLatestChecksForServices(serviceIds),
					api.getUptimeForServices(serviceIds),
					api.getActiveEvents(groupName),
					api.getEvents({ group: groupName, limit: 10 }),
				])
			: [{}, {}, [], []];

	return { user, services: filtered, checks, groupName, uptime, timezone, discordUrl, activeEvents, recentEvents };
};
