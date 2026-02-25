<script lang="ts">
import { ThemeToggle, UserMenu } from "$lib";
import favicon from "$lib/assets/favicon.svg";
import type { PageData } from "./$types";
import "./page.css";

const { data }: { data: PageData } = $props();

const siteIcon = $derived(data.site.icon || favicon);
</script>

<div class="container">
	<header class="header">
		<div class="header-left">
			<img src={siteIcon} alt="" class="site-icon" />
			<h1><span class="brand">{data.site.brand}</span>{data.site.suffix}</h1>
			<nav class="nav">
				<a href="/" class="nav-link">index</a>
				<a href="/services" class="nav-link">services</a>
				{#if data.site.sourceUrl}
					<a href={data.site.sourceUrl} target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
				{/if}
				{#if data.site.discordUrl}
					<a href={data.site.discordUrl} target="_blank" rel="noopener noreferrer" class="nav-link">discord</a>
				{/if}
			</nav>
		</div>
		<div class="header-actions">
			<ThemeToggle />
			<UserMenu user={data.user} />
		</div>
	</header>

	<main id="main-content" class="main">
		<div class="welcome">
			<h2>Welcome back, {data.user.username}</h2>
			<p>Your services will appear here once configured.</p>
			<a href="/services" class="btn configure-btn">configure services</a>
		</div>
	</main>
</div>
