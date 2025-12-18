import { fail } from "@sveltejs/kit";
import { clearSession, getSessionId } from "$lib/server";
import * as api from "$lib/server/api";
import type { Actions, PageServerLoad } from "./$types";
import { env } from "$env/dynamic/public";

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = getSessionId(cookies);
	const timezone = env.PUBLIC_TIMEZONE || "UTC";
	const discordUrl = env.PUBLIC_DISCORD_URL || null;

	if (!sessionId) {
		const [services, groups] = await Promise.all([
			api.getPublicServices(),
			api.getGroups(),
		]);
		const serviceIds = services.map((s) => s.id);
		const [checks, uptime] =
			serviceIds.length > 0
				? await Promise.all([
						api.getLatestChecksForServices(serviceIds),
						api.getUptimeForServices(serviceIds),
					])
				: [{}, {}];
		return { user: null, services, checks, groups, uptime, timezone, discordUrl };
	}

	const user = await api.getUserById(sessionId);
	if (!user) {
		clearSession(cookies);
		const [services, groups] = await Promise.all([
			api.getPublicServices(),
			api.getGroups(),
		]);
		const serviceIds = services.map((s) => s.id);
		const [checks, uptime] =
			serviceIds.length > 0
				? await Promise.all([
						api.getLatestChecksForServices(serviceIds),
						api.getUptimeForServices(serviceIds),
					])
				: [{}, {}];
		return { user: null, services, checks, groups, uptime, timezone, discordUrl };
	}

	const [services, groups] = await Promise.all([
		api.getServices(),
		api.getGroups(),
	]);
	const serviceIds = services.map((s) => s.id);
	const [checks, uptime] =
		serviceIds.length > 0
			? await Promise.all([
					api.getLatestChecksForServices(serviceIds),
					api.getUptimeForServices(serviceIds),
				])
			: [{}, {}];

	return { user, services, checks, groups, uptime, timezone, discordUrl };
};

export const actions: Actions = {
	delete: async ({ cookies, request }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) return fail(401, { error: "Unauthorized" });

		const user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			return fail(401, { error: "Unauthorized" });
		}

		const formData = await request.formData();
		const serviceId = formData.get("id")?.toString();

		if (!serviceId) return fail(400, { error: "Service ID required" });

		await api.stopChecker(serviceId);
		await api.deleteService(serviceId);

		return { success: true };
	},

	check: async ({ cookies, request }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) return fail(401, { error: "Unauthorized" });

		const user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			return fail(401, { error: "Unauthorized" });
		}

		const formData = await request.formData();
		const serviceId = formData.get("id")?.toString();

		if (!serviceId) return fail(400, { error: "Service ID required" });

		const check = await api.runCheck(serviceId);
		return { success: true, check };
	},

	edit: async ({ cookies, request }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) return fail(401, { editError: "Unauthorized" });

		const user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			return fail(401, { editError: "Unauthorized" });
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

		if (!serviceId) return fail(400, { editError: "Service ID required" });
		if (!name) return fail(400, { editError: "Name is required", editServiceId: serviceId });
		if (!url) return fail(400, { editError: "URL is required", editServiceId: serviceId });

		try {
			new URL(url);
		} catch {
			return fail(400, { editError: "Invalid URL format", editServiceId: serviceId });
		}

		if (Number.isNaN(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) {
			return fail(400, { editError: "Expected status must be a valid HTTP status code", editServiceId: serviceId });
		}

		if (Number.isNaN(checkInterval) || checkInterval < 10 || checkInterval > 3600) {
			return fail(400, { editError: "Check interval must be between 10 and 3600 seconds", editServiceId: serviceId });
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

	create: async ({ cookies, request }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) return fail(401, { createError: "Unauthorized" });

		const user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			return fail(401, { createError: "Unauthorized" });
		}

		const formData = await request.formData();
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

		if (!name) return fail(400, { createError: "Name is required" });
		if (!url) return fail(400, { createError: "URL is required" });

		try {
			new URL(url);
		} catch {
			return fail(400, { createError: "Invalid URL format" });
		}

		try {
			const service = await api.createService(name, url, user.id, {
				description: description || undefined,
				displayUrl,
				expectedStatus,
				checkInterval,
				enabled,
				isPublic,
				groupName,
			});

			if (enabled) {
				await api.startChecker(service.id);
			}

			return { success: true, created: true };
		} catch (err) {
			console.error("Create service error:", err);
			return fail(500, { createError: err instanceof Error ? err.message : "Failed to create service" });
		}
	},

	updatePositions: async ({ cookies, request }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) return fail(401, { error: "Unauthorized" });

		const user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			return fail(401, { error: "Unauthorized" });
		}

		const formData = await request.formData();
		const positionsJson = formData.get("positions")?.toString();

		if (!positionsJson) return fail(400, { error: "Positions required" });

		try {
			const positions = JSON.parse(positionsJson);
			await api.updateServicePositions(positions);
			return { success: true };
		} catch {
			return fail(400, { error: "Invalid positions data" });
		}
	},

	updateGroupPositions: async ({ cookies, request }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) return fail(401, { error: "Unauthorized" });

		const user = await api.getUserById(sessionId);
		if (!user) {
			clearSession(cookies);
			return fail(401, { error: "Unauthorized" });
		}

		const formData = await request.formData();
		const positionsJson = formData.get("positions")?.toString();

		if (!positionsJson) return fail(400, { error: "Positions required" });

		try {
			const positions = JSON.parse(positionsJson);
			await api.updateGroupPositions(positions);
			return { success: true };
		} catch {
			return fail(400, { error: "Invalid positions data" });
		}
	},
};
