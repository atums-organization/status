<script lang="ts">
	import { onMount } from "svelte";

	type Theme = "system" | "dark" | "light";
	const cycle: Theme[] = ["system", "dark", "light"];

	let theme = $state<Theme>("system");

	function getSystemTheme(): "dark" | "light" {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}

	function apply(t: Theme) {
		const resolved = t === "system" ? getSystemTheme() : t;
		document.documentElement.setAttribute("data-theme", resolved);
		document.documentElement.style.colorScheme = resolved;
	}

	function toggle() {
		const i = cycle.indexOf(theme);
		theme = cycle[(i + 1) % cycle.length];
		localStorage.setItem("theme", theme);
		apply(theme);
	}

	onMount(() => {
		const stored = localStorage.getItem("theme");
		theme = cycle.includes(stored as Theme) ? (stored as Theme) : "system";
		apply(theme);

		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		function onChange() {
			if (theme === "system") apply("system");
		}
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	});
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={toggle}
	aria-label="Toggle theme (current: {theme})"
	title={theme}
>
	{#if theme === "system"}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
			<path d="M8 21h8M12 17v4" />
		</svg>
	{:else if theme === "dark"}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="5" />
			<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
		</svg>
	{/if}
</button>

<style>
	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xs) var(--spacing-sm);
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
		line-height: 1.5;
	}

	.theme-toggle:hover {
		border-color: var(--color-border-hover);
		color: var(--color-text);
	}

	.theme-toggle svg {
		width: 1em;
		height: 1.5em;
	}
</style>
