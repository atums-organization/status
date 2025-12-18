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
	displayUrl: string | null;
	expectedStatus: number;
	checkInterval: number;
	enabled: boolean;
	isPublic: boolean;
	groupName: string | null;
	position: number;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface Group {
	id: string;
	name: string;
	position: number;
	createdAt: string;
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

export type EventType = "incident" | "maintenance" | "info";
export type EventStatus = "ongoing" | "resolved" | "scheduled";

export interface StatusEvent {
	id: string;
	title: string;
	description: string | null;
	type: EventType;
	status: EventStatus;
	groupName: string | null;
	startedAt: string;
	resolvedAt: string | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
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
	duration?: number;
}

export interface AuditLog {
	id: string;
	userId: string;
	action: string;
	entityType: string;
	entityId: string | null;
	details: Record<string, unknown> | null;
	ipAddress: string | null;
	createdAt: string;
	userName?: string;
	userEmail?: string;
}

export interface Invite {
	id: string;
	code: string;
	createdBy: string;
	usedBy: string | null;
	usedByUsername: string | null;
	usedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
}
