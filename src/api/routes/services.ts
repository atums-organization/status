import { sql } from "../index";
import type { Service } from "../types";

function rowToService(row: Record<string, unknown>): Service {
	return {
		id: row.id as string,
		name: row.name as string,
		description: row.description as string | null,
		url: row.url as string,
		expectedStatus: row.expected_status as number,
		checkInterval: row.check_interval as number,
		enabled: row.enabled as boolean,
		isPublic: row.is_public as boolean,
		groupName: row.group_name as string | null,
		createdBy: row.created_by as string,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	};
}

export async function list(): Promise<Response> {
	const rows = await sql`
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
		FROM services
		ORDER BY group_name NULLS LAST, name ASC
	`;

	return Response.json({ services: rows.map(rowToService) });
}

export async function listPublic(): Promise<Response> {
	const rows = await sql`
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
		FROM services
		WHERE is_public = true AND enabled = true
		ORDER BY group_name NULLS LAST, name ASC
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
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
		FROM services
		WHERE created_by = ${userId}
		ORDER BY group_name NULLS LAST, name ASC
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
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
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
		expectedStatus = 200,
		checkInterval = 60,
		enabled = true,
		isPublic = false,
		groupName = null,
	} = body;

	if (!name || !url || !createdBy) {
		return Response.json(
			{ error: "Name, URL, and createdBy required" },
			{ status: 400 },
		);
	}

	const id = crypto.randomUUID();

	await sql`
		INSERT INTO services (id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by)
		VALUES (${id}, ${name}, ${description || null}, ${url}, ${expectedStatus}, ${checkInterval}, ${enabled}, ${isPublic}, ${groupName || null}, ${createdBy})
	`;

	const rows = await sql`
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
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
		expectedStatus,
		checkInterval,
		enabled,
		isPublic,
		groupName,
	} = body;

	const updates: Record<string, unknown> = {};
	if (name !== undefined) updates.name = name;
	if (description !== undefined) updates.description = description;
	if (serviceUrl !== undefined) updates.url = serviceUrl;
	if (expectedStatus !== undefined) updates.expected_status = expectedStatus;
	if (checkInterval !== undefined) updates.check_interval = checkInterval;
	if (enabled !== undefined) updates.enabled = enabled;
	if (isPublic !== undefined) updates.is_public = isPublic;
	if (groupName !== undefined) updates.group_name = groupName;

	if (Object.keys(updates).length === 0) {
		return Response.json({ error: "No fields to update" }, { status: 400 });
	}

	await sql`
		UPDATE services
		SET ${sql(updates)}, updated_at = NOW()
		WHERE id = ${id}
	`;

	const rows = await sql`
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
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
