import { sql } from "../index";
import type { Group, Service } from "../types";

function rowToService(row: Record<string, unknown>): Service {
	return {
		id: row.id as string,
		name: row.name as string,
		description: row.description as string | null,
		url: row.url as string,
		displayUrl: row.display_url as string | null,
		expectedStatus: row.expected_status as number,
		checkInterval: row.check_interval as number,
		enabled: row.enabled as boolean,
		isPublic: row.is_public as boolean,
		groupName: row.group_name as string | null,
		position: (row.position as number) || 0,
		createdBy: row.created_by as string,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	};
}

function rowToGroup(row: Record<string, unknown>): Group {
	return {
		id: row.id as string,
		name: row.name as string,
		position: (row.position as number) || 0,
		createdAt: row.created_at as string,
	};
}

export async function list(): Promise<Response> {
	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		ORDER BY position ASC, created_at ASC
	`;

	return Response.json({ services: rows.map(rowToService) });
}

export async function listPublic(): Promise<Response> {
	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE is_public = true AND enabled = true
		ORDER BY position ASC, created_at ASC
	`;

	return Response.json({ services: rows.map(rowToService) });
}

export async function listByUser(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const userId = params?.id;
	if (!userId) {
		return Response.json({ error: "User ID required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE created_by = ${userId}
		ORDER BY position ASC, created_at ASC
	`;

	return Response.json({ services: rows.map(rowToService) });
}

export async function get(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const id = params?.id;
	if (!id) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE id = ${id}
	`;

	if (rows.length === 0) {
		return Response.json({ error: "Service not found" }, { status: 404 });
	}

	return Response.json({ service: rowToService(rows[0]) });
}

export async function create(req: Request): Promise<Response> {
	const body = await req.json();
	const {
		name,
		url,
		createdBy,
		description,
		displayUrl = null,
		expectedStatus = 200,
		checkInterval = 60,
		enabled = true,
		isPublic = false,
		groupName = null,
		position,
	} = body;

	if (!name || !url || !createdBy) {
		return Response.json(
			{ error: "Name, URL, and createdBy required" },
			{ status: 400 },
		);
	}

	const id = crypto.randomUUID();

	const maxPosResult = await sql`SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM services`;
	const nextPosition = position ?? (maxPosResult[0]?.next_pos || 0);

	await sql`
		INSERT INTO services (id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by)
		VALUES (${id}, ${name}, ${description || null}, ${url}, ${displayUrl || null}, ${expectedStatus}, ${checkInterval}, ${enabled}, ${isPublic}, ${groupName || null}, ${nextPosition}, ${createdBy})
	`;

	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE id = ${id}
	`;

	return Response.json({ service: rowToService(rows[0]) }, { status: 201 });
}

export async function update(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const id = params?.id;
	if (!id) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	const body = await req.json();
	const {
		name,
		description,
		url: serviceUrl,
		displayUrl,
		expectedStatus,
		checkInterval,
		enabled,
		isPublic,
		groupName,
		position,
	} = body;

	const updates: Record<string, unknown> = {};
	if (name !== undefined) updates.name = name;
	if (description !== undefined) updates.description = description;
	if (serviceUrl !== undefined) updates.url = serviceUrl;
	if (displayUrl !== undefined) updates.display_url = displayUrl;
	if (expectedStatus !== undefined) updates.expected_status = expectedStatus;
	if (checkInterval !== undefined) updates.check_interval = checkInterval;
	if (enabled !== undefined) updates.enabled = enabled;
	if (isPublic !== undefined) updates.is_public = isPublic;
	if (groupName !== undefined) updates.group_name = groupName;
	if (position !== undefined) updates.position = position;

	if (Object.keys(updates).length === 0) {
		return Response.json({ error: "No fields to update" }, { status: 400 });
	}

	await sql`
		UPDATE services
		SET ${sql(updates)}, updated_at = NOW()
		WHERE id = ${id}
	`;

	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE id = ${id}
	`;

	if (rows.length === 0) {
		return Response.json({ error: "Service not found" }, { status: 404 });
	}

	return Response.json({ service: rowToService(rows[0]) });
}

export async function remove(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const id = params?.id;
	if (!id) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	await sql`DELETE FROM services WHERE id = ${id}`;

	return Response.json({ success: true });
}

export async function updatePositions(req: Request): Promise<Response> {
	const body = await req.json();
	const { positions } = body;

	if (!Array.isArray(positions)) {
		return Response.json({ error: "Positions array required" }, { status: 400 });
	}

	for (const { id, position, groupName } of positions) {
		if (groupName !== undefined) {
			await sql`UPDATE services SET position = ${position}, group_name = ${groupName}, updated_at = NOW() WHERE id = ${id}`;
		} else {
			await sql`UPDATE services SET position = ${position}, updated_at = NOW() WHERE id = ${id}`;
		}
	}

	return Response.json({ success: true });
}

export async function listGroups(): Promise<Response> {
	const dbGroups = await sql`
		SELECT id, name, position, created_at
		FROM groups
		ORDER BY position ASC, name ASC
	`;

	const serviceGroups = await sql`
		SELECT DISTINCT group_name
		FROM services
		WHERE group_name IS NOT NULL
	`;

	const dbGroupNames = new Set(dbGroups.map((r: Record<string, unknown>) => r.name));
	const allGroups = [...dbGroups.map(rowToGroup)];

	for (const row of serviceGroups) {
		if (!dbGroupNames.has(row.group_name as string)) {
			allGroups.push({
				id: `service-group-${row.group_name}`,
				name: row.group_name as string,
				position: allGroups.length,
				createdAt: new Date().toISOString(),
			});
		}
	}

	return Response.json({ groups: allGroups });
}

export async function upsertGroup(req: Request): Promise<Response> {
	const body = await req.json();
	const { name, position } = body;

	if (!name) {
		return Response.json({ error: "Name required" }, { status: 400 });
	}

	const existing = await sql`SELECT id FROM groups WHERE name = ${name}`;

	if (existing.length > 0) {
		await sql`UPDATE groups SET position = ${position ?? 0} WHERE name = ${name}`;
	} else {
		const id = crypto.randomUUID();
		const maxPosResult = await sql`SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM groups`;
		const nextPosition = position ?? (maxPosResult[0]?.next_pos || 0);
		await sql`INSERT INTO groups (id, name, position) VALUES (${id}, ${name}, ${nextPosition})`;
	}

	const rows = await sql`SELECT id, name, position, created_at FROM groups WHERE name = ${name}`;
	return Response.json({ group: rowToGroup(rows[0]) });
}

export async function updateGroupPositions(req: Request): Promise<Response> {
	const body = await req.json();
	const { positions } = body;

	if (!Array.isArray(positions)) {
		return Response.json({ error: "Positions array required" }, { status: 400 });
	}

	for (const { name, position } of positions) {
		const existing = await sql`SELECT id FROM groups WHERE name = ${name}`;
		if (existing.length > 0) {
			await sql`UPDATE groups SET position = ${position} WHERE name = ${name}`;
		} else {
			const id = crypto.randomUUID();
			await sql`INSERT INTO groups (id, name, position) VALUES (${id}, ${name}, ${position})`;
		}
	}

	return Response.json({ success: true });
}
