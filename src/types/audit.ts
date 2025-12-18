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
