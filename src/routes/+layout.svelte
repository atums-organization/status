<script lang="ts">
import "../app.css";
import { Notifications } from "$lib";
import favicon from "$lib/assets/favicon.svg";
import { onMount } from "svelte";

const { data, children } = $props();

const iconUrl = $derived(data.site.icon || favicon);
const buildVersion = __APP_VERSION__;
let serverVersion = $state(buildVersion);
let isOutdated = $derived(serverVersion !== buildVersion);

async function checkVersion() {
	try {
		const res = await fetch("/api/version");
		if (res.ok) {
			const data = await res.json();
			serverVersion = data.data?.version || buildVersion;
		}
	} catch {}
}

onMount(() => {
	checkVersion();
	const interval = setInterval(checkVersion, 60 * 60 * 1000);
	return () => clearInterval(interval);
});
</script>

<svelte:head>
	<link rel="icon" href={iconUrl} />
</svelte:head>

<a href="#main-content" class="skip-link">Skip to main content</a>
<Notifications />
{@render children()}
<footer class="version-footer">
	{#if isOutdated}
		<span class="outdated">outdated</span>
		<a href="https://heliopolis.live/atums/status/-/releases" target="_blank" rel="noopener noreferrer" class="version-link">v{buildVersion} → v{serverVersion}</a>
		<button class="refresh-btn" onclick={() => location.reload()}>refresh</button>
	{:else}
		<a href="https://heliopolis.live/atums/status/-/releases" target="_blank" rel="noopener noreferrer" class="version-link">v{buildVersion}</a>
	{/if}
</footer>
