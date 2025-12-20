<script lang="ts">
	import type { User } from "$lib";

	const { user }: { user: User } = $props();
	let open = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);
	let triggerRef = $state<HTMLButtonElement | null>(null);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && open) {
			close();
			triggerRef?.focus();
		} else if (e.key === "ArrowDown" && open) {
			e.preventDefault();
			const firstItem = menuRef?.querySelector<HTMLElement>('[role="menuitem"]');
			firstItem?.focus();
		} else if (e.key === "ArrowUp" && open) {
			e.preventDefault();
			const items = menuRef?.querySelectorAll<HTMLElement>('[role="menuitem"]');
			items?.[items.length - 1]?.focus();
		}
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		const items = Array.from(menuRef?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
		const currentIndex = items.indexOf(e.target as HTMLElement);

		if (e.key === "ArrowDown") {
			e.preventDefault();
			const nextIndex = (currentIndex + 1) % items.length;
			items[nextIndex]?.focus();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const prevIndex = (currentIndex - 1 + items.length) % items.length;
			items[prevIndex]?.focus();
		} else if (e.key === "Escape") {
			close();
			triggerRef?.focus();
		} else if (e.key === "Tab") {
			close();
		}
	}
</script>

<svelte:window onclick={close} />

<div class="menu" onkeydown={handleKeydown} role="presentation">
	<button
		bind:this={triggerRef}
		class="trigger"
		onclick={(e) => {
			e.stopPropagation();
			toggle();
		}}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls="user-menu"
		aria-label="User menu for {user.username}"
	>
		<span class="username">{user.username}</span>
		<svg
			class="chevron"
			class:open
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	</button>

	{#if open}
		<div
			bind:this={menuRef}
			id="user-menu"
			class="dropdown"
			role="menu"
			aria-label="User menu"
			tabindex="-1"
			onkeydown={handleMenuKeydown}
		>
			<div class="dropdown-header" role="presentation">
				<span class="dropdown-username">{user.username}</span>
				<span class="dropdown-role">{user.role}</span>
			</div>
			<div class="dropdown-divider" role="separator"></div>
			<a href="/settings" class="dropdown-item" role="menuitem" tabindex="-1">settings</a>
			<div class="dropdown-divider" role="separator"></div>
			<form method="POST" action="/settings?/logout">
				<button
					type="submit"
					class="dropdown-item logout"
					role="menuitem"
					tabindex="-1"
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
		line-height: 1.5;
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

	.dropdown-item:hover,
	.dropdown-item:focus {
		background: var(--color-bg-hover);
		color: var(--color-text);
		outline: none;
	}

	.dropdown-item.logout:hover,
	.dropdown-item.logout:focus {
		color: var(--color-accent);
	}
</style>
