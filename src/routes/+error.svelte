<script lang="ts">
	import { page } from "$app/stores";
	import { env } from "$env/dynamic/public";
	import { ThemeToggle } from "$lib";
	import "./error.css";

	const discordUrl = env.PUBLIC_DISCORD_URL || null;
	const sourceUrl = env.PUBLIC_SOURCE_URL || null;
	const siteName = env.PUBLIC_SITE_NAME || "atums/status";
	const parts = siteName.split("/");
	const brand = parts[0] || siteName;
	const suffix = parts.length > 1 ? `/${parts.slice(1).join("/")}` : "";
</script>

<svelte:head>
	<title>{$page.status} | {siteName}</title>
</svelte:head>

<div class="container">
	<header class="header">
		<div class="header-left">
			<h1><a href="/" class="brand-link"><span class="brand">{brand}</span>{suffix}</a></h1>
			<nav class="nav">
			<a href="/" class="nav-link">index</a>
			{#if sourceUrl}
				<a href={sourceUrl} target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
			{/if}
			{#if discordUrl}
				<a href={discordUrl} target="_blank" rel="noopener noreferrer" class="nav-link">discord</a>
			{/if}
		</nav>
		</div>
		<div class="header-actions">
			<ThemeToggle />
		</div>
	</header>

	<main id="main-content" class="main centered">
		<div class="error-page">
			<span class="error-code">{$page.status}</span>
			<h2 class="error-title">
				{#if $page.status === 404}
					page not found
				{:else if $page.status === 500}
					server error
				{:else}
					something went wrong
				{/if}
			</h2>
			<p class="error-message">
				{#if $page.error?.message}
					{$page.error.message}
				{:else if $page.status === 404}
					the page you're looking for doesn't exist
				{:else}
					an unexpected error occurred
				{/if}
			</p>
			<a href="/" class="btn">back to index</a>
		</div>
	</main>
</div>
