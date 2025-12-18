import { sql } from "../index";
import type { AuthContext, User } from "../../types";

export type { AuthContext };

const SESSION_COOKIE = "session";

function parseCookies(cookieHeader: string | null): Record<string, string> {
	if (!cookieHeader) return {};
	return Object.fromEntries(
		cookieHeader.split(";").map((cookie) => {
			const [key, ...rest] = cookie.trim().split("=");
			return [key, rest.join("=")];
		}),
	);
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
	const cookies = parseCookies(req.headers.get("cookie"));
	const sessionId = cookies[SESSION_COOKIE];

	if (!sessionId) {
		return { user: null, isAuthenticated: false, isAdmin: false };
	}

	const rows = await sql`
		SELECT id, username, email, role, access_ids
		FROM users
		WHERE id = ${sessionId}
	`;

	if (rows.length === 0) {
		return { user: null, isAuthenticated: false, isAdmin: false };
	}

	const row = rows[0];
	const user: User = {
		id: row.id as string,
		username: row.username as string,
		email: row.email as string,
		role: row.role as string,
		accessIds: (row.access_ids as string[]) || [],
	};

	return {
		user,
		isAuthenticated: true,
		isAdmin: user.role === "admin",
	};
}

export function requireAuth(auth: AuthContext): auth is AuthContext & { user: User } {
	return auth.isAuthenticated && auth.user !== null;
}

export function requireAdmin(auth: AuthContext): auth is AuthContext & { user: User } {
	return auth.isAuthenticated && auth.isAdmin && auth.user !== null;
}
