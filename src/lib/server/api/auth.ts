import type { User } from "../../../types";
import { request } from "./client";

export async function login(username: string, password: string): Promise<User> {
	const result = await request<{ user: User }>("/auth/login", {
		method: "POST",
		body: JSON.stringify({ username, password }),
	});
	return result.user;
}

export async function register(
	username: string,
	email: string,
	password: string,
): Promise<User> {
	const result = await request<{ user: User }>("/auth/register", {
		method: "POST",
		body: JSON.stringify({ username, email, password }),
	});
	return result.user;
}

export async function isFirstUser(): Promise<boolean> {
	const result = await request<{ isFirstUser: boolean }>("/auth/first-user");
	return result.isFirstUser;
}

export async function getUserById(id: string, sessionId?: string): Promise<User | null> {
	try {
		const result = await request<{ user: User }>(`/auth/user/${id}`, { sessionId: sessionId || id });
		return result.user;
	} catch {
		return null;
	}
}

export async function changePassword(
	userId: string,
	currentPassword: string,
	newPassword: string,
	sessionId?: string,
): Promise<void> {
	await request(`/auth/user/${userId}/password`, {
		method: "PUT",
		body: JSON.stringify({ currentPassword, newPassword }),
		sessionId: sessionId || userId,
	});
}
