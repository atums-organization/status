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

export interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface DiscordEmbed {
	title?: string;
	description?: string;
	color?: number;
	fields?: EmbedField[];
	timestamp?: string;
	footer?: { text: string };
}

export interface DiscordPayload {
	content?: string;
	username?: string;
	avatar_url?: string;
	embeds?: DiscordEmbed[];
}

export interface GenericWebhookPayload {
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
