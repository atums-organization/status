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

const { data, form }: { data: PageData; form: ActionData } = $props();

const validTabs = $derived(() => {
	const base = ["account", "security"];
	if (data.user.role === "admin") {
		base.push("invites", "events", "audit");
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
		<h1><span class="brand">atums</span>/status</h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			<a href="https://heliopolis.live/atums/status" target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
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
