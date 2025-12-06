import { fail, redirect } from "@sveltejs/kit";
import { clearSession, getSessionId } from "$lib/server";
import * as api from "$lib/server/api";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = getSessionId(cookies);
	if (!sessionId) {
		redirect(302, "/login");
	}

	const user = await api.getUserById(sessionId);
	if (!user) {
		clearSession(cookies);
		redirect(302, "/login");
	}

	return { user };
};

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			redirect(302, "/login");
		}

		const user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			redirect(302, "/login");
		}

		const formData = await request.formData();
		const name = formData.get("name")?.toString().trim();
		const url = formData.get("url")?.toString().trim();
		const description =
			formData.get("description")?.toString().trim() || undefined;
		const expectedStatus = Number.parseInt(
			formData.get("expectedStatus")?.toString() || "200",
			10,
		);
		const checkInterval = Number.parseInt(
			formData.get("checkInterval")?.toString() || "60",
			10,
		);
		const enabled = formData.get("enabled") === "on";
		const isPublic = formData.get("isPublic") === "on";
		const groupName = formData.get("groupName")?.toString().trim() || null;

		if (!name) {
			return fail(400, {
				error: "Name is required",
				name,
				url,
				description,
				expectedStatus,
				checkInterval,
				groupName,
			});
		}

		if (!url) {
			return fail(400, {
				error: "URL is required",
				name,
				url,
				description,
				expectedStatus,
				checkInterval,
				groupName,
			});
		}

		try {
			new URL(url);
		} catch {
			return fail(400, {
				error: "Invalid URL format",
				name,
				url,
				description,
				expectedStatus,
				checkInterval,
				groupName,
			});
		}

		if (
			Number.isNaN(expectedStatus) ||
			expectedStatus < 100 ||
			expectedStatus > 599
		) {
			return fail(400, {
				error: "Expected status must be a valid HTTP status code",
				name,
				url,
				description,
				expectedStatus,
				checkInterval,
				groupName,
			});
		}

		if (
			Number.isNaN(checkInterval) ||
			checkInterval < 10 ||
			checkInterval > 3600
		) {
			return fail(400, {
				error: "Check interval must be between 10 and 3600 seconds",
				name,
				url,
				description,
				expectedStatus,
				checkInterval,
				groupName,
			});
		}

		const service = await api.createService(name, url, user.id, {
			description,
			expectedStatus,
			checkInterval,
			enabled,
			isPublic,
			groupName,
		});

		if (enabled) {
			await api.startChecker(service.id);
		}

		redirect(302, "/services");
	},
};
