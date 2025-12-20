import { request } from "./client";
import type { ExportData } from "../../../types";

export async function exportGlobal(sessionId: string): Promise<ExportData> {
	return request<ExportData>("/export/global", { sessionId });
}

export async function exportGroup(
	groupName: string,
	sessionId: string,
): Promise<ExportData> {
	return request<ExportData>(`/export/group/${encodeURIComponent(groupName)}`, {
		sessionId,
	});
}

export async function exportService(
	serviceId: string,
	sessionId: string,
): Promise<ExportData> {
	return request<ExportData>(`/export/service/${serviceId}`, { sessionId });
}

export async function importData(
	data: ExportData,
	sessionId: string,
): Promise<{
	message: string;
	stats: {
		groupsCreated: number;
		groupsSkipped: number;
		servicesCreated: number;
		servicesSkipped: number;
	};
}> {
	return request("/import", {
		method: "POST",
		body: JSON.stringify(data),
		sessionId,
	});
}
