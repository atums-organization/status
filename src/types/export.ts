import type { Group, Service } from "./index";

export type ExportType = "global" | "group" | "service";

export interface ExportData {
	version: number;
	type: ExportType;
	exportedAt: string;
	data: {
		groups?: ExportGroup[];
		services?: ExportService[];
	};
}

export type ExportGroup = Omit<Group, "id" | "createdAt">;

export type ExportService = Omit<
	Service,
	"id" | "createdBy" | "createdAt" | "updatedAt"
>;
