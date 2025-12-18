import { redirect } from "@sveltejs/kit";
import { clearSession, getSessionId } from "$lib/server";
import * as api from "$lib/server/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = getSessionId(cookies);
	if (!sessionId) {
		redirect(302, "/login");
	}

	const user = await api.getUserById(sessionId, sessionId);
	if (!user) {
		clearSession(cookies);
		redirect(302, "/login");
	}

	return { user };
};
