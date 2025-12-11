import { sql } from "../index";

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

	return Response.json({
		events: rows.map((row: Record<string, unknown>) => ({
			id: row.id,
			title: row.title,
			description: row.description,
			type: row.type,
			status: row.status,
			groupName: row.group_name,
			startedAt: row.started_at,
			resolvedAt: row.resolved_at,
			createdBy: row.created_by,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		})),
	});
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

	return Response.json({
		events: rows.map((row: Record<string, unknown>) => ({
			id: row.id,
			title: row.title,
			description: row.description,
			type: row.type,
			status: row.status,
			groupName: row.group_name,
			startedAt: row.started_at,
			resolvedAt: row.resolved_at,
			createdBy: row.created_by,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		})),
	});
}

export async function get(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const eventId = params?.id;
	if (!eventId) {
		return Response.json({ error: "Event ID required" }, { status: 400 });
	}

	const rows = await sql`SELECT * FROM events WHERE id = ${eventId}`;
	if (rows.length === 0) {
		return Response.json({ error: "Event not found" }, { status: 404 });
	}

	const row = rows[0];
	return Response.json({
		event: {
			id: row.id,
			title: row.title,
			description: row.description,
			type: row.type,
			status: row.status,
			groupName: row.group_name,
			startedAt: row.started_at,
			resolvedAt: row.resolved_at,
			createdBy: row.created_by,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		},
	});
}

export async function create(
	req: Request,
	_url: URL,
	_params?: Record<string, string>,
): Promise<Response> {
	const body = await req.json();
	const { title, description, type, status, groupName, startedAt } = body;

	if (!title) {
		return Response.json({ error: "Title required" }, { status: 400 });
	}

	const id = crypto.randomUUID();
	const eventType = type || "incident";
	const eventStatus = status || "ongoing";
	const eventStartedAt = startedAt || new Date().toISOString();

	await sql`
		INSERT INTO events (id, title, description, type, status, group_name, started_at)
		VALUES (${id}, ${title}, ${description || null}, ${eventType}, ${eventStatus}, ${groupName || null}, ${eventStartedAt})
	`;

	return Response.json({
		event: {
			id,
			title,
			description: description || null,
			type: eventType,
			status: eventStatus,
			groupName: groupName || null,
			startedAt: eventStartedAt,
			resolvedAt: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	});
}

export async function update(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const eventId = params?.id;
	if (!eventId) {
		return Response.json({ error: "Event ID required" }, { status: 400 });
	}

	const body = await req.json();
	const { title, description, type, status, groupName, resolvedAt } = body;

	const existing = await sql`SELECT * FROM events WHERE id = ${eventId}`;
	if (existing.length === 0) {
		return Response.json({ error: "Event not found" }, { status: 404 });
	}

	await sql`
		UPDATE events
		SET
			title = COALESCE(${title || null}, title),
			description = COALESCE(${description}, description),
			type = COALESCE(${type || null}, type),
			status = COALESCE(${status || null}, status),
			group_name = ${groupName === undefined ? existing[0].group_name : groupName},
			resolved_at = ${resolvedAt === undefined ? existing[0].resolved_at : resolvedAt},
			updated_at = NOW()
		WHERE id = ${eventId}
	`;

	return Response.json({ success: true });
}

export async function resolve(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const eventId = params?.id;
	if (!eventId) {
		return Response.json({ error: "Event ID required" }, { status: 400 });
	}

	await sql`
		UPDATE events
		SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
		WHERE id = ${eventId}
	`;

	return Response.json({ success: true });
}

export async function remove(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const eventId = params?.id;
	if (!eventId) {
		return Response.json({ error: "Event ID required" }, { status: 400 });
	}

	await sql`DELETE FROM events WHERE id = ${eventId}`;

	return Response.json({ success: true });
}
