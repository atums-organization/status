<script lang="ts">
import "../app.css";
import { Notifications } from "$lib";
import favicon from "$lib/assets/favicon.svg";

const { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Notifications />
{@render children()}
