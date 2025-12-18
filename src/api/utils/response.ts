import type { ApiResponse } from "../../types";

export type { ApiResponse };

export function ok<T>(data: T, meta?: ApiResponse["meta"]): Response {
	const body: ApiResponse<T> = { success: true, data };
	if (meta) body.meta = meta;
	return Response.json(body, { status: 200 });
}

export function created<T>(data: T): Response {
	return Response.json({ success: true, data } as ApiResponse<T>, { status: 201 });
}

export function noContent(): Response {
	return new Response(null, { status: 204 });
}

export function badRequest(error: string): Response {
	return Response.json({ success: false, error } as ApiResponse, { status: 400 });
}

export function unauthorized(error = "Authentication required"): Response {
	return Response.json({ success: false, error } as ApiResponse, { status: 401 });
}

export function forbidden(error = "Access denied"): Response {
	return Response.json({ success: false, error } as ApiResponse, { status: 403 });
}

export function notFound(error = "Resource not found"): Response {
	return Response.json({ success: false, error } as ApiResponse, { status: 404 });
}

export function conflict(error: string): Response {
	return Response.json({ success: false, error } as ApiResponse, { status: 409 });
}

export function serverError(error = "Internal server error"): Response {
	return Response.json({ success: false, error } as ApiResponse, { status: 500 });
}
