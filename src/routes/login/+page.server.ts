import { fail, redirect } from "@sveltejs/kit";
import { getSessionId, setSession } from "$lib/server";
import * as api from "$lib/server/api";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (getSessionId(cookies)) {
		redirect(302, "/");
	}

	const isFirstUser = await api.isFirstUser();
	const pageParam = url.searchParams.get("page");
	const page: "login" | "register" = isFirstUser
		? "register"
		: pageParam === "register"
			? "register"
			: "login";

	return { page, isFirstUser };
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get("username")?.toString().trim();
		const password = data.get("password")?.toString();

		if (!username || !password) {
			return fail(400, {
				error: "Username and password are required",
				page: "login",
			});
		}

		try {
			const user = await api.login(username, password);
			setSession(cookies, user.id);
			redirect(302, "/");
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : "Invalid credentials",
				page: "login",
			});
		}
	},

	register: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get("username")?.toString().trim();
		const email = data.get("email")?.toString().trim();
		const password = data.get("password")?.toString();
		const confirmPassword = data.get("confirmPassword")?.toString();
		const inviteCode = data.get("inviteCode")?.toString().trim().toUpperCase() || undefined;

		if (!username || !email || !password || !confirmPassword) {
			return fail(400, { error: "All fields are required", page: "register" });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: "Passwords do not match", page: "register" });
		}

		if (password.length < 8) {
			return fail(400, {
				error: "Password must be at least 8 characters",
				page: "register",
			});
		}

		try {
			const user = await api.register(username, email, password, inviteCode);
			setSession(cookies, user.id);
			redirect(302, "/");
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : "Registration failed",
				page: "register",
			});
		}
	},
};
