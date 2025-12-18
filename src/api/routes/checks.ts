import { sql } from "../index";
import type { Service, ServiceCheck } from "../types";
import { getAuthContext, requireAuth } from "../utils/auth";
import { ok, badRequest, unauthorized, forbidden, notFound } from "../utils/response";
import { sendServiceDown, sendServiceUp } from "../utils/discord";

function rowToCheck(row: Record<string, unknown>): ServiceCheck {
	return {
		id: row.id as string,
		serviceId: row.service_id as string,
		statusCode: row.status_code as number | null,
		responseTime: row.response_time as number,
		success: row.success as boolean,
		errorMessage: row.error_message as string | null,
		checkedAt: row.checked_at as string,
	};
}

function rowToService(row: Record<string, unknown>): Service {
	return {
		id: row.id as string,
		name: row.name as string,
		description: row.description as string | null,
		url: row.url as string,
		displayUrl: row.display_url as string | null,
		expectedStatus: row.expected_status as number,
		checkInterval: row.check_interval as number,
		enabled: row.enabled as boolean,
		isPublic: row.is_public as boolean,
		groupName: row.group_name as string | null,
		position: (row.position as number) || 0,
		createdBy: row.created_by as string,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	};
}

const checkIntervals = new Map<string, ReturnType<typeof setInterval>>();
const lastCheckStatus = new Map<string, boolean>();

async function performCheck(service: Service): Promise<ServiceCheck> {
	const id = crypto.randomUUID();
	const startTime = performance.now();

	let statusCode: number | null = null;
	let success = false;
	let errorMessage: string | null = null;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000);

		const response = await fetch(service.url, {
			method: "GET",
			signal: controller.signal,
			headers: { "User-Agent": "atums-status/1.0" },
		});

		clearTimeout(timeout);
		statusCode = response.status;
		success = statusCode === service.expectedStatus;

		if (!success) {
			errorMessage = `Expected ${service.expectedStatus}, got ${statusCode}`;
		}
	} catch (err) {
		errorMessage = err instanceof Error ? err.message : "Unknown error";
		success = false;
	}

	const responseTime = Math.round(performance.now() - startTime);

	await sql`
		INSERT INTO service_checks (id, service_id, status_code, response_time, success, error_message)
		VALUES (${id}, ${service.id}, ${statusCode}, ${responseTime}, ${success}, ${errorMessage})
	`;

	const previousStatus = lastCheckStatus.get(service.id);
	lastCheckStatus.set(service.id, success);

	if (previousStatus !== undefined && previousStatus !== success) {
		if (success) {
			sendServiceUp(service.name, service.displayUrl || service.url, service.groupName, responseTime).catch(() => {});
		} else {
			sendServiceDown(service.name, service.displayUrl || service.url, service.groupName, statusCode, errorMessage).catch(() => {});
		}
	} else if (previousStatus === undefined && !success) {
		sendServiceDown(service.name, service.displayUrl || service.url, service.groupName, statusCode, errorMessage).catch(() => {});
	}

	return {
		id,
		serviceId: service.id,
		statusCode,
		responseTime,
		success,
		errorMessage,
		checkedAt: new Date().toISOString(),
	};
}

async function canAccessService(req: Request, serviceId: string): Promise<{ allowed: boolean; service?: Service; response?: Response }> {
	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE id = ${serviceId}
	`;

	if (rows.length === 0) {
		return { allowed: false, response: notFound("Service not found") };
	}

	const service = rowToService(rows[0]);

	if (service.isPublic) {
		return { allowed: true, service };
	}

	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return { allowed: false, response: unauthorized() };
	}

	if (auth.user.id !== service.createdBy && !auth.isAdmin) {
		return { allowed: false, response: forbidden("Cannot access this service") };
	}

	return { allowed: true, service };
}

export async function getForService(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return badRequest("Service ID required");
	}

	const access = await canAccessService(req, serviceId);
	if (!access.allowed) {
		return access.response!;
	}

	const limit = Number(url.searchParams.get("limit")) || 100;

	const rows = await sql`
		SELECT id, service_id, status_code, response_time, success, error_message, checked_at
		FROM service_checks
		WHERE service_id = ${serviceId}
		ORDER BY checked_at DESC
		LIMIT ${limit}
	`;

	return ok({ checks: rows.map(rowToCheck) });
}

export async function getStatsForService(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return badRequest("Service ID required");
	}

	const access = await canAccessService(req, serviceId);
	if (!access.allowed) {
		return access.response!;
	}

	const statsRows = await sql`
		SELECT
			COUNT(*) as total_checks,
			COUNT(*) FILTER (WHERE success = true) as successful_checks,
			AVG(response_time) as avg_response_time,
			MIN(response_time) as min_response_time,
			MAX(response_time) as max_response_time
		FROM service_checks
		WHERE service_id = ${serviceId}
		AND checked_at > NOW() - INTERVAL '24 hours'
	`;

	const stats = statsRows[0] || {};
	const totalChecks = Number(stats.total_checks) || 0;
	const successfulChecks = Number(stats.successful_checks) || 0;
	const uptimePercent = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

	return ok({
		stats: {
			totalChecks,
			successfulChecks,
			uptimePercent: Math.round(uptimePercent * 100) / 100,
			avgResponseTime: Math.round(Number(stats.avg_response_time) || 0),
			minResponseTime: Number(stats.min_response_time) || 0,
			maxResponseTime: Number(stats.max_response_time) || 0,
		},
	});
}

export async function getLatestForService(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return badRequest("Service ID required");
	}

	const access = await canAccessService(req, serviceId);
	if (!access.allowed) {
		return access.response!;
	}

	const rows = await sql`
		SELECT id, service_id, status_code, response_time, success, error_message, checked_at
		FROM service_checks
		WHERE service_id = ${serviceId}
		ORDER BY checked_at DESC
		LIMIT 1
	`;

	return ok({ check: rows.length > 0 ? rowToCheck(rows[0]) : null });
}

export async function getLatestBatch(req: Request): Promise<Response> {
	const body = await req.json();
	const { serviceIds } = body;

	if (!Array.isArray(serviceIds)) {
		return badRequest("serviceIds array required");
	}

	const checks: Record<string, ServiceCheck | null> = {};

	for (const serviceId of serviceIds) {
		const access = await canAccessService(req, serviceId);
		if (!access.allowed) continue;

		const rows = await sql`
			SELECT id, service_id, status_code, response_time, success, error_message, checked_at
			FROM service_checks
			WHERE service_id = ${serviceId}
			ORDER BY checked_at DESC
			LIMIT 1
		`;

		checks[serviceId] = rows.length > 0 ? rowToCheck(rows[0]) : null;
	}

	return ok({ checks });
}

export async function getStatsBatch(req: Request): Promise<Response> {
	const body = await req.json();
	const { serviceIds } = body;

	if (!Array.isArray(serviceIds)) {
		return badRequest("serviceIds array required");
	}

	if (serviceIds.length === 0) {
		return ok({ stats: {} });
	}

	const stats: Record<string, { uptimePercent: number; totalChecks: number }> = {};

	for (const serviceId of serviceIds) {
		const access = await canAccessService(req, serviceId);
		if (!access.allowed) continue;

		const rows = await sql`
			SELECT
				COUNT(*) as total_checks,
				COUNT(*) FILTER (WHERE success = true) as successful_checks
			FROM service_checks
			WHERE service_id = ${serviceId}
			AND checked_at > NOW() - INTERVAL '24 hours'
		`;

		const row = rows[0] || {};
		const totalChecks = Number(row.total_checks) || 0;
		const successfulChecks = Number(row.successful_checks) || 0;
		const uptimePercent = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

		stats[serviceId] = {
			uptimePercent: Math.round(uptimePercent * 100) / 100,
			totalChecks,
		};
	}

	return ok({ stats });
}

export async function runCheck(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}

	const serviceId = params?.id;
	if (!serviceId) {
		return badRequest("Service ID required");
	}

	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE id = ${serviceId}
	`;

	if (rows.length === 0) {
		return notFound("Service not found");
	}

	const service = rowToService(rows[0]);

	if (service.createdBy !== auth.user.id && !auth.isAdmin) {
		return forbidden("Cannot run check for this service");
	}

	const check = await performCheck(service);

	return ok({ check });
}

export async function startChecker(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}

	const serviceId = params?.id;
	if (!serviceId) {
		return badRequest("Service ID required");
	}

	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE id = ${serviceId}
	`;

	if (rows.length === 0) {
		return notFound("Service not found");
	}

	const service = rowToService(rows[0]);

	if (service.createdBy !== auth.user.id && !auth.isAdmin) {
		return forbidden("Cannot start checker for this service");
	}

	if (checkIntervals.has(serviceId)) {
		clearInterval(checkIntervals.get(serviceId));
	}

	performCheck(service);

	const interval = setInterval(() => {
		performCheck(service);
	}, service.checkInterval * 1000);

	checkIntervals.set(serviceId, interval);

	return ok({ message: `Checker started for service ${serviceId}` });
}

export async function stopChecker(
	req: Request,
	_url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const auth = await getAuthContext(req);
	if (!requireAuth(auth)) {
		return unauthorized();
	}

	const serviceId = params?.id;
	if (!serviceId) {
		return badRequest("Service ID required");
	}

	const rows = await sql`SELECT created_by FROM services WHERE id = ${serviceId}`;
	if (rows.length === 0) {
		return notFound("Service not found");
	}

	if (rows[0].created_by !== auth.user.id && !auth.isAdmin) {
		return forbidden("Cannot stop checker for this service");
	}

	if (checkIntervals.has(serviceId)) {
		clearInterval(checkIntervals.get(serviceId));
		checkIntervals.delete(serviceId);
	}

	return ok({ message: `Checker stopped for service ${serviceId}` });
}

export async function initializeCheckers(): Promise<void> {
	const rows = await sql`
		SELECT id, name, description, url, display_url, expected_status, check_interval, enabled, is_public, group_name, position, created_by, created_at, updated_at
		FROM services
		WHERE enabled = true
	`;

	for (const row of rows) {
		const service = rowToService(row);

		performCheck(service);

		const interval = setInterval(() => {
			performCheck(service);
		}, service.checkInterval * 1000);

		checkIntervals.set(service.id, interval);
	}
}
