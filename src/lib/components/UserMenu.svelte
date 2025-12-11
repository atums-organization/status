<script lang="ts">
	import type { User } from "$lib";

	const { user }: { user: User } = $props();
	let open = $state(false);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}
</script>

<svelte:window onclick={close} />

<div class="menu">
	<button
		class="trigger"
		onclick={(e) => {
			e.stopPropagation();
			toggle();
		}}
	>
		<span class="username">{user.username}</span>
		<svg
			class="chevron"
			class:open
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	</button>

	{#if open}
		<div class="dropdown">
			<div class="dropdown-header">
				<span class="dropdown-username">{user.username}</span>
				<span class="dropdown-role">{user.role}</span>
			</div>
			<div class="dropdown-divider"></div>
			<a href="/settings" class="dropdown-item">settings</a>
			<div class="dropdown-divider"></div>
			<form method="POST" action="/settings?/logout">
				<button
					type="submit"
					class="dropdown-item logout"
					onclick={(e) => e.stopPropagation()}>logout</button
				>
			</form>
		</div>
	{/if}
</div>

<style>
	.menu {
		position: relative;
	}

	.trigger {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.trigger:hover {
		border-color: var(--color-border-hover);
		color: var(--color-text);
	}

	.username {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-transform: lowercase;
	}

	.chevron {
		width: 14px;
		height: 14px;
		transition: transform var(--transition-fast);
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.dropdown {
		position: absolute;
		top: calc(100% + var(--spacing-xs));
		right: 0;
		min-width: 180px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-md);
		z-index: 1000;
	}

	.dropdown-header {
		padding: var(--spacing-sm) var(--spacing-md);
	}

	.dropdown-username {
		display: block;
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-text);
		text-transform: lowercase;
	}

	.dropdown-role {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		text-transform: lowercase;
	}

	.dropdown-divider {
		height: 1px;
		background: var(--color-border);
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.dropdown-item:hover {
		background: var(--color-bg-hover);
		color: var(--color-text);
	}

	.dropdown-item.logout:hover {
		color: var(--color-accent);
	}
</style>
