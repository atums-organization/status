import { redirect } from "@sveltejs/kit";
import { clearSession } from "$lib/server";
import type { Actions } from "./$types";

export const actions: Actions = {
	default: async ({ cookies }) => {
		clearSession(cookies);
		redirect(302, "/");
	},
};
