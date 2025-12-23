import { CryptoHasher, randomUUIDv7 } from "bun";
import { sql } from "../index";
import { getAuthContext, requireAuth } from "../utils/auth";
import { ok, created, badRequest, unauthorized, forbidden, notFound, conflict } from "../utils/response";

function hashPassword(password: string): string {
	return new CryptoHasher("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
	return hashPassword(password) === hash;
}

export async function login(req: Request): Promise<Response> {
	const body = await req.json();
	const { username, password } = body;

	if (!username || !password) {
		return badRequest("Username and password required");
	}

	const rows = await sql`
		SELECT id, username, email, password_hash, role, access_ids
		FROM users
		WHERE username = ${username}
	`;

	if (rows.length === 0) {
		return unauthorized("Invalid credentials");
	}

	const row = rows[0];
	const valid = verifyPassword(password, row.password_hash as string);

	if (!valid) {
		return unauthorized("Invalid credentials");
	}

	return ok({
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
		return badRequest("Username, email, and password required");
	}

	if (password.length < 8) {
		return badRequest("Password must be at least 8 characters");
	}

	const countResult = await sql`SELECT COUNT(*) as count FROM users`;
	const count = Number(countResult[0]?.count ?? 0);
	const assignedRole = count === 0 ? "admin" : role;

	const existing = await sql`
		SELECT id FROM users WHERE username = ${username} OR email = ${email}
	`;

	if (existing.length > 0) {
		return conflict("Username or email already exists");
	}

	const id = randomUUIDv7();
	const passwordHash = hashPassword(password);

	await sql`
		INSERT INTO users (id, username, email, password_hash, role)
		VALUES (${id}, ${username}, ${email}, ${passwordHash}, ${assignedRole})
	`;

	return created({
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
	return ok({ isFirstUser: count === 0 });
}

export async function getUser(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}

	const id = params?.id;
	if (!id) {
		return badRequest("User ID required");
	}

	if (auth.user.id !== id && !auth.isAdmin) {
		return forbidden("Cannot access other users");
	}

	const rows = await sql`
		SELECT id, username, email, role, access_ids
		FROM users
		WHERE id = ${id}
	`;

	if (rows.length === 0) {
		return notFound("User not found");
	}

	const row = rows[0];
	return ok({
		user: {
			id: row.id,
			username: row.username,
			email: row.email,
			role: row.role,
			accessIds: row.access_ids || [],
		},
	});
}

export async function changePassword(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}

	const id = params?.id;
	if (!id) {
		return badRequest("User ID required");
	}

	if (auth.user.id !== id) {
		return forbidden("Cannot change other users' passwords");
	}

	const body = await req.json();
	const { currentPassword, newPassword } = body;

	if (!currentPassword || !newPassword) {
		return badRequest("Current and new password required");
	}

	if (newPassword.length < 8) {
		return badRequest("New password must be at least 8 characters");
	}

	const rows = await sql`
		SELECT password_hash FROM users WHERE id = ${id}
	`;

	if (rows.length === 0) {
		return notFound("User not found");
	}

	const valid = verifyPassword(currentPassword, rows[0].password_hash as string);
	if (!valid) {
		return unauthorized("Current password is incorrect");
	}

	const newHash = hashPassword(newPassword);
	await sql`
		UPDATE users SET password_hash = ${newHash} WHERE id = ${id}
	`;

	return ok({ message: "Password updated" });
}
