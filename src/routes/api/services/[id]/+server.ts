import { json } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
	const serviceId = params.id;

	try {
		const [service, checks, stats] = await Promise.all([
			api.getServiceById(serviceId),
			api.getChecksForService(serviceId, 100),
			api.getStatsForService(serviceId),
		]);

		if (!service) {
			return json({ error: "Service not found" }, { status: 404 });
		}

		return json({ service, checks, stats });
	} catch {
		return json({ error: "Failed to fetch service details" }, { status: 500 });
	}
};
