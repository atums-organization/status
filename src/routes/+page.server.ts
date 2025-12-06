import { clearSession, getSessionId } from "$lib/server";
import * as api from "$lib/server/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = getSessionId(cookies);

	if (!sessionId) {
		// Not logged in - show public services only
		const services = await api.getPublicServices();
		const serviceIds = services.map((s) => s.id);
		const checks =
			serviceIds.length > 0
				? await api.getLatestChecksForServices(serviceIds)
				: {};
		return { user: null, services, checks };
	}

	const user = await api.getUserById(sessionId);
	if (!user) {
		clearSession(cookies);
		// Not logged in - show public services only
		const services = await api.getPublicServices();
		const serviceIds = services.map((s) => s.id);
		const checks =
			serviceIds.length > 0
				? await api.getLatestChecksForServices(serviceIds)
				: {};
		return { user: null, services, checks };
	}

	// Logged in - show all services
	const services = await api.getServices();
	const serviceIds = services.map((s) => s.id);
	const checks =
		serviceIds.length > 0
			? await api.getLatestChecksForServices(serviceIds)
			: {};

	return { user, services, checks };
};
