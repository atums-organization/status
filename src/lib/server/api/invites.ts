import type { Invite } from "../../../types";
import { request } from "./client";

export async function getInvites(userId: string, sessionId?: string): Promise<Invite[]> {
	const result = await request<{ invites: Invite[] }>(`/invites/user/${userId}`, { sessionId: sessionId || userId });
	return result.invites;
}

export async function createInvite(
	userId: string,
	expiresInDays?: number,
	sessionId?: string,
): Promise<Invite> {
	const result = await request<{ invite: Invite }>(`/invites/user/${userId}`, {
		method: "POST",
		body: JSON.stringify({ expiresInDays }),
		sessionId: sessionId || userId,
	});
	return result.invite;
}

export async function deleteInvite(inviteId: string, sessionId?: string): Promise<void> {
	await request(`/invites/${inviteId}`, { method: "DELETE", sessionId });
}

export async function validateInvite(
	code: string,
): Promise<{ valid: boolean; inviteId?: string; error?: string }> {
	const result = await request<{ valid: boolean; inviteId?: string; error?: string }>(
		"/invites/validate",
		{
			method: "POST",
			body: JSON.stringify({ code }),
		},
	);
	return result;
}

export async function useInvite(inviteId: string, userId: string): Promise<void> {
	await request(`/invites/${inviteId}/use`, {
		method: "POST",
		body: JSON.stringify({ userId }),
	});
}
