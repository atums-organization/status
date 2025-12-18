import { sql } from "../index";

export async function list(
	_req: Request,
	url: URL,
	_params?: Record<string, string>,
): Promise<Response> {
	const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
	const offset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
	const action = url.searchParams.get("action");
	const entityType = url.searchParams.get("entityType");
	const userId = url.searchParams.get("userId");

	let rows;
	if (action && entityType) {
		rows = await sql`
			SELECT a.*, u.username as user_name, u.email as user_email
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			WHERE a.action = ${action} AND a.entity_type = ${entityType}
			ORDER BY a.created_at DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	} else if (action) {
		rows = await sql`
			SELECT a.*, u.username as user_name, u.email as user_email
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			WHERE a.action = ${action}
			ORDER BY a.created_at DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	} else if (entityType) {
		rows = await sql`
			SELECT a.*, u.username as user_name, u.email as user_email
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			WHERE a.entity_type = ${entityType}
			ORDER BY a.created_at DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	} else if (userId) {
		rows = await sql`
			SELECT a.*, u.username as user_name, u.email as user_email
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			WHERE a.user_id = ${userId}
			ORDER BY a.created_at DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	} else {
		rows = await sql`
			SELECT a.*, u.username as user_name, u.email as user_email
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			ORDER BY a.created_at DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	}

	return Response.json({
		logs: rows.map((row: Record<string, unknown>) => {
			let details = row.details;
			if (typeof details === "string") {
				try {
					details = JSON.parse(details);
				} catch {
					details = null;
				}
			}
			return {
				id: row.id,
				userId: row.user_id,
				action: row.action,
				entityType: row.entity_type,
				entityId: row.entity_id,
				details,
				ipAddress: row.ip_address,
				createdAt: row.created_at,
				userName: row.user_name,
				userEmail: row.user_email,
			};
		}),
	});
}

export async function log(
	userId: string,
	action: string,
	entityType: string,
	entityId: string | null = null,
	details: Record<string, unknown> | null = null,
	ipAddress: string | null = null,
): Promise<void> {
	const id = crypto.randomUUID();
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
	const body = await req.json();
	const { userId, action, entityType, entityId, details, ipAddress } = body;

	if (!userId || !action || !entityType) {
		return Response.json({ error: "userId, action, and entityType are required" }, { status: 400 });
	}

	await log(userId, action, entityType, entityId || null, details || null, ipAddress || null);
	return Response.json({ success: true });
}
