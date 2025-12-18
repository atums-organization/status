import { clearSession, getSessionId } from "$lib/server";
import * as api from "$lib/server/api";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { env } from "$env/dynamic/public";
import type { Service, ServiceCheck } from "$lib";

function calculateEmbed(
	groupName: string,
	services: Service[],
	checks: Record<string, ServiceCheck | null>,
	uptime: Record<string, { uptimePercent: number; totalChecks: number }>,
) {
	const siteName = env.PUBLIC_SITE_NAME || "atums/status";
	const siteUrl = env.PUBLIC_SITE_URL || "";

	if (services.length === 0) {
		return {
			siteName,
			siteUrl,
			title: `${groupName} | ${siteName}`,
			description: "No services in this group",
			status: "unknown" as const,
			color: 0x808080,
			uptimePercent: null,
			servicesUp: 0,
			servicesDown: 0,
			totalServices: 0,
		};
	}

	const servicesUp = services.filter((s) => checks[s.id]?.success).length;
	const servicesDown = services.length - servicesUp;

	const uptimeValues = services
		.map((s) => uptime[s.id])
		.filter((u) => u && u.totalChecks > 0);
	const avgUptime = uptimeValues.length > 0
		? uptimeValues.reduce((sum, u) => sum + u.uptimePercent, 0) / uptimeValues.length
		: null;

	let status: "operational" | "degraded" | "outage" | "unknown";
	let color: number;
	let statusText: string;

	if (servicesDown === 0) {
		status = "operational";
		color = 0x22c55e;
		statusText = "All Operational";
	} else if (servicesDown < services.length / 2) {
		status = "degraded";
		color = 0xeab308;
		statusText = `${servicesDown} Degraded`;
	} else {
		status = "outage";
		color = 0xef4444;
		statusText = "Major Outage";
	}

	const uptimeText = avgUptime !== null ? ` | ${avgUptime.toFixed(2)}% uptime` : "";
	const description = `${statusText}${uptimeText} | ${servicesUp}/${services.length} services up`;

	return {
		siteName,
		siteUrl,
		title: `${groupName} | ${siteName}`,
		description,
		status,
		color,
		uptimePercent: avgUptime !== null ? Math.round(avgUptime * 100) / 100 : null,
		servicesUp,
		servicesDown,
		totalServices: services.length,
	};
}

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
		user = await api.getUserById(sessionId, sessionId);
		if (!user) {
			clearSession(cookies);
			services = await api.getPublicServices();
		} else {
			services = await api.getServices(sessionId);
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
			: [{} as Record<string, ServiceCheck | null>, {} as Record<string, { uptimePercent: number; totalChecks: number }>, [], []];

	const publicServices = filtered.filter((s) => s.isPublic);
	const publicChecks: Record<string, ServiceCheck | null> = {};
	const publicUptime: Record<string, { uptimePercent: number; totalChecks: number }> = {};
	for (const s of publicServices) {
		publicChecks[s.id] = checks[s.id];
		if (uptime[s.id]) publicUptime[s.id] = uptime[s.id];
	}
	const embed = calculateEmbed(groupName, publicServices, publicChecks, publicUptime);

	return { user, services: filtered, checks, groupName, uptime, timezone, discordUrl, activeEvents, recentEvents, embed };
};
