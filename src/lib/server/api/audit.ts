import type { AuditLog } from "../../../types";
import { request } from "./client";

export async function getAuditLogs(options?: {
	limit?: number;
	offset?: number;
	action?: string;
	entityType?: string;
	userId?: string;
	sessionId?: string;
}): Promise<AuditLog[]> {
	const params = new URLSearchParams();
	if (options?.limit) params.set("limit", options.limit.toString());
	if (options?.offset) params.set("offset", options.offset.toString());
	if (options?.action) params.set("action", options.action);
	if (options?.entityType) params.set("entityType", options.entityType);
	if (options?.userId) params.set("userId", options.userId);
	const query = params.toString() ? `?${params.toString()}` : "";
	const result = await request<{ logs: AuditLog[] }>(`/audit${query}`, { sessionId: options?.sessionId });
	return result.logs;
}

export async function auditLog(
	userId: string,
	action: string,
	entityType: string,
	entityId: string | null = null,
	details: Record<string, unknown> | null = null,
	ipAddress: string | null = null,
	sessionId?: string,
): Promise<void> {
	await request("/audit", {
		method: "POST",
		body: JSON.stringify({ userId, action, entityType, entityId, details, ipAddress }),
		sessionId: sessionId || userId,
	});
}
