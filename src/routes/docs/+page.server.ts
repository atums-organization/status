import { env } from "$env/dynamic/public";
import { getSessionId } from "$lib/server";
import * as api from "$lib/server/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = getSessionId(cookies);
	let user = null;

	if (sessionId) {
		user = await api.getUserById(sessionId, sessionId);
	}

	return {
		apiBase: env.PUBLIC_API_URL || "/api",
		user,
	};
};
