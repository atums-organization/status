<script lang="ts">
	import { page } from "$app/stores";
	import "./error.css";
</script>

<svelte:head>
	<title>{$page.status} | atums/status</title>
</svelte:head>

<div class="container">
	<header class="header">
		<h1><a href="/" class="brand-link"><span class="brand">atums</span>/status</a></h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			<a href="https://heliopolis.live/atums/status" target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
		</nav>
	</header>

	<main class="main centered">
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
