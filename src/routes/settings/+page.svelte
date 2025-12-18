<script lang="ts">
import { UserMenu } from "$lib";
import type { ActionData, PageData } from "./$types";
import { page } from "$app/state";
import { goto } from "$app/navigation";
import "./page.css";
import AccountSection from "./components/AccountSection.svelte";
import PasswordSection from "./components/PasswordSection.svelte";
import InvitesSection from "./components/InvitesSection.svelte";
import EventsSection from "./components/EventsSection.svelte";
import AuditSection from "./components/AuditSection.svelte";
import SessionSection from "./components/SessionSection.svelte";
import SiteSection from "./components/SiteSection.svelte";

const { data, form }: { data: PageData; form: ActionData } = $props();

const validTabs = $derived(() => {
	const base = ["account", "security"];
	if (data.user.role === "admin") {
		base.push("site", "invites", "events", "audit");
	}
	return base;
});

const tabs = $derived(() => {
	const base = [
		{ id: "account", label: "account" },
		{ id: "security", label: "security" },
	];
	if (data.user.role === "admin") {
		base.push(
			{ id: "site", label: "site" },
			{ id: "invites", label: "invites" },
			{ id: "events", label: "events" },
			{ id: "audit", label: "audit log" },
		);
	}
	return base;
});

const activeTab = $derived(() => {
	const tabParam = page.url.searchParams.get("tab");
	if (tabParam && validTabs().includes(tabParam)) {
		return tabParam;
	}
	return "account";
});

function setTab(tab: string) {
	goto(`?tab=${tab}`, { replaceState: true, noScroll: true });
}
</script>

<div class="container">
	<header class="header">
		<h1><span class="brand">{data.site.brand}</span>{data.site.suffix}</h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			{#if data.site.sourceUrl}
				<a href={data.site.sourceUrl} target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
			{/if}
			{#if data.site.discordUrl}
				<a href={data.site.discordUrl} target="_blank" rel="noopener noreferrer" class="nav-link">discord</a>
			{/if}
		</nav>
		<UserMenu user={data.user} />
	</header>

	<main class="main narrow">
		<h2>settings</h2>

		<div class="tabs">
			{#each tabs() as tab (tab.id)}
				<button
					type="button"
					class="tab"
					class:active={activeTab() === tab.id}
					onclick={() => setTab(tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="tab-content">
			{#if activeTab() === "account"}
				<AccountSection user={data.user} />
				<SessionSection />
			{:else if activeTab() === "security"}
				<PasswordSection error={form?.error} success={form?.success} />
			{:else if activeTab() === "site"}
				<SiteSection settings={data.siteSettings} error={form?.siteError} success={form?.siteSuccess} />
			{:else if activeTab() === "invites"}
				<InvitesSection invites={data.invites} error={form?.inviteError} success={form?.inviteSuccess} />
			{:else if activeTab() === "events"}
				<EventsSection events={data.events} groups={data.groups} error={form?.eventError} success={form?.eventSuccess} />
			{:else if activeTab() === "audit"}
				<AuditSection logs={data.auditLogs} />
			{/if}
		</div>
	</main>
</div>
