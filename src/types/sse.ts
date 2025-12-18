import type { ServiceCheck } from "./service";

export interface SSEMessage {
	type: "connected" | "check";
	clientId?: string;
	serviceId?: string;
	check?: ServiceCheck;
}

export type CheckUpdateHandler = (serviceId: string, check: ServiceCheck) => void;

export interface SSEClient {
	id: string;
	controller: ReadableStreamDefaultController<Uint8Array>;
}
