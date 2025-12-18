import type { ServiceCheck, SSEClient } from "../../types";

const clients: Map<string, SSEClient> = new Map();
const encoder = new TextEncoder();

export function addClient(controller: ReadableStreamDefaultController<Uint8Array>): string {
	const id = crypto.randomUUID();
	clients.set(id, { id, controller });
	console.log(`[SSE] Client connected: ${id} (total: ${clients.size})`);
	return id;
}

export function removeClient(id: string): void {
	clients.delete(id);
	console.log(`[SSE] Client disconnected: ${id} (total: ${clients.size})`);
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
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const clientId = addClient(controller);

			const keepAlive = setInterval(() => {
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
