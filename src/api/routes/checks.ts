import { sql } from "../index";
import type { Service, ServiceCheck } from "../types";

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
		expectedStatus: row.expected_status as number,
		checkInterval: row.check_interval as number,
		enabled: row.enabled as boolean,
		isPublic: row.is_public as boolean,
		groupName: row.group_name as string | null,
		createdBy: row.created_by as string,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	};
}

const checkIntervals = new Map<string, ReturnType<typeof setInterval>>();

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

export async function getForService(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	const limit = Number(url.searchParams.get("limit")) || 100;

	const rows = await sql`
		SELECT id, service_id, status_code, response_time, success, error_message, checked_at
		FROM service_checks
		WHERE service_id = ${serviceId}
		ORDER BY checked_at DESC
		LIMIT ${limit}
	`;

	return Response.json({ checks: rows.map(rowToCheck) });
}

export async function getStatsForService(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
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
	const uptimePercent =
		totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

	return Response.json({
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
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT id, service_id, status_code, response_time, success, error_message, checked_at
		FROM service_checks
		WHERE service_id = ${serviceId}
		ORDER BY checked_at DESC
		LIMIT 1
	`;

	if (rows.length === 0) {
		return Response.json({ check: null });
	}

	return Response.json({ check: rowToCheck(rows[0]) });
}

export async function getLatestBatch(req: Request): Promise<Response> {
	const body = await req.json();
	const { serviceIds } = body;

	if (!Array.isArray(serviceIds)) {
		return Response.json(
			{ error: "serviceIds array required" },
			{ status: 400 },
		);
	}

	const checks: Record<string, ServiceCheck | null> = {};

	for (const serviceId of serviceIds) {
		const rows = await sql`
			SELECT id, service_id, status_code, response_time, success, error_message, checked_at
			FROM service_checks
			WHERE service_id = ${serviceId}
			ORDER BY checked_at DESC
			LIMIT 1
		`;

		checks[serviceId] = rows.length > 0 ? rowToCheck(rows[0]) : null;
	}

	return Response.json({ checks });
}

export async function runCheck(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
		FROM services
		WHERE id = ${serviceId}
	`;

	if (rows.length === 0) {
		return Response.json({ error: "Service not found" }, { status: 404 });
	}

	const service = rowToService(rows[0]);
	const check = await performCheck(service);

	return Response.json({ check });
}

export async function startChecker(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	const rows = await sql`
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
		FROM services
		WHERE id = ${serviceId}
	`;

	if (rows.length === 0) {
		return Response.json({ error: "Service not found" }, { status: 404 });
	}

	const service = rowToService(rows[0]);

	if (checkIntervals.has(serviceId)) {
		clearInterval(checkIntervals.get(serviceId));
	}

	performCheck(service);

	const interval = setInterval(() => {
		performCheck(service);
	}, service.checkInterval * 1000);

	checkIntervals.set(serviceId, interval);

	return Response.json({
		success: true,
		message: `Checker started for service ${serviceId}`,
	});
}

export async function stopChecker(
	req: Request,
	url: URL,
	params?: Record<string, string>,
): Promise<Response> {
	const serviceId = params?.id;
	if (!serviceId) {
		return Response.json({ error: "Service ID required" }, { status: 400 });
	}

	if (checkIntervals.has(serviceId)) {
		clearInterval(checkIntervals.get(serviceId));
		checkIntervals.delete(serviceId);
	}

	return Response.json({
		success: true,
		message: `Checker stopped for service ${serviceId}`,
	});
}

export async function initializeCheckers(): Promise<void> {
	const rows = await sql`
		SELECT id, name, description, url, expected_status, check_interval, enabled, is_public, group_name, created_by, created_at, updated_at
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
