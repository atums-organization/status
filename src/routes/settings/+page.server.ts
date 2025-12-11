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
	if (user.role === "admin") {
		try {
			invites = await api.getInvites(user.id);
		} catch {
			invites = [];
		}
	}

	return { user, invites };
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
};
