import type { User, Service, ServiceCheck, Group, StatusEvent } from "./index";

export interface StatusPageData {
	user: User | null;
	services: Service[];
	checks: Record<string, ServiceCheck | null>;
	groups: Group[];
	uptime: Record<string, { uptimePercent: number; totalChecks: number }>;
	timezone: string;
	embed: {
		siteName: string;
		siteUrl: string;
		title: string;
		description: string;
		status: "operational" | "degraded" | "outage" | "unknown";
	};
	site: {
		brand: string;
		suffix: string;
		icon: string | null;
		sourceUrl: string | null;
		discordUrl: string | null;
	};
	apiUrl: string;
	currentGroup?: string;
	isMasterGroup?: boolean;
	subGroups?: Group[];
	activeEvents?: StatusEvent[];
	recentEvents?: StatusEvent[];
}

export interface StatusPageForm {
	editError?: string;
	editServiceId?: string;
	createError?: string;
	renameError?: string;
	error?: string;
}
