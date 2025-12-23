import { randomUUIDv7 } from "bun";
import { sql } from "../index";
import type { StatusEvent } from "../types";
import { getAuthContext, requireAdmin } from "../utils/auth";
import { ok, created, noContent, badRequest, forbidden, notFound } from "../utils/response";

function rowToEvent(row: Record<string, unknown>): StatusEvent {
	return {
		id: row.id as string,
		title: row.title as string,
		description: row.description as string | null,
		type: row.type as StatusEvent["type"],
		status: row.status as StatusEvent["status"],
		groupName: row.group_name as string | null,
		startedAt: row.started_at as string,
		resolvedAt: row.resolved_at as string | null,
		createdBy: row.created_by as string | null,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	};
}

export async function list(
	_req: Request,
	url: URL,
	_params?: Record<string, string>,
): Promise<Response> {
	const groupName = url.searchParams.get("group");
	const status = url.searchParams.get("status");
	const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10);

	let rows;
	if (groupName) {
		if (status) {
			rows = await sql`
				SELECT * FROM events
				WHERE (group_name = ${groupName} OR group_name IS NULL)
				AND status = ${status}
				ORDER BY started_at DESC
				LIMIT ${limit}
			`;
		} else {
			rows = await sql`
				SELECT * FROM events
				WHERE (group_name = ${groupName} OR group_name IS NULL)
				ORDER BY started_at DESC
				LIMIT ${limit}
			`;
		}
	} else if (status) {
		rows = await sql`
			SELECT * FROM events
			WHERE status = ${status}
			ORDER BY started_at DESC
			LIMIT ${limit}
		`;
	} else {
		rows = await sql`
			SELECT * FROM events
			ORDER BY started_at DESC
			LIMIT ${limit}
		`;
	}

	return ok({ events: rows.map(rowToEvent) });
}

export async function listActive(
	_req: Request,
	url: URL,
	_params?: Record<string, string>,
): Promise<Response> {
	const groupName = url.searchParams.get("group");

	let rows;
	if (groupName) {
		rows = await sql`
			SELECT * FROM events
			WHERE (group_name = ${groupName} OR group_name IS NULL)
			AND status IN ('ongoing', 'scheduled')
			ORDER BY started_at DESC
		`;
	} else {
		rows = await sql`
			SELECT * FROM events
			WHERE status IN ('ongoing', 'scheduled')
			ORDER BY started_at DESC
		`;
	}

	return ok({ events: rows.map(rowToEvent) });
}

export async function get(
	_req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const eventId = params?.id;
	if (!eventId) {
		return badRequest("Event ID required");
	}

	const rows = await sql`SELECT * FROM events WHERE id = ${eventId}`;
	if (rows.length === 0) {
		return notFound("Event not found");
	}

	return ok({ event: rowToEvent(rows[0]) });
}

export async function create(
	req: Request,
	_url: URL,
	_params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const body = await req.json();
	const { title, description, type, status, groupName, startedAt } = body;

	if (!title) {
		return badRequest("Title required");
	}

	const validTypes = ["incident", "maintenance", "info"];
	const validStatuses = ["ongoing", "scheduled", "resolved"];

	const eventType = validTypes.includes(type) ? type : "incident";
	const eventStatus = validStatuses.includes(status) ? status : "ongoing";

	const id = randomUUIDv7();
	const eventStartedAt = startedAt || new Date().toISOString();

	await sql`
		INSERT INTO events (id, title, description, type, status, group_name, started_at, created_by)
		VALUES (${id}, ${title}, ${description || null}, ${eventType}, ${eventStatus}, ${groupName || null}, ${eventStartedAt}, ${auth.user.id})
	`;

	const rows = await sql`SELECT * FROM events WHERE id = ${id}`;
	return created({ event: rowToEvent(rows[0]) });
}

export async function update(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const eventId = params?.id;
	if (!eventId) {
		return badRequest("Event ID required");
	}

	const existing = await sql`SELECT * FROM events WHERE id = ${eventId}`;
	if (existing.length === 0) {
		return notFound("Event not found");
	}

	const body = await req.json();
	const { title, description, type, status, groupName, resolvedAt } = body;

	const updates: Record<string, unknown> = {};
	if (title !== undefined) updates.title = title;
	if (description !== undefined) updates.description = description;
	if (type !== undefined) updates.type = type;
	if (status !== undefined) updates.status = status;
	if (groupName !== undefined) updates.group_name = groupName;
	if (resolvedAt !== undefined) updates.resolved_at = resolvedAt;

	if (Object.keys(updates).length === 0) {
		return badRequest("No fields to update");
	}

	await sql`
		UPDATE events
		SET ${sql(updates)}, updated_at = NOW()
		WHERE id = ${eventId}
	`;

	const rows = await sql`SELECT * FROM events WHERE id = ${eventId}`;
	return ok({ event: rowToEvent(rows[0]) });
}

export async function resolve(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const eventId = params?.id;
	if (!eventId) {
		return badRequest("Event ID required");
	}

	const existing = await sql`SELECT id FROM events WHERE id = ${eventId}`;
	if (existing.length === 0) {
		return notFound("Event not found");
	}

	await sql`
		UPDATE events
		SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
		WHERE id = ${eventId}
	`;

	const rows = await sql`SELECT * FROM events WHERE id = ${eventId}`;
	return ok({ event: rowToEvent(rows[0]) });
}

export async function remove(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const eventId = params?.id;
	if (!eventId) {
		return badRequest("Event ID required");
	}

	const existing = await sql`SELECT id FROM events WHERE id = ${eventId}`;
	if (existing.length === 0) {
		return notFound("Event not found");
	}

	await sql`DELETE FROM events WHERE id = ${eventId}`;

	return noContent();
}
