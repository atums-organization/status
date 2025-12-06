import { sql } from "../index";

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	const passwordHash = await hashPassword(password);
	return passwordHash === hash;
}

export async function login(req: Request): Promise<Response> {
	const body = await req.json();
	const { username, password } = body;

	if (!username || !password) {
		return Response.json(
			{ error: "Username and password required" },
			{ status: 400 },
		);
	}

	const rows = await sql`
		SELECT id, username, email, password_hash, role, access_ids
		FROM users
		WHERE username = ${username}
	`;

	if (rows.length === 0) {
		return Response.json({ error: "Invalid credentials" }, { status: 401 });
	}

	const row = rows[0];
	const valid = await verifyPassword(password, row.password_hash);

	if (!valid) {
		return Response.json({ error: "Invalid credentials" }, { status: 401 });
	}

	return Response.json({
		user: {
			id: row.id,
			username: row.username,
			email: row.email,
			role: row.role,
			accessIds: row.access_ids || [],
		},
	});
}

export async function register(req: Request): Promise<Response> {
	const body = await req.json();
	const { username, email, password, role = "viewer" } = body;

	if (!username || !email || !password) {
		return Response.json(
			{ error: "Username, email, and password required" },
			{ status: 400 },
		);
	}

	const countResult = await sql`SELECT COUNT(*) as count FROM users`;
	const count = Number(countResult[0]?.count ?? 0);
	const assignedRole = count === 0 ? "admin" : role;

	const existing = await sql`
		SELECT id FROM users WHERE username = ${username} OR email = ${email}
	`;

	if (existing.length > 0) {
		return Response.json(
			{ error: "Username or email already exists" },
			{ status: 409 },
		);
	}

	const id = crypto.randomUUID();
	const passwordHash = await hashPassword(password);

	await sql`
		INSERT INTO users (id, username, email, password_hash, role)
		VALUES (${id}, ${username}, ${email}, ${passwordHash}, ${assignedRole})
	`;

	return Response.json({
		user: {
			id,
			username,
			email,
			role: assignedRole,
			accessIds: [],
		},
	});
}

export async function isFirstUser(): Promise<Response> {
	const countResult = await sql`SELECT COUNT(*) as count FROM users`;
	const count = Number(countResult[0]?.count ?? 0);
	return Response.json({ isFirstUser: count === 0 });
}

export async function getUser(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const id = params?.id;
	if (!id) {
		return Response.json({ error: "User ID required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT id, username, email, role, access_ids
		FROM users
		WHERE id = ${id}
	`;

	if (rows.length === 0) {
		return Response.json({ error: "User not found" }, { status: 404 });
	}

	const row = rows[0];
	return Response.json({
		user: {
			id: row.id,
			username: row.username,
			email: row.email,
			role: row.role,
			accessIds: row.access_ids || [],
		},
	});
}
