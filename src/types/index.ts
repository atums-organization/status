export interface User {
	id: string;
	username: string;
	email: string;
	role: string;
	accessIds: string[];
}

export interface Service {
	id: string;
	name: string;
	description: string | null;
	url: string;
	expectedStatus: number;
	checkInterval: number;
	enabled: boolean;
	isPublic: boolean;
	groupName: string | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface ServiceCheck {
	id: string;
	serviceId: string;
	statusCode: number | null;
	responseTime: number | null;
	success: boolean;
	errorMessage: string | null;
	checkedAt: string;
}

export interface ServiceStats {
	totalChecks: number;
	successfulChecks: number;
	uptimePercent: number;
	avgResponseTime: number;
	minResponseTime: number;
	maxResponseTime: number;
}

export interface SqlMigration {
	id: string;
	name: string;
	upSql: string;
	downSql?: string;
}

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
}
