import type { Group } from "../../../types";
import { request } from "./client";

export async function getGroups(): Promise<Group[]> {
	const result = await request<{ groups: Group[] }>("/groups");
	return result.groups;
}

export async function upsertGroup(name: string, position?: number, sessionId?: string): Promise<Group> {
	const result = await request<{ group: Group }>("/groups", {
		method: "POST",
		body: JSON.stringify({ name, position }),
		sessionId,
	});
	return result.group;
}

export async function updateGroupPositions(
	positions: Array<{ name: string; position: number }>,
	sessionId?: string,
): Promise<void> {
	await request("/groups/positions", {
		method: "PUT",
		body: JSON.stringify({ positions }),
		sessionId,
	});
}

export async function renameGroup(
	oldName: string,
	newName: string,
	sessionId?: string,
): Promise<void> {
	await request("/groups/rename", {
		method: "PUT",
		body: JSON.stringify({ oldName, newName }),
		sessionId,
	});
}
