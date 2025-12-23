import type { User } from "./user";
import type { ApiKeyScope } from "./apikey";

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	meta?: {
		total?: number;
		limit?: number;
		offset?: number;
	};
}

export interface AuthContext {
	user: User | null;
	isAuthenticated: boolean;
	isAdmin: boolean;
	apiKeyScopes?: ApiKeyScope[];
	apiKeyId?: string;
}

export type RouteHandler = (
	req: Request,
	url: URL,
	params?: Record<string, string>,
) => Promise<Response>;

export interface Route {
	pattern: RegExp;
	handlers: Partial<Record<string, RouteHandler>>;
}

export interface RequestOptions extends RequestInit {
	sessionId?: string;
}
