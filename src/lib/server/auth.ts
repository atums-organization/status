import type { Cookies } from "@sveltejs/kit";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function getSessionId(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE);
}

export function setSession(cookies: Cookies, userId: string): void {
	cookies.set(SESSION_COOKIE, userId, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: SESSION_MAX_AGE,
	});
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: "/" });
}
