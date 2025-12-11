import { sql } from "../index";

function generateCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let i = 0; i < 8; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

export async function list(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const userId = params?.id;
	if (!userId) {
		return Response.json({ error: "User ID required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT
			i.id,
			i.code,
			i.created_by,
			i.used_by,
			i.used_at,
			i.expires_at,
			i.created_at,
			u.username as used_by_username
		FROM invites i
		LEFT JOIN users u ON i.used_by = u.id
		WHERE i.created_by = ${userId}
		ORDER BY i.created_at DESC
	`;

	return Response.json({
		invites: rows.map((row: Record<string, unknown>) => ({
			id: row.id,
			code: row.code,
			createdBy: row.created_by,
			usedBy: row.used_by,
			usedByUsername: row.used_by_username,
			usedAt: row.used_at,
			expiresAt: row.expires_at,
			createdAt: row.created_at,
		})),
	});
}

export async function create(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const userId = params?.id;
	if (!userId) {
		return Response.json({ error: "User ID required" }, { status: 400 });
	}

	const body = await req.json().catch(() => ({}));
	const expiresInDays = body.expiresInDays;

	const code = generateCode();
	const id = crypto.randomUUID();

	let expiresAt = null;
	if (expiresInDays && typeof expiresInDays === "number") {
		const date = new Date();
		date.setDate(date.getDate() + expiresInDays);
		expiresAt = date.toISOString();
	}

	await sql`
		INSERT INTO invites (id, code, created_by, expires_at)
		VALUES (${id}, ${code}, ${userId}, ${expiresAt})
	`;

	return Response.json({
		invite: {
			id,
			code,
			createdBy: userId,
			expiresAt,
			createdAt: new Date().toISOString(),
		},
	});
}

export async function remove(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const inviteId = params?.id;
	if (!inviteId) {
		return Response.json({ error: "Invite ID required" }, { status: 400 });
	}

	await sql`DELETE FROM invites WHERE id = ${inviteId}`;

	return Response.json({ success: true });
}

export async function validate(req: Request): Promise<Response> {
	const body = await req.json();
	const { code } = body;

	if (!code) {
		return Response.json({ error: "Invite code required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT id, code, used_by, expires_at
		FROM invites
		WHERE code = ${code.toUpperCase()}
	`;

	if (rows.length === 0) {
		return Response.json({ valid: false, error: "Invalid invite code" });
	}

	const invite = rows[0];

	if (invite.used_by) {
		return Response.json({ valid: false, error: "Invite already used" });
	}

	if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
		return Response.json({ valid: false, error: "Invite expired" });
	}

	return Response.json({ valid: true, inviteId: invite.id });
}

export async function markUsed(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const inviteId = params?.id;
	if (!inviteId) {
		return Response.json({ error: "Invite ID required" }, { status: 400 });
	}

	const body = await req.json();
	const { userId } = body;

	if (!userId) {
		return Response.json({ error: "User ID required" }, { status: 400 });
	}

	await sql`
		UPDATE invites
		SET used_by = ${userId}, used_at = NOW()
		WHERE id = ${inviteId}
	`;

	return Response.json({ success: true });
}
