<script lang="ts">
import "../app.css";
import { Notifications } from "$lib";
import favicon from "$lib/assets/favicon.svg";
import { onMount } from "svelte";

const { data, children } = $props();

const iconUrl = $derived(data.site.icon || favicon);
const buildHash = __COMMIT_HASH__;
let serverHash = $state(buildHash);
let isOutdated = $derived(serverHash !== buildHash);

async function checkVersion() {
	try {
		const res = await fetch("/api/version");
		if (res.ok) {
			const data = await res.json();
			serverHash = data.data?.version || buildHash;
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
		<span class="outdated">outdated</span> v{buildHash} → v{serverHash}
		<button class="refresh-btn" onclick={() => location.reload()}>refresh</button>
	{:else}
		v{buildHash}
	{/if}
</footer>
