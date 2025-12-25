import type { Group, MasterGroup } from "../../../types";
import { request } from "./client";

export type { MasterGroup };

export async function getGroups(): Promise<Group[]> {
	const result = await request<{ groups: Group[] }>("/groups");
	return result.groups;
}

export async function getGroupsHierarchy(): Promise<{ masterGroups: MasterGroup[]; groups: Group[] }> {
	return await request<{ masterGroups: MasterGroup[]; groups: Group[] }>("/groups/hierarchy");
}

export async function upsertGroup(
	name: string,
	position?: number,
	parentGroupName?: string | null,
	sessionId?: string,
): Promise<Group> {
	const result = await request<{ group: Group }>("/groups", {
		method: "POST",
		body: JSON.stringify({ name, position, parentGroupName }),
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

export async function deleteGroup(
	name: string,
	sessionId?: string,
): Promise<void> {
	await request("/groups/delete", {
		method: "DELETE",
		body: JSON.stringify({ name }),
		sessionId,
	});
}

export async function updateGroupEmail(
	name: string,
	emailNotifications: boolean,
	sessionId?: string,
): Promise<Group> {
	const result = await request<{ group: Group }>("/groups/email", {
		method: "PUT",
		body: JSON.stringify({ name, emailNotifications }),
		sessionId,
	});
	return result.group;
}
