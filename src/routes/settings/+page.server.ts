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

	let invites: api.Invite[] = [];
	let events: Awaited<ReturnType<typeof api.getEvents>> = [];
	let groups: Awaited<ReturnType<typeof api.getGroups>> = [];

	if (user.role === "admin") {
		[invites, events, groups] = await Promise.all([
			api.getInvites(user.id).catch(() => []),
			api.getEvents({ limit: 20 }).catch(() => []),
			api.getGroups().catch(() => []),
		]);
	}

	return { user, invites, events, groups };
};

export const actions: Actions = {
	password: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			redirect(302, "/login");
		}

		const data = await request.formData();
		const currentPassword = data.get("currentPassword")?.toString();
		const newPassword = data.get("newPassword")?.toString();
		const confirmPassword = data.get("confirmPassword")?.toString();

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: "all fields are required" });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: "passwords do not match" });
		}

		if (newPassword.length < 8) {
			return fail(400, { error: "password must be at least 8 characters" });
		}

		try {
			await api.changePassword(sessionId, currentPassword, newPassword);
			return { success: "password updated" };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : "failed to update password",
			});
		}
	},

	createInvite: async ({ cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			redirect(302, "/login");
		}

		const user = await api.getUserById(sessionId);
		if (!user || user.role !== "admin") {
			return fail(403, { inviteError: "not authorized" });
		}

		try {
			await api.createInvite(user.id);
			return { inviteSuccess: "invite created" };
		} catch (err) {
			return fail(400, {
				inviteError: err instanceof Error ? err.message : "failed to create invite",
			});
		}
	},

	deleteInvite: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			redirect(302, "/login");
		}

		const user = await api.getUserById(sessionId);
		if (!user || user.role !== "admin") {
			return fail(403, { inviteError: "not authorized" });
		}

		const data = await request.formData();
		const inviteId = data.get("inviteId")?.toString();

		if (!inviteId) {
			return fail(400, { inviteError: "invite id required" });
		}

		try {
			await api.deleteInvite(inviteId);
			return { inviteSuccess: "invite deleted" };
		} catch (err) {
			return fail(400, {
				inviteError: err instanceof Error ? err.message : "failed to delete invite",
			});
		}
	},

	logout: async ({ cookies }) => {
		clearSession(cookies);
		redirect(302, "/login");
	},

	createEvent: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			redirect(302, "/login");
		}

		const user = await api.getUserById(sessionId);
		if (!user || user.role !== "admin") {
			return fail(403, { eventError: "not authorized" });
		}

		const data = await request.formData();
		const title = data.get("title")?.toString().trim();
		const description = data.get("description")?.toString().trim() || undefined;
		const type = data.get("type")?.toString() || "incident";
		const status = data.get("status")?.toString() || "ongoing";
		const groupName = data.get("groupName")?.toString() || null;

		if (!title) {
			return fail(400, { eventError: "title is required" });
		}

		try {
			await api.createEvent({
				title,
				description,
				type,
				status,
				groupName: groupName || null,
			});
			return { eventSuccess: "event created" };
		} catch (err) {
			return fail(400, {
				eventError: err instanceof Error ? err.message : "failed to create event",
			});
		}
	},

	resolveEvent: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			redirect(302, "/login");
		}

		const user = await api.getUserById(sessionId);
		if (!user || user.role !== "admin") {
			return fail(403, { eventError: "not authorized" });
		}

		const data = await request.formData();
		const eventId = data.get("eventId")?.toString();

		if (!eventId) {
			return fail(400, { eventError: "event id required" });
		}

		try {
			await api.resolveEvent(eventId);
			return { eventSuccess: "event resolved" };
		} catch (err) {
			return fail(400, {
				eventError: err instanceof Error ? err.message : "failed to resolve event",
			});
		}
	},

	deleteEvent: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			redirect(302, "/login");
		}

		const user = await api.getUserById(sessionId);
		if (!user || user.role !== "admin") {
			return fail(403, { eventError: "not authorized" });
		}

		const data = await request.formData();
		const eventId = data.get("eventId")?.toString();

		if (!eventId) {
			return fail(400, { eventError: "event id required" });
		}

		try {
			await api.deleteEvent(eventId);
			return { eventSuccess: "event deleted" };
		} catch (err) {
			return fail(400, {
				eventError: err instanceof Error ? err.message : "failed to delete event",
			});
		}
	},
};
