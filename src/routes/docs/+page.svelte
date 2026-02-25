<script lang="ts">
import "./page.css";
import endpointsData from "./endpoints.json";
import favicon from "$lib/assets/favicon.svg";
import { ThemeToggle, UserMenu, type DocsEndpoint, type DocsCategory } from "$lib";

const { data } = $props();
const apiBase = $derived(data.apiBase);
const siteIcon = $derived(data.site.icon || favicon);

let filterScopes = $state<string[]>([]);

const endpoints: DocsCategory[] = endpointsData;

function getMethodClass(method: string): string {
	switch (method) {
		case "GET":
			return "method-get";
		case "POST":
			return "method-post";
		case "PUT":
			return "method-put";
		case "DELETE":
			return "method-delete";
		default:
			return "";
	}
}

function matchesFilter(route: DocsEndpoint): boolean {
	if (filterScopes.length === 0) return true;
	if (!route.scopes) return false;
	return filterScopes.every((scope) => route.scopes!.includes(scope));
}

function toggleFilter(scope: string, event: MouseEvent) {
	event.stopPropagation();
	if (filterScopes.includes(scope)) {
		filterScopes = filterScopes.filter((s) => s !== scope);
	} else {
		filterScopes = [...filterScopes, scope];
	}
}

function clearFilter() {
	filterScopes = [];
}

const filteredEndpoints = $derived(
	endpoints
		.map((cat) => ({
			...cat,
			routes: cat.routes.filter(matchesFilter),
		}))
		.filter((cat) => cat.routes.length > 0)
);
</script>

<svelte:head>
	<title>api documentation</title>
</svelte:head>

<div class="container">
	<header class="header">
		<div class="header-left">
			<img src={siteIcon} alt="" class="site-icon" />
			<h1><span class="brand">{data.site.brand}</span>{data.site.suffix}</h1>
			<nav class="nav">
				<a href="/" class="nav-link">index</a>
				<a href="/docs" class="nav-link active">docs</a>
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
			{#if data.user}
				<UserMenu user={data.user} />
			{:else}
				<a href="/login" class="login-link">login</a>
			{/if}
		</div>
	</header>

	<main id="main-content" class="docs-page">
		<h1>api documentation</h1>
	<p class="docs-intro">base url: <code>{apiBase}</code></p>

	<section class="docs-section">
		<h2>authentication</h2>
		<p class="docs-intro">
			the api supports two authentication methods:
		</p>
		<div class="auth-methods">
			<div class="auth-method">
				<h4>session cookie</h4>
				<p>used by the web interface. login via <code>POST /auth/login</code> to receive a session cookie.</p>
			</div>
			<div class="auth-method">
				<h4>api key (bearer token)</h4>
				<p>for programmatic access. <a href="/settings?tab=account">create an api key</a></p>
				<code>Authorization: Bearer sk_...</code>
			</div>
		</div>
		<h4>available scopes <span class="scope-hint">(click to filter, select multiple)</span></h4>
		<div class="scopes-list">
			{#each ["services:read", "services:write", "groups:write", "checks:write", "events:write", "webhooks:read", "webhooks:write", "settings:read", "settings:write", "audit:read", "invites:read", "invites:write", "export:read", "import:write", "admin", "session"] as scope}
				<button
					type="button"
					class="scope-filter-btn"
					class:active={filterScopes.includes(scope)}
					onclick={(e) => toggleFilter(scope, e)}
				>
					{scope}
				</button>
			{/each}
		</div>
		{#if filterScopes.length > 0}
			<div class="filter-active">
				filtering by:
				{#each filterScopes as scope}
					<code>{scope}</code>
				{/each}
				<button type="button" class="clear-filter" onclick={clearFilter}>clear</button>
			</div>
		{/if}
	</section>

	{#each filteredEndpoints as category}
		<section class="docs-section">
			<h2>{category.category}</h2>
			<div class="endpoints">
				{#each category.routes as route}
					<div class="endpoint">
						<div class="endpoint-main">
							<div class="endpoint-header">
								<span class="method {getMethodClass(route.method)}">{route.method}</span>
								<code class="path">{route.path}</code>
								{#if route.scopes}
									{#each route.scopes as scope}
										<button
											type="button"
											class="badge {scope === 'admin' ? 'admin' : 'scope'}"
											class:active={filterScopes.includes(scope)}
											onclick={(e) => toggleFilter(scope, e)}
										>
											{scope}
										</button>
									{/each}
								{/if}
							</div>
							<p class="endpoint-desc">{route.desc}</p>
						</div>
						{#if route.request || route.response}
							<details class="endpoint-details">
								<summary>view details</summary>
								<div class="response-content">
									{#if route.request}
										<div class="response-section">
											<h4>request body</h4>
											<pre>{route.request}</pre>
										</div>
									{/if}
									{#if route.response}
										<div class="response-section">
											<h4>response</h4>
											<pre>{route.response}</pre>
										</div>
									{/if}
								</div>
							</details>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}
	</main>
</div>
