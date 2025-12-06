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

<div class="notifications">
	{#each notifications.list as notification (notification.id)}
		<div class="notification {notification.type}">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d={getIcon(notification.type)} />
			</svg>
			<span class="message">{notification.message}</span>
			<button class="close" aria-label="Close notification" onclick={() => notifications.remove(notification.id)}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.notifications {
		position: fixed;
		top: var(--spacing-md);
		right: var(--spacing-md);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		max-width: 400px;
	}

	.notification {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		border: 1px solid;
		box-shadow: var(--shadow-md);
		animation: slideIn 0.2s ease;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.notification svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.message {
		flex: 1;
		font-size: var(--text-sm);
	}

	.close {
		background: none;
		border: none;
		padding: var(--spacing-xs);
		color: inherit;
		opacity: 0.6;
		transition: opacity var(--transition-fast);
	}

	.close:hover {
		opacity: 1;
	}

	.close svg {
		width: 16px;
		height: 16px;
	}

	.success {
		background: var(--color-success-bg);
		border-color: var(--color-success-border);
		color: var(--color-success);
	}

	.error {
		background: var(--color-error-bg);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	.warning {
		background: var(--color-warning-bg);
		border-color: var(--color-warning-border);
		color: var(--color-warning);
	}

	.info {
		background: var(--color-info-bg);
		border-color: var(--color-info-border);
		color: var(--color-info);
	}
</style>
