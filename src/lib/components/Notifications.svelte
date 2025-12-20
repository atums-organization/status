<script lang="ts">
import type { NotificationType } from "$lib";
import { notifications } from "$lib/stores.svelte";

function getIcon(type: NotificationType): string {
	switch (type) {
		case "success":
			return "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
		case "error":
			return "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z";
		case "warning":
			return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
		default:
			return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
	}
}
</script>

<div class="notifications" aria-live="polite" aria-label="Notifications">
	{#each notifications.list as notification (notification.id)}
		<button
			class="notification {notification.type}"
			onclick={() => notifications.remove(notification.id)}
			role={notification.type === "error" ? "alert" : "status"}
			aria-label="{notification.type}: {notification.message}. Click to dismiss"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d={getIcon(notification.type)} />
			</svg>
			<span class="message">{notification.message}</span>
		</button>
	{/each}
</div>

<style>
	.notifications {
		position: fixed;
		bottom: var(--spacing-lg);
		right: var(--spacing-lg);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		max-width: 360px;
	}

	.notification {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		animation: slideUp 0.2s ease;
		cursor: pointer;
		text-align: left;
		width: 100%;
		font-family: inherit;
		transition: border-color var(--transition-fast);
	}

	.notification:hover {
		border-color: var(--color-border-hover);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.notification svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.message {
		flex: 1;
		font-size: var(--text-sm);
		color: var(--color-text);
	}

	.success svg {
		color: var(--color-success);
	}

	.error svg {
		color: var(--color-error);
	}

	.warning svg {
		color: var(--color-warning);
	}

	.info svg {
		color: var(--color-info);
	}
</style>
