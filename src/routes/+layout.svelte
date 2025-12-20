<script lang="ts">
import "../app.css";
import { Notifications } from "$lib";
import favicon from "$lib/assets/favicon.svg";

const { data, children } = $props();

const iconUrl = $derived(data.site.icon || favicon);
</script>

<svelte:head>
	<link rel="icon" href={iconUrl} />
</svelte:head>

<a href="#main-content" class="skip-link">Skip to main content</a>
<Notifications />
{@render children()}
