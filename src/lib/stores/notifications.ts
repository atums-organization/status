import { writable } from "svelte/store";
import type { Notification, NotificationType } from "../../types";

function createNotificationStore() {
	const { subscribe, update } = writable<Notification[]>([]);

	function add(type: NotificationType, message: string, duration = 5000) {
		const id = crypto.randomUUID();
		const notification: Notification = { id, type, message, duration };

		update((notifications) => [...notifications, notification]);

		if (duration > 0) {
			setTimeout(() => remove(id), duration);
		}

		return id;
	}

	function remove(id: string) {
		update((notifications) => notifications.filter((n) => n.id !== id));
	}

	function clear() {
		update(() => []);
	}

	return {
		subscribe,
		add,
		remove,
		clear,
		success: (message: string, duration?: number) =>
			add("success", message, duration),
		error: (message: string, duration?: number) =>
			add("error", message, duration),
		warning: (message: string, duration?: number) =>
			add("warning", message, duration),
		info: (message: string, duration?: number) =>
			add("info", message, duration),
	};
}

export const notifications = createNotificationStore();
