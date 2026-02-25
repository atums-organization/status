import { randomUUIDv7 } from "bun";
import type { ServiceCheck, SSEClient } from "../../types";

const clients: Map<string, SSEClient> = new Map();
const encoder = new TextEncoder();

export function addClient(controller: ReadableStreamDefaultController<Uint8Array>): string {
	const id = randomUUIDv7();
	clients.set(id, { id, controller });
	return id;
}

export function removeClient(id: string): void {
	clients.delete(id);
}

export function broadcastCheck(serviceId: string, check: ServiceCheck): void {
	const data = JSON.stringify({ type: "check", serviceId, check });
	const message = `data: ${data}\n\n`;
	const encoded = encoder.encode(message);

	for (const [id, client] of clients) {
		try {
			client.controller.enqueue(encoded);
		} catch {
			clients.delete(id);
		}
	}
}

export function createSSEResponse(): Response {
	let clientId: string;
	let keepAlive: ReturnType<typeof setInterval>;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			clientId = addClient(controller);

			keepAlive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(": keepalive\n\n"));
				} catch {
					clearInterval(keepAlive);
					removeClient(clientId);
				}
			}, 30000);

			controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`));
		},
		cancel() {
			clearInterval(keepAlive);
			removeClient(clientId);
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

export async function handleSSE(_req: Request): Promise<Response> {
	return createSSEResponse();
}
