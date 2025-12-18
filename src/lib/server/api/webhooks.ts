import { request } from "./client";
import type { Webhook, CreateWebhookData, UpdateWebhookData } from "../../../types";

export async function getWebhooks(sessionId: string): Promise<Webhook[]> {
	const result = await request<{ webhooks: Webhook[] }>("/webhooks", { sessionId });
	return result.webhooks;
}

export async function createWebhook(
	data: CreateWebhookData,
	sessionId: string,
): Promise<Webhook> {
	const result = await request<{ webhook: Webhook }>("/webhooks", {
		method: "POST",
		body: JSON.stringify(data),
		sessionId,
	});
	return result.webhook;
}

export async function updateWebhook(
	id: string,
	data: UpdateWebhookData,
	sessionId: string,
): Promise<Webhook> {
	const result = await request<{ webhook: Webhook }>(`/webhooks/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
		sessionId,
	});
	return result.webhook;
}

export async function deleteWebhook(id: string, sessionId: string): Promise<void> {
	await request(`/webhooks/${id}`, {
		method: "DELETE",
		sessionId,
	});
}
