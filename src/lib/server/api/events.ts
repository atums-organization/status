import type { StatusEvent } from "../../../types";
import { request } from "./client";

export async function getEvents(options?: {
	group?: string;
	status?: string;
	limit?: number;
}): Promise<StatusEvent[]> {
	const params = new URLSearchParams();
	if (options?.group) params.set("group", options.group);
	if (options?.status) params.set("status", options.status);
	if (options?.limit) params.set("limit", options.limit.toString());
	const query = params.toString() ? `?${params.toString()}` : "";
	const result = await request<{ events: StatusEvent[] }>(`/events${query}`);
	return result.events;
}

export async function getActiveEvents(group?: string): Promise<StatusEvent[]> {
	const query = group ? `?group=${encodeURIComponent(group)}` : "";
	const result = await request<{ events: StatusEvent[] }>(`/events/active${query}`);
	return result.events;
}

export async function getEvent(id: string): Promise<StatusEvent | null> {
	try {
		const result = await request<{ event: StatusEvent }>(`/events/${id}`);
		return result.event;
	} catch {
		return null;
	}
}

export async function createEvent(data: {
	title: string;
	description?: string;
	type?: string;
	status?: string;
	groupName?: string | null;
	startedAt?: string;
}, sessionId?: string): Promise<StatusEvent> {
	const result = await request<{ event: StatusEvent }>("/events", {
		method: "POST",
		body: JSON.stringify(data),
		sessionId,
	});
	return result.event;
}

export async function updateEvent(
	id: string,
	data: {
		title?: string;
		description?: string;
		type?: string;
		status?: string;
		groupName?: string | null;
		resolvedAt?: string | null;
	},
	sessionId?: string,
): Promise<void> {
	await request(`/events/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
		sessionId,
	});
}

export async function resolveEvent(id: string, sessionId?: string): Promise<void> {
	await request(`/events/${id}/resolve`, { method: "POST", sessionId });
}

export async function deleteEvent(id: string, sessionId?: string): Promise<void> {
	await request(`/events/${id}`, { method: "DELETE", sessionId });
}
