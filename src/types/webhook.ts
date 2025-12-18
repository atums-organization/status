export type WebhookType = "discord" | "webhook";

export interface Webhook {
	id: string;
	name: string;
	url: string;
	type: WebhookType;
	groupName: string | null;
	enabled: boolean;
	messageDown: string;
	messageUp: string;
	avatarUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateWebhookData {
	name: string;
	url: string;
	type: WebhookType;
	groupName?: string | null;
	messageDown?: string;
	messageUp?: string;
	avatarUrl?: string | null;
}

export type UpdateWebhookData = Partial<{
	name: string;
	url: string;
	type: WebhookType;
	groupName: string | null;
	enabled: boolean;
	messageDown: string;
	messageUp: string;
	avatarUrl: string | null;
}>;
