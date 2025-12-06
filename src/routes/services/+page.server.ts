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

	const services = await api.getServicesByUser(user.id);
	const serviceIds = services.map((s) => s.id);
	const checks = await api.getLatestChecksForServices(serviceIds);

	return { user, services, checks };
};

export const actions: Actions = {
	delete: async ({ cookies, request }) => {
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
		const serviceId = formData.get("id")?.toString();

		if (!serviceId) {
			return fail(400, { error: "Service ID required" });
		}

		await api.stopChecker(serviceId);
		await api.deleteService(serviceId);

		return { success: true };
	},

	check: async ({ cookies, request }) => {
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
		const serviceId = formData.get("id")?.toString();

		if (!serviceId) {
			return fail(400, { error: "Service ID required" });
		}

		const check = await api.runCheck(serviceId);

		return { success: true, check };
	},

	edit: async ({ cookies, request }) => {
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
		const serviceId = formData.get("id")?.toString();
		const name = formData.get("name")?.toString().trim();
		const url = formData.get("url")?.toString().trim();
		const displayUrl = formData.get("displayUrl")?.toString().trim() || null;
		const description = formData.get("description")?.toString().trim() || null;
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

		if (!serviceId) {
			return fail(400, { editError: "Service ID required" });
		}

		if (!name) {
			return fail(400, {
				editError: "Name is required",
				editServiceId: serviceId,
			});
		}

		if (!url) {
			return fail(400, {
				editError: "URL is required",
				editServiceId: serviceId,
			});
		}

		try {
			new URL(url);
		} catch {
			return fail(400, {
				editError: "Invalid URL format",
				editServiceId: serviceId,
			});
		}

		if (
			Number.isNaN(expectedStatus) ||
			expectedStatus < 100 ||
			expectedStatus > 599
		) {
			return fail(400, {
				editError: "Expected status must be a valid HTTP status code",
				editServiceId: serviceId,
			});
		}

		if (
			Number.isNaN(checkInterval) ||
			checkInterval < 10 ||
			checkInterval > 3600
		) {
			return fail(400, {
				editError: "Check interval must be between 10 and 3600 seconds",
				editServiceId: serviceId,
			});
		}

		await api.stopChecker(serviceId);

		await api.updateService(serviceId, {
			name,
			url,
			displayUrl,
			description,
			expectedStatus,
			checkInterval,
			enabled,
			isPublic,
			groupName,
		});

		if (enabled) {
			await api.startChecker(serviceId);
		}

		return { success: true, edited: true };
	},
};
