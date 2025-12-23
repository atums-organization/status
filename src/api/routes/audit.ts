import { randomUUIDv7 } from "bun";
import { sql } from "../index";
import type { AuditLog } from "../types";
import { getAuthContext, requireAdmin, requireAuth } from "../utils/auth";
import { ok, created, badRequest, unauthorized, forbidden } from "../utils/response";

function rowToAuditLog(row: Record<string, unknown>): AuditLog {
	let details = row.details;
	if (typeof details === "string") {
		try {
			details = JSON.parse(details);
		} catch {
			details = null;
		}
	}
	return {
		id: row.id as string,
		userId: row.user_id as string,
		action: row.action as string,
		entityType: row.entity_type as string,
		entityId: row.entity_id as string | null,
		details: details as Record<string, unknown> | null,
		ipAddress: row.ip_address as string | null,
		createdAt: row.created_at as string,
		userName: row.user_name as string | undefined,
		userEmail: row.user_email as string | undefined,
	};
}

export async function list(
	req: Request,
	url: URL,
	_params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAdmin(auth)) {
		return forbidden("Admin access required");
	}

	const limit = Number.parseInt(url.searchParams.get("limit") || "20", 10);
	const offset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
	const action = url.searchParams.get("action");
	const entityType = url.searchParams.get("entityType");
	const userId = url.searchParams.get("userId");
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");

	const conditions: string[] = [];
	const values: unknown[] = [];

	if (action) {
		conditions.push(`a.action = $${values.length + 1}`);
		values.push(action);
	}
	if (entityType) {
		conditions.push(`a.entity_type = $${values.length + 1}`);
		values.push(entityType);
	}
	if (userId) {
		conditions.push(`a.user_id = $${values.length + 1}`);
		values.push(userId);
	}
	if (startDate) {
		conditions.push(`a.created_at >= $${values.length + 1}::timestamp`);
		values.push(startDate + "T00:00:00.000Z");
	}
	if (endDate) {
		conditions.push(`a.created_at <= $${values.length + 1}::timestamp`);
		values.push(endDate + "T23:59:59.999Z");
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	const countResult = await sql.unsafe(
		`SELECT COUNT(*) as total FROM audit_logs a ${whereClause}`,
		values,
	);
	const total = Number.parseInt(countResult[0]?.total || "0", 10);

	const rows = await sql.unsafe(
		`SELECT a.*, u.username as user_name, u.email as user_email
		FROM audit_logs a
		LEFT JOIN users u ON a.user_id = u.id
		${whereClause}
		ORDER BY a.created_at DESC
		LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
		[...values, limit, offset],
	);

	return ok({ logs: rows.map(rowToAuditLog), total, limit, offset });
}

export async function log(
	userId: string,
	action: string,
	entityType: string,
	entityId: string | null = null,
	details: Record<string, unknown> | null = null,
	ipAddress: string | null = null,
): Promise<void> {
	const id = randomUUIDv7();
	await sql`
		INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address)
		VALUES (${id}, ${userId}, ${action}, ${entityType}, ${entityId}, ${details ? JSON.stringify(details) : null}::jsonb, ${ipAddress})
	`;
}

export async function create(
	req: Request,
	_url: URL,
	_params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}

	const body = await req.json();
	const { userId, action, entityType, entityId, details, ipAddress } = body;

	if (!userId || !action || !entityType) {
		return badRequest("userId, action, and entityType are required");
	}

	if (userId !== auth.user.id && !auth.isAdmin) {
		return forbidden("Cannot create audit logs for other users");
	}

	await log(userId, action, entityType, entityId || null, details || null, ipAddress || null);
	return created({ message: "Audit log created" });
}
