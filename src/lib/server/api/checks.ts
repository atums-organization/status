import type { ServiceCheck, ServiceStats } from "../../../types";
import { request } from "./client";

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

export async function runCheck(serviceId: string, sessionId?: string): Promise<ServiceCheck> {
	const result = await request<{ check: ServiceCheck }>(
		`/checks/service/${serviceId}`,
		{ method: "POST", sessionId },
	);
	return result.check;
}

export async function startChecker(serviceId: string, sessionId?: string): Promise<void> {
	await request(`/checker/start/${serviceId}`, { method: "POST", sessionId });
}

export async function stopChecker(serviceId: string, sessionId?: string): Promise<void> {
	await request(`/checker/stop/${serviceId}`, { method: "POST", sessionId });
}
