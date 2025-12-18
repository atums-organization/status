import { env } from "$env/dynamic/private";
import type { ApiResponse, RequestOptions } from "../../../types";

const API_URL = env.API_URL || "http://localhost:3001";

export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (options?.sessionId) {
		headers["Cookie"] = `session=${options.sessionId}`;
	}

	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			...headers,
			...options?.headers,
		},
	});

	if (response.status === 204) {
		return undefined as T;
	}

	const body: ApiResponse<T> = await response.json().catch(() => ({
		success: false,
		error: "Failed to parse response",
	}));

	if (!response.ok || !body.success) {
		throw new Error(body.error || `API error: ${response.status}`);
	}

	return body.data as T;
}
