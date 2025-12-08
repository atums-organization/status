import { env } from "$env/dynamic/private";
import type { Group, Service, ServiceCheck, ServiceStats, User } from "../../types";

const API_URL = env.API_URL || "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: "Unknown error" }));
		throw new Error(error.error || `API error: ${response.status}`);
	}

	return response.json();
}

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

export async function getUserById(id: string): Promise<User | null> {
	try {
		const result = await request<{ user: User }>(`/auth/user/${id}`);
		return result.user;
	} catch {
		return null;
	}
}

export async function getServices(): Promise<Service[]> {
	const result = await request<{ services: Service[] }>("/services");
	return result.services;
}

export async function getPublicServices(): Promise<Service[]> {
	const result = await request<{ services: Service[] }>("/services/public");
	return result.services;
}

export async function getServicesByUser(userId: string): Promise<Service[]> {
	const result = await request<{ services: Service[] }>(
		`/services/user/${userId}`,
	);
	return result.services;
}

export async function getServiceById(id: string): Promise<Service | null> {
	try {
		const result = await request<{ service: Service }>(`/services/${id}`);
		return result.service;
	} catch {
		return null;
	}
}

export async function createService(
	name: string,
	url: string,
	createdBy: string,
	options?: {
		description?: string;
		displayUrl?: string | null;
		expectedStatus?: number;
		checkInterval?: number;
		enabled?: boolean;
		isPublic?: boolean;
		groupName?: string | null;
	},
): Promise<Service> {
	const result = await request<{ service: Service }>("/services", {
		method: "POST",
		body: JSON.stringify({ name, url, createdBy, ...options }),
	});
	return result.service;
}

export async function updateService(
	id: string,
	data: {
		name?: string;
		description?: string | null;
		url?: string;
		displayUrl?: string | null;
		expectedStatus?: number;
		checkInterval?: number;
		enabled?: boolean;
		isPublic?: boolean;
		groupName?: string | null;
	},
): Promise<Service> {
	const result = await request<{ service: Service }>(`/services/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
	return result.service;
}

export async function deleteService(id: string): Promise<void> {
	await request(`/services/${id}`, { method: "DELETE" });
}

export async function getChecksForService(
	serviceId: string,
	limit = 10,
): Promise<ServiceCheck[]> {
	const result = await request<{ checks: ServiceCheck[] }>(
		`/checks/service/${serviceId}?limit=${limit}`,
	);
	return result.checks;
}

export async function getLatestCheckForService(
	serviceId: string,
): Promise<ServiceCheck | null> {
	const result = await request<{ check: ServiceCheck | null }>(
		`/checks/service/${serviceId}/latest`,
	);
	return result.check;
}

export async function getStatsForService(
	serviceId: string,
): Promise<ServiceStats> {
	const result = await request<{ stats: ServiceStats }>(
		`/checks/service/${serviceId}/stats`,
	);
	return result.stats;
}

export async function getLatestChecksForServices(
	serviceIds: string[],
): Promise<Record<string, ServiceCheck | null>> {
	const result = await request<{ checks: Record<string, ServiceCheck | null> }>(
		"/checks/batch",
		{
			method: "POST",
			body: JSON.stringify({ serviceIds }),
		},
	);
	return result.checks;
}

export async function getUptimeForServices(
	serviceIds: string[],
): Promise<Record<string, { uptimePercent: number; totalChecks: number }>> {
	const result = await request<{
		stats: Record<string, { uptimePercent: number; totalChecks: number }>;
	}>("/checks/stats/batch", {
		method: "POST",
		body: JSON.stringify({ serviceIds }),
	});
	return result.stats;
}

export async function runCheck(serviceId: string): Promise<ServiceCheck> {
	const result = await request<{ check: ServiceCheck }>(
		`/checks/service/${serviceId}`,
		{ method: "POST" },
	);
	return result.check;
}

export async function startChecker(serviceId: string): Promise<void> {
	await request(`/checker/start/${serviceId}`, { method: "POST" });
}

export async function stopChecker(serviceId: string): Promise<void> {
	await request(`/checker/stop/${serviceId}`, { method: "POST" });
}

export async function updateServicePositions(
	positions: Array<{ id: string; position: number; groupName?: string }>,
): Promise<void> {
	await request("/services/positions", {
		method: "PUT",
		body: JSON.stringify({ positions }),
	});
}

export async function getGroups(): Promise<Group[]> {
	const result = await request<{ groups: Group[] }>("/groups");
	return result.groups;
}

export async function upsertGroup(name: string, position?: number): Promise<Group> {
	const result = await request<{ group: Group }>("/groups", {
		method: "POST",
		body: JSON.stringify({ name, position }),
	});
	return result.group;
}

export async function updateGroupPositions(
	positions: Array<{ name: string; position: number }>,
): Promise<void> {
	await request("/groups/positions", {
		method: "PUT",
		body: JSON.stringify({ positions }),
	});
}
