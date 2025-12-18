import { getSettings } from "../routes/settings";
import { getWebhooksForGroup } from "../routes/webhooks";
import type { Webhook } from "../../types";

interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

interface DiscordEmbed {
	title?: string;
	description?: string;
	color?: number;
	fields?: EmbedField[];
	timestamp?: string;
	footer?: { text: string };
}

interface DiscordPayload {
	content?: string;
	username?: string;
	avatar_url?: string;
	embeds?: DiscordEmbed[];
}

interface GenericWebhookPayload {
	event: string;
	service: {
		name: string;
		url: string;
		group?: string | null;
	};
	status: "up" | "down" | "degraded";
	statusCode?: number | null;
	responseTime?: number;
	errorMessage?: string | null;
	timestamp: string;
}

const Colors = {
	success: 0x22c55e,
	error: 0xef4444,
	warning: 0xeab308,
	info: 0x3b82f6,
};

async function sendToWebhook(webhook: Webhook, discordPayload: DiscordPayload, genericPayload: GenericWebhookPayload): Promise<boolean> {
	try {
		const payload = webhook.type === "discord" ? discordPayload : genericPayload;

		const response = await fetch(webhook.url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.error(`Webhook ${webhook.name} returned ${response.status}: ${await response.text()}`);
		}
		return response.ok;
	} catch (error) {
		console.error(`Failed to send webhook to ${webhook.name}:`, error);
		return false;
	}
}

function formatMessage(template: string, serviceName: string): string {
	return template.replace(/\{service\}/g, serviceName);
}

export async function sendServiceDown(
	serviceName: string,
	serviceUrl: string,
	groupName: string | null,
	statusCode: number | null,
	errorMessage: string | null,
): Promise<void> {
	const settings = await getSettings();
	const siteUrl = settings.siteUrl;
	const webhooks = await getWebhooksForGroup(groupName);

	console.log(`[Webhook] Sending DOWN notification for "${serviceName}" to ${webhooks.length} webhook(s)`);

	await Promise.all(
		webhooks.map((webhook) => {
			const message = formatMessage(webhook.messageDown, serviceName);

			const discordPayload: DiscordPayload = {
				...(webhook.avatarUrl && { avatar_url: webhook.avatarUrl }),
				embeds: [
					{
						title: message,
						description: serviceUrl,
						color: Colors.error,
						fields: [
							...(statusCode
								? [{ name: "status code", value: String(statusCode), inline: true }]
								: []),
							...(errorMessage
								? [{ name: "error", value: errorMessage, inline: false }]
								: []),
						],
						timestamp: new Date().toISOString(),
						footer: { text: siteUrl || "status monitor" },
					},
				],
			};

			const genericPayload: GenericWebhookPayload = {
				event: "service.down",
				service: { name: serviceName, url: serviceUrl, group: groupName },
				status: "down",
				statusCode,
				errorMessage,
				timestamp: new Date().toISOString(),
			};

			return sendToWebhook(webhook, discordPayload, genericPayload);
		}),
	);
}

export async function sendServiceUp(
	serviceName: string,
	serviceUrl: string,
	groupName: string | null,
	responseTime: number,
): Promise<void> {
	const settings = await getSettings();
	const siteUrl = settings.siteUrl;
	const webhooks = await getWebhooksForGroup(groupName);

	console.log(`[Webhook] Sending UP notification for "${serviceName}" to ${webhooks.length} webhook(s)`);

	await Promise.all(
		webhooks.map((webhook) => {
			const message = formatMessage(webhook.messageUp, serviceName);

			const discordPayload: DiscordPayload = {
				...(webhook.avatarUrl && { avatar_url: webhook.avatarUrl }),
				embeds: [
					{
						title: message,
						description: serviceUrl,
						color: Colors.success,
						fields: [
							{ name: "response time", value: `${responseTime}ms`, inline: true },
						],
						timestamp: new Date().toISOString(),
						footer: { text: siteUrl || "status monitor" },
					},
				],
			};

			const genericPayload: GenericWebhookPayload = {
				event: "service.up",
				service: { name: serviceName, url: serviceUrl, group: groupName },
				status: "up",
				responseTime,
				timestamp: new Date().toISOString(),
			};

			return sendToWebhook(webhook, discordPayload, genericPayload);
		}),
	);
}
