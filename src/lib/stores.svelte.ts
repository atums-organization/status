import type { Notification, NotificationType } from "../types";

let notificationList = $state<Notification[]>([]);

export const notifications = {
	get list() {
		return notificationList;
	},
	add(type: NotificationType, message: string, duration = 5000) {
		const id = crypto.randomUUID();
		notificationList.push({ id, type, message });

		if (duration > 0) {
			setTimeout(() => this.remove(id), duration);
		}

		return id;
	},
	remove(id: string) {
		notificationList = notificationList.filter((n) => n.id !== id);
	},
	success(message: string, duration?: number) {
		return this.add("success", message, duration);
	},
	error(message: string, duration?: number) {
		return this.add("error", message, duration);
	},
	warning(message: string, duration?: number) {
		return this.add("warning", message, duration);
	},
	info(message: string, duration?: number) {
		return this.add("info", message, duration);
	},
};
