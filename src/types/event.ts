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
