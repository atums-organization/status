export interface Service {
	id: string;
	name: string;
	description: string | null;
	url: string;
	displayUrl: string | null;
	expectedStatus: number;
	expectedContentType: string | null;
	expectedBody: string | null;
	checkInterval: number;
	enabled: boolean;
	isPublic: boolean;
	groupName: string | null;
	position: number;
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
