import { sql } from "../index";
import type { Webhook, WebhookType } from "../../types";
import { getAuthContext, requireAuth, requireAdmin } from "../utils/auth";
import { ok, badRequest, unauthorized, forbidden, notFound } from "../utils/response";

function rowToWebhook(row: Record<string, unknown>): Webhook {
	return {
		id: row.id as string,
		name: row.name as string,
		url: row.url as string,
		type: row.type as WebhookType,
		groupName: row.group_name as string | null,
		enabled: row.enabled as boolean,
		messageDown: row.message_down as string,
		messageUp: row.message_up as string,
		avatarUrl: row.avatar_url as string | null,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	};
}

export async function list(req: Request): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const rows = await sql`
		SELECT id, name, url, type, group_name, enabled, message_down, message_up, avatar_url, created_at, updated_at
		FROM webhooks
		ORDER BY group_name NULLS FIRST, name
	`;

	return ok({ webhooks: rows.map(rowToWebhook) });
}

export async function create(req: Request): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const body = await req.json();
	const { name, url, type, groupName, messageDown, messageUp, avatarUrl } = body;

	if (!name || typeof name !== "string") {
		return badRequest("Name is required");
	}
	if (!url || typeof url !== "string") {
		return badRequest("URL is required");
	}
	if (!type || !["discord", "webhook"].includes(type)) {
		return badRequest("Type must be 'discord' or 'webhook'");
	}

	const id = crypto.randomUUID();
	const group = groupName || null;
	const msgDown = messageDown || "{service} is down";
	const msgUp = messageUp || "{service} is back up";
	const avatar = type === "discord" && avatarUrl ? avatarUrl : null;

	await sql`
		INSERT INTO webhooks (id, name, url, type, group_name, message_down, message_up, avatar_url)
		VALUES (${id}, ${name}, ${url}, ${type}, ${group}, ${msgDown}, ${msgUp}, ${avatar})
	`;

	const rows = await sql`
		SELECT id, name, url, type, group_name, enabled, message_down, message_up, avatar_url, created_at, updated_at
		FROM webhooks WHERE id = ${id}
	`;

	return ok({ webhook: rowToWebhook(rows[0]) });
}

export async function update(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const webhookId = params?.id;
	if (!webhookId) {
		return badRequest("Webhook ID required");
	}

	const existing = await sql`SELECT id FROM webhooks WHERE id = ${webhookId}`;
	if (existing.length === 0) {
		return notFound("Webhook not found");
	}

	const body = await req.json();
	const { name, url, type, groupName, enabled, messageDown, messageUp, avatarUrl } = body;

	const updates: string[] = [];
	const values: unknown[] = [];

	if (typeof name === "string") {
		updates.push("name");
		values.push(name);
	}
	if (typeof url === "string") {
		updates.push("url");
		values.push(url);
	}
	if (type && ["discord", "webhook"].includes(type)) {
		updates.push("type");
		values.push(type);
	}
	if (groupName !== undefined) {
		updates.push("group_name");
		values.push(groupName || null);
	}
	if (typeof enabled === "boolean") {
		updates.push("enabled");
		values.push(enabled);
	}
	if (typeof messageDown === "string") {
		updates.push("message_down");
		values.push(messageDown);
	}
	if (typeof messageUp === "string") {
		updates.push("message_up");
		values.push(messageUp);
	}
	if (avatarUrl !== undefined) {
		updates.push("avatar_url");
		values.push(avatarUrl || null);
	}

	if (updates.length === 0) {
		return badRequest("No valid fields to update");
	}

	if (updates.includes("name")) {
		await sql`UPDATE webhooks SET name = ${values[updates.indexOf("name")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}
	if (updates.includes("url")) {
		await sql`UPDATE webhooks SET url = ${values[updates.indexOf("url")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}
	if (updates.includes("type")) {
		await sql`UPDATE webhooks SET type = ${values[updates.indexOf("type")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}
	if (updates.includes("group_name")) {
		await sql`UPDATE webhooks SET group_name = ${values[updates.indexOf("group_name")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}
	if (updates.includes("enabled")) {
		await sql`UPDATE webhooks SET enabled = ${values[updates.indexOf("enabled")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}
	if (updates.includes("message_down")) {
		await sql`UPDATE webhooks SET message_down = ${values[updates.indexOf("message_down")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}
	if (updates.includes("message_up")) {
		await sql`UPDATE webhooks SET message_up = ${values[updates.indexOf("message_up")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}
	if (updates.includes("avatar_url")) {
		await sql`UPDATE webhooks SET avatar_url = ${values[updates.indexOf("avatar_url")]}, updated_at = NOW() WHERE id = ${webhookId}`;
	}

	const rows = await sql`
		SELECT id, name, url, type, group_name, enabled, message_down, message_up, avatar_url, created_at, updated_at
		FROM webhooks WHERE id = ${webhookId}
	`;

	return ok({ webhook: rowToWebhook(rows[0]) });
}

export async function remove(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const webhookId = params?.id;
	if (!webhookId) {
		return badRequest("Webhook ID required");
	}

	const existing = await sql`SELECT id FROM webhooks WHERE id = ${webhookId}`;
	if (existing.length === 0) {
		return notFound("Webhook not found");
	}

	await sql`DELETE FROM webhooks WHERE id = ${webhookId}`;

	return ok({ deleted: true });
}

export async function getWebhooksForGroup(groupName: string | null): Promise<Webhook[]> {
	if (groupName) {
		const groupWebhooks = await sql`
			SELECT id, name, url, type, group_name, enabled, message_down, message_up, avatar_url, created_at, updated_at
			FROM webhooks
			WHERE group_name = ${groupName} AND enabled = true
		`;
		if (groupWebhooks.length > 0) {
			return groupWebhooks.map(rowToWebhook);
		}
	}

	const globalWebhooks = await sql`
		SELECT id, name, url, type, group_name, enabled, message_down, message_up, avatar_url, created_at, updated_at
		FROM webhooks
		WHERE group_name IS NULL AND enabled = true
	`;
	return globalWebhooks.map(rowToWebhook);
}
