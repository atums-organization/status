<script lang="ts">
	import {
		type Group,
		type Service,
		type ServiceCheck,
		type ServiceStats,
		UserMenu,
		formatDateTime,
		formatShortTime as formatShortTimeUtil,
		formatResponseTime,
	} from "$lib";
	import { createSSEConnection } from "$lib/sse";
	import type { ActionData, PageData } from "./$types";
	import { enhance } from "$app/forms";
	import { goto, invalidateAll } from "$app/navigation";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import "./page.css";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// eslint-disable-next-line svelte/prefer-writable-derived -- need mutable state for SSE updates
	let checks = $state<Record<string, ServiceCheck | null>>({ ...data.checks });

	$effect(() => {
		checks = { ...data.checks };
	});

	onMount(() => {
		const cleanup = createSSEConnection((serviceId, check) => {
			checks[serviceId] = check;
		}, data.apiUrl);
		return cleanup;
	});

	$effect(() => {
		const modalParam = page.url.searchParams.get("modal");
		if (modalParam) {
			if (!selectedService || selectedService.id !== modalParam) {
				const service = data.services?.find((s) => s.id === modalParam);
				if (service) {
					openServiceDetail(service, false);
				} else {
					goto("/", { replaceState: true, noScroll: true });
				}
			}
		} else if (selectedService) {
			selectedService = null;
			serviceChecks = [];
			serviceStats = null;
		}
	});

	const embedColor = $derived(
		data.embed.status === "operational"
			? "#22c55e"
			: data.embed.status === "degraded"
				? "#eab308"
				: data.embed.status === "outage"
					? "#ef4444"
					: "#808080",
	);

	const canonicalUrl = $derived(data.embed.siteUrl || undefined);

	let editMode = $state(false);
	let selectedService = $state<Service | null>(null);
	let editingService = $state<Service | null>(null);
	let creatingService = $state(false);
	let creatingInGroup = $state<string | null>(null);
	let serviceChecks = $state<ServiceCheck[]>([]);
	let serviceStats = $state<ServiceStats | null>(null);
	let loading = $state(false);

	let draggedService = $state<Service | null>(null);

	function handleFormResult() {
		return async ({
			result,
			update,
		}: {
			result: { type: string };
			update: () => Promise<void>;
		}) => {
			if (result.type === "success") {
				editingService = null;
				creatingService = false;
				creatingInGroup = null;
				await invalidateAll();
			}
			await update();
		};
	}

	function formatTime(ms: number | null): string {
		if (ms === null) return "-";
		return formatResponseTime(ms);
	}

	function formatDate(date: string): string {
		return formatDateTime(date, data.timezone);
	}

	function formatShortTime(date: string): string {
		return formatShortTimeUtil(date, data.timezone);
	}

	const groupedServices = $derived.by(() => {
		const grouped: Record<string, Service[]> = {};
		const ungrouped: Service[] = [];
		const services = data.services || [];

		for (const service of services) {
			if (service.groupName) {
				if (!grouped[service.groupName]) {
					grouped[service.groupName] = [];
				}
				grouped[service.groupName].push(service);
			} else {
				ungrouped.push(service);
			}
		}

		for (const key of Object.keys(grouped)) {
			grouped[key].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
		}
		ungrouped.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

		return { groups: grouped, ungrouped };
	});

	const sortedGroups = $derived.by(() => {
		const dbGroups = data.groups || [];
		const dbGroupNames = new Set(dbGroups.map((g) => g.name));

		const serviceGroupNames = new Set(
			(data.services || [])
				.map((s) => s.groupName)
				.filter(
					(name): name is string =>
						name !== null && !dbGroupNames.has(name),
				),
		);

		const allGroups: Group[] = [
			...dbGroups.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
			...[...serviceGroupNames].sort().map((name, i) => ({
				id: `service-group-${name}`,
				name,
				position: dbGroups.length + i,
				createdAt: new Date().toISOString(),
			})),
		];

		return allGroups;
	});

	const overallUptime = $derived.by(() => {
		const uptime = data.uptime || {};
		const services = data.services || [];
		if (services.length === 0) return null;

		const values = services
			.map((s) => uptime[s.id])
			.filter((u) => u && u.totalChecks > 0);

		if (values.length === 0) return null;

		const avg =
			values.reduce((sum, u) => sum + u.uptimePercent, 0) / values.length;
		return Math.round(avg * 100) / 100;
	});

	const groupUptime = $derived.by(() => {
		const uptime = data.uptime || {};
		const result: Record<string, number | null> = {};

		for (const [groupName, services] of Object.entries(
			groupedServices.groups,
		)) {
			const values = services
				.map((s) => uptime[s.id])
				.filter((u) => u && u.totalChecks > 0);

			if (values.length === 0) {
				result[groupName] = null;
			} else {
				const avg =
					values.reduce((sum, u) => sum + u.uptimePercent, 0) /
					values.length;
				result[groupName] = Math.round(avg * 100) / 100;
			}
		}

		return result;
	});

	async function openServiceDetail(service: Service, updateUrl = true) {
		if (editMode) return;
		selectedService = service;
		loading = true;
		serviceChecks = [];
		serviceStats = null;

		if (updateUrl) {
			goto(`?modal=${service.id}`, { replaceState: false, noScroll: true });
		}

		try {
			const [checksRes, statsRes] = await Promise.all([
				fetch(`/api/checks/service/${service.id}?limit=100`),
				fetch(`/api/checks/service/${service.id}/stats`),
			]);

			if (checksRes.ok) {
				const checksData = await checksRes.json();
				serviceChecks = checksData.data?.checks ?? [];
			}
			if (statsRes.ok) {
				const statsData = await statsRes.json();
				serviceStats = statsData.data?.stats ?? null;
			}
		} catch {
			serviceChecks = [];
			serviceStats = null;
		} finally {
			loading = false;
		}
	}

	function closeModal() {
		selectedService = null;
		serviceChecks = [];
		serviceStats = null;
		goto("/", { replaceState: false, noScroll: true });
	}

	function closeEditModal() {
		editingService = null;
	}

	function closeCreateModal() {
		creatingService = false;
		creatingInGroup = null;
	}

	function openCreateModal(groupName: string | null = null) {
		creatingService = true;
		creatingInGroup = groupName;
	}

	function handleServiceDragStart(e: DragEvent, service: Service) {
		if (!editMode) return;
		draggedService = service;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", service.id);
		}
	}

	function handleServiceDragEnd() {
		draggedService = null;
	}

	async function handleServiceDrop(
		e: DragEvent,
		targetService: Service | null,
		targetGroup: string | null,
	) {
		e.preventDefault();
		if (!draggedService) return;

		const toGroup = targetGroup;

		const servicesInGroup = targetGroup
			? groupedServices.groups[targetGroup] || []
			: groupedServices.ungrouped;

		const filtered = servicesInGroup.filter(
			(s) => s.id !== draggedService!.id,
		);
		const targetIndex = targetService
			? filtered.findIndex((s) => s.id === targetService.id)
			: filtered.length;

		filtered.splice(
			targetIndex === -1 ? filtered.length : targetIndex,
			0,
			draggedService,
		);

		const positions: Array<{
			id: string;
			position: number;
			groupName?: string;
		}> = filtered.map((s, i) => ({
			id: s.id,
			position: i,
			groupName: toGroup ?? undefined,
		}));

		draggedService = null;

		if (positions.length > 0) {
			await savePositions(positions);
		}
	}

	async function moveGroupUp(groupName: string) {
		const groupList = [...sortedGroups];
		const index = groupList.findIndex((g) => g.name === groupName);
		if (index <= 0) return;

		[groupList[index - 1], groupList[index]] = [
			groupList[index],
			groupList[index - 1],
		];

		const positions = groupList.map((g, i) => ({
			name: g.name,
			position: i,
		}));

		await saveGroupPositions(positions);
	}

	async function moveGroupDown(groupName: string) {
		const groupList = [...sortedGroups];
		const index = groupList.findIndex((g) => g.name === groupName);
		if (index === -1 || index >= groupList.length - 1) return;

		[groupList[index], groupList[index + 1]] = [
			groupList[index + 1],
			groupList[index],
		];

		const positions = groupList.map((g, i) => ({
			name: g.name,
			position: i,
		}));

		await saveGroupPositions(positions);
	}

	async function savePositions(
		positions: Array<{ id: string; position: number; groupName?: string }>,
	) {
		const formData = new FormData();
		formData.set("positions", JSON.stringify(positions));

		await fetch("?/updatePositions", {
			method: "POST",
			body: formData,
		});
		await invalidateAll();
	}

	async function saveGroupPositions(
		positions: Array<{ name: string; position: number }>,
	) {
		const formData = new FormData();
		formData.set("positions", JSON.stringify(positions));

		await fetch("?/updateGroupPositions", {
			method: "POST",
			body: formData,
		});
		await invalidateAll();
	}

	let hoveredPoint = $state<{
		check: ServiceCheck;
		x: number;
		y: number;
	} | null>(null);

	const graphData = $derived.by(() => {
		if (serviceChecks.length === 0)
			return {
				points: [],
				maxTime: 0,
				minTime: 0,
				timeLabels: [],
				yLabels: [],
			};

		const reversed = [...serviceChecks].reverse();
		const times = reversed.map((c) => c.responseTime ?? 0);
		const maxTime = Math.max(...times);
		const minTime = Math.min(...times);
		const padding = 10;

		const getY = (responseTime: number) => {
			if (maxTime === minTime) return 50;
			return (
				padding +
				((maxTime - responseTime) / (maxTime - minTime)) *
					(100 - padding * 2)
			);
		};

		const timeLabels: { x: number; label: string }[] = [];
		if (reversed.length > 0) {
			const first = reversed[0];
			const last = reversed[reversed.length - 1];
			const mid = reversed[Math.floor(reversed.length / 2)];

			timeLabels.push({ x: 0, label: formatGraphDate(first.checkedAt) });
			if (reversed.length > 2) {
				timeLabels.push({
					x: 50,
					label: formatGraphDate(mid.checkedAt),
				});
			}
			timeLabels.push({ x: 100, label: formatGraphDate(last.checkedAt) });
		}

		const yLabels = [
			{ y: padding, label: formatTime(maxTime) },
			{ y: 50, label: formatTime((maxTime + minTime) / 2) },
			{ y: 100 - padding, label: formatTime(minTime) },
		];

		return {
			points: reversed.map((check, i) => ({
				x: (i / (reversed.length - 1 || 1)) * 100,
				y: getY(check.responseTime ?? 0),
				check,
			})),
			maxTime,
			minTime,
			timeLabels,
			yLabels,
		};
	});

	function formatGraphDate(date: string): string {
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.floor(
			(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
		);

		const timeOpts: Intl.DateTimeFormatOptions = {
			timeZone: data.timezone,
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
		};

		if (diffDays === 0) {
			return d.toLocaleTimeString(undefined, timeOpts);
		}
		if (diffDays === 1) {
			return "Yesterday " + d.toLocaleTimeString(undefined, timeOpts);
		}
		return (
			d.toLocaleDateString(undefined, {
				timeZone: data.timezone,
				month: "short",
				day: "numeric",
			}) +
			" " +
			d.toLocaleTimeString(undefined, timeOpts)
		);
	}
</script>

<svelte:head>
	<title>{data.embed.title}</title>
	<meta name="description" content={data.embed.description} />
	<meta name="theme-color" content={embedColor} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.embed.title} />
	<meta property="og:description" content={data.embed.description} />
	<meta property="og:site_name" content={data.embed.siteName} />
	{#if canonicalUrl}
		<meta property="og:url" content={canonicalUrl} />
	{/if}
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.embed.title} />
	<meta name="twitter:description" content={data.embed.description} />
</svelte:head>

<div class="container">
	<header class="header">
		<h1><span class="brand">{data.site.brand}</span>{data.site.suffix}</h1>
		<nav class="nav">
			<a href="/" class="nav-link active">index</a>
			{#if data.site.sourceUrl}
				<a
					href={data.site.sourceUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="nav-link">source</a
				>
			{/if}
			{#if data.site.discordUrl}
				<a
					href={data.site.discordUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="nav-link">discord</a
				>
			{/if}
		</nav>
		{#if data.user}
			<UserMenu user={data.user} />
		{:else}
			<a href="/login" class="login-link">login</a>
		{/if}
	</header>

	<main class="main centered" class:edit-mode={editMode}>
		{#if data.user}
			<div class="page-controls">
				<button
					type="button"
					class="btn"
					class:primary={editMode}
					onclick={() => (editMode = !editMode)}
				>
					{editMode ? "close" : "edit"}
				</button>
			</div>
		{/if}

		{#if !data.services?.length}
			<div class="empty">
				{#if data.user}
					<p>No services configured yet.</p>
					<button
						type="button"
						class="add-link"
						onclick={() => openCreateModal()}
						>Add your first service</button
					>
				{:else}
					<p>No public services available.</p>
					<p class="login-hint">
						<a href="/login">Log in</a> to manage services.
					</p>
				{/if}
			</div>
		{:else}
			{#if overallUptime !== null}
				<div class="overall-uptime">
					<span class="uptime-label">overall uptime</span>
					<span
						class="uptime-value"
						class:is-success={overallUptime >= 90}
						class:is-warning={overallUptime >= 75 &&
							overallUptime < 90}
						class:is-error={overallUptime < 75}
						>{overallUptime.toFixed(2)}%</span
					>
				</div>
			{/if}
			{#each sortedGroups as group, groupIndex (group.name)}
				{@const services = groupedServices.groups[group.name] || []}
				{#if services.length > 0 || editMode}
					<div class="service-group">
						<div class="group-header">
							{#if editMode}
								<div class="group-reorder">
									<button
										type="button"
										class="reorder-btn"
										disabled={groupIndex === 0}
										onclick={() => moveGroupUp(group.name)}
										title="Move up">&#9650;</button
									>
									<button
										type="button"
										class="reorder-btn"
										disabled={groupIndex ===
											sortedGroups.length - 1}
										onclick={() =>
											moveGroupDown(group.name)}
										title="Move down">&#9660;</button
									>
								</div>
							{/if}
							<a href="/{encodeURIComponent(group.name)}"
								><h2 class="group-title">{group.name}</h2></a
							>
							{#if groupUptime[group.name] !== null && groupUptime[group.name] !== undefined}
								<span
									class="group-uptime"
									class:is-success={groupUptime[
										group.name
									]! >= 90}
									class:is-warning={groupUptime[
										group.name
									]! >= 75 && groupUptime[group.name]! < 90}
									class:is-error={groupUptime[group.name]! <
										75}
									>{groupUptime[group.name]?.toFixed(
										2,
									)}%</span
								>
							{/if}
						</div>
						<div
							class="services-list"
							ondragover={(e) => {
								if (draggedService) {
									e.preventDefault();
								}
							}}
							ondrop={(e) =>
								handleServiceDrop(e, null, group.name)}
							role="list"
						>
							{#each services as service (service.id)}
								{@const check = checks[service.id]}
								{@const serviceUptime =
									data.uptime?.[service.id]}
								<div
									class="service-card"
									class:dragging={draggedService?.id ===
										service.id}
									draggable={editMode}
									ondragstart={(e) =>
										handleServiceDragStart(e, service)}
									ondragend={handleServiceDragEnd}
									ondragover={(e) => {
										if (
											draggedService &&
											draggedService.id !== service.id
										)
											e.preventDefault();
									}}
									ondrop={(e) =>
										handleServiceDrop(
											e,
											service,
											group.name,
										)}
									onclick={() => openServiceDetail(service)}
									onkeydown={(e) =>
										e.key === "Enter" &&
										openServiceDetail(service)}
									role="button"
									tabindex="0"
								>
									<div class="service-status-area">
										{#if serviceUptime && serviceUptime.totalChecks > 0}
											<span
												class="service-uptime"
												class:is-success={serviceUptime.uptimePercent >=
													90}
												class:is-warning={serviceUptime.uptimePercent >=
													75 &&
													serviceUptime.uptimePercent <
														90}
												class:is-error={serviceUptime.uptimePercent <
													75}
												>{serviceUptime.uptimePercent.toFixed(
													1,
												)}%</span
											>
										{/if}
										<span
											class="service-status"
											class:success={check?.success}
											class:error={check &&
												!check.success}
											class:pending={!check}
										></span>
									</div>
									<div class="service-info">
										<div class="service-header">
											<h3>{service.name}</h3>
											{#if data.user && !service.isPublic}
												<span
													class="visibility-badge private"
													>private</span
												>
											{/if}
										</div>
										<a
											href={service.displayUrl ||
												service.url}
											target="_blank"
											rel="noopener noreferrer"
											class="url"
											onclick={(e) => e.stopPropagation()}
											>{service.displayUrl ||
												service.url}</a
										>
										<div class="meta">
											{#if check}
												<span class="response-time"
													>{formatTime(
														check.responseTime,
													)}</span
												>
												<span
													class="status-code"
													class:success={check.success}
													class:error={!check.success}
													>{check.statusCode ??
														"error"}</span
												>
												<span class="last-check"
													>checked {formatDate(
														check.checkedAt,
													)}</span
												>
											{:else}
												<span class="pending-text"
													>pending first check</span
												>
											{/if}
										</div>
										{#if service.description}
											{#if service.description.startsWith("http://") || service.description.startsWith("https://")}
												<a
													href={service.description}
													target="_blank"
													rel="noopener noreferrer"
													class="description description-link"
													onclick={(e) =>
														e.stopPropagation()}
													>{service.description}</a
												>
											{:else}
												<p class="description">
													{service.description}
												</p>
											{/if}
										{/if}
									</div>
									{#if editMode}
										<div class="service-actions">
											<button
												type="button"
												class="btn sm"
												onclick={(e) => {
													e.stopPropagation();
													editingService = service;
												}}>edit</button
											>
											<form
												method="POST"
												action="?/delete"
												class="action-form"
												use:enhance
											>
												<input
													type="hidden"
													name="id"
													value={service.id}
												/>
												<button
													type="submit"
													class="btn sm danger"
													onclick={(e) =>
														e.stopPropagation()}
													>delete</button
												>
											</form>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						{#if editMode}
							<button
								type="button"
								class="btn add-service-btn"
								onclick={() => openCreateModal(group.name)}
							>
								+ add service to {group.name}
							</button>
						{/if}
					</div>
				{/if}
			{/each}

			{#if groupedServices.ungrouped.length > 0 || editMode}
				<div
					class="services-list"
					class:has-groups={Object.keys(groupedServices.groups)
						.length > 0}
					ondragover={(e) => {
						if (draggedService) {
							e.preventDefault();
						}
					}}
					ondrop={(e) => handleServiceDrop(e, null, null)}
					role="list"
				>
					{#each groupedServices.ungrouped as service (service.id)}
						{@const check = checks[service.id]}
						{@const serviceUptime = data.uptime?.[service.id]}
						<div
							class="service-card"
							class:dragging={draggedService?.id === service.id}
							draggable={editMode}
							ondragstart={(e) =>
								handleServiceDragStart(e, service)}
							ondragend={handleServiceDragEnd}
							ondragover={(e) => {
								if (
									draggedService &&
									draggedService.id !== service.id
								)
									e.preventDefault();
							}}
							ondrop={(e) => handleServiceDrop(e, service, null)}
							onclick={() => openServiceDetail(service)}
							onkeydown={(e) =>
								e.key === "Enter" && openServiceDetail(service)}
							role="button"
							tabindex="0"
						>
							<div class="service-status-area">
								{#if serviceUptime && serviceUptime.totalChecks > 0}
									<span
										class="service-uptime"
										class:is-success={serviceUptime.uptimePercent >=
											90}
										class:is-warning={serviceUptime.uptimePercent >=
											75 &&
											serviceUptime.uptimePercent < 90}
										class:is-error={serviceUptime.uptimePercent <
											75}
										>{serviceUptime.uptimePercent.toFixed(
											1,
										)}%</span
									>
								{/if}
								<span
									class="service-status"
									class:success={check?.success}
									class:error={check && !check.success}
									class:pending={!check}
								></span>
							</div>
							<div class="service-info">
								<div class="service-header">
									<h3>{service.name}</h3>
									{#if data.user && !service.isPublic}
										<span class="visibility-badge private"
											>private</span
										>
									{/if}
								</div>
								<a
									href={service.displayUrl || service.url}
									target="_blank"
									rel="noopener noreferrer"
									class="url"
									onclick={(e) => e.stopPropagation()}
									>{service.displayUrl || service.url}</a
								>
								<div class="meta">
									{#if check}
										<span class="response-time"
											>{formatTime(
												check.responseTime,
											)}</span
										>
										<span
											class="status-code"
											class:success={check.success}
											class:error={!check.success}
											>{check.statusCode ?? "error"}</span
										>
										<span class="last-check"
											>checked {formatDate(
												check.checkedAt,
											)}</span
										>
									{:else}
										<span class="pending-text"
											>pending first check</span
										>
									{/if}
								</div>
								{#if service.description}
									{#if service.description.startsWith("http://") || service.description.startsWith("https://")}
										<a
											href={service.description}
											target="_blank"
											rel="noopener noreferrer"
											class="description description-link"
											onclick={(e) => e.stopPropagation()}
											>{service.description}</a
										>
									{:else}
										<p class="description">
											{service.description}
										</p>
									{/if}
								{/if}
							</div>
							{#if editMode}
								<div class="service-actions">
									<button
										type="button"
										class="btn sm"
										onclick={(e) => {
											e.stopPropagation();
											editingService = service;
										}}>edit</button
									>
									<form
										method="POST"
										action="?/delete"
										class="action-form"
										use:enhance
									>
										<input
											type="hidden"
											name="id"
											value={service.id}
										/>
										<button
											type="submit"
											class="btn sm danger"
											onclick={(e) => e.stopPropagation()}
											>delete</button
										>
									</form>
								</div>
							{/if}
						</div>
					{/each}
				</div>
				{#if editMode}
					<button
						type="button"
						class="btn add-service-btn"
						onclick={() => openCreateModal(null)}
					>
						+ add service
					</button>
				{/if}
			{/if}
		{/if}
	</main>
</div>

{#if selectedService}
	<div
		class="modal-overlay"
		onclick={closeModal}
		onkeydown={(e) => e.key === "Escape" && closeModal()}
		role="presentation"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<div class="modal-title">
					<h2>{selectedService.name}</h2>
					<span
						class="modal-status"
						class:success={checks[selectedService.id]?.success}
						class:error={checks[selectedService.id] &&
							!checks[selectedService.id]?.success}
					>
						{checks[selectedService.id]?.success
							? "operational"
							: "degraded"}
					</span>
				</div>
				<button type="button" class="modal-close" onclick={closeModal}
					>&times;</button
				>
			</div>

			<div class="modal-body">
				{#if loading}
					<div class="loading">Loading...</div>
				{:else}
					{#if serviceStats}
						<div class="stats-grid">
							<div class="stat">
								<span
									class="stat-value"
									class:is-success={serviceStats.uptimePercent >=
										90}
									>{serviceStats.uptimePercent.toFixed(
										2,
									)}%</span
								>
								<span class="stat-label">uptime (24h)</span>
							</div>
							<div class="stat">
								<span class="stat-value"
									>{formatTime(
										serviceStats.avgResponseTime,
									)}</span
								>
								<span class="stat-label">avg response</span>
							</div>
							<div class="stat">
								<span class="stat-value"
									>{serviceStats.totalChecks}</span
								>
								<span class="stat-label">checks (24h)</span>
							</div>
							<div class="stat">
								<span class="stat-value"
									>{formatTime(serviceStats.minResponseTime)} -
									{formatTime(
										serviceStats.maxResponseTime,
									)}</span
								>
								<span class="stat-label">response range</span>
							</div>
						</div>
					{/if}

					{#if serviceChecks.length > 1}
						<div class="graph-section">
							<h3>
								Response Time ({serviceChecks.length} checks)
							</h3>
							<div class="graph-wrapper">
								<div class="y-axis">
									{#each graphData.yLabels as label}
										<span style="top: {label.y}%"
											>{label.label}</span
										>
									{/each}
								</div>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="graph-container"
									onmouseleave={() => (hoveredPoint = null)}
								>
									<svg
										viewBox="0 0 100 100"
										preserveAspectRatio="none"
										class="graph"
									>
										<line
											x1="0"
											y1="10"
											x2="100"
											y2="10"
											class="grid-line"
										/>
										<line
											x1="0"
											y1="30"
											x2="100"
											y2="30"
											class="grid-line"
										/>
										<line
											x1="0"
											y1="50"
											x2="100"
											y2="50"
											class="grid-line"
										/>
										<line
											x1="0"
											y1="70"
											x2="100"
											y2="70"
											class="grid-line"
										/>
										<line
											x1="0"
											y1="90"
											x2="100"
											y2="90"
											class="grid-line"
										/>
										<line
											x1="0"
											y1="0"
											x2="0"
											y2="100"
											class="grid-line"
										/>
										<line
											x1="25"
											y1="0"
											x2="25"
											y2="100"
											class="grid-line"
										/>
										<line
											x1="50"
											y1="0"
											x2="50"
											y2="100"
											class="grid-line"
										/>
										<line
											x1="75"
											y1="0"
											x2="75"
											y2="100"
											class="grid-line"
										/>
										<line
											x1="100"
											y1="0"
											x2="100"
											y2="100"
											class="grid-line"
										/>
										<polygon
											fill="var(--color-accent-muted)"
											opacity="0.3"
											points={`0,100 ${graphData.points.map((p) => `${p.x},${p.y}`).join(" ")} 100,100`}
										/>
										<polyline
											fill="none"
											stroke="var(--color-accent)"
											stroke-width="0.5"
											stroke-linejoin="round"
											points={graphData.points
												.map((p) => `${p.x},${p.y}`)
												.join(" ")}
										/>
										{#each graphData.points as point}
											<circle
												cx={point.x}
												cy={point.y}
												r="1.5"
												fill={point.check.success
													? "var(--color-success)"
													: "var(--color-error)"}
												class="data-point"
												role="img"
												onmouseenter={() =>
													(hoveredPoint = {
														check: point.check,
														x: point.x,
														y: point.y,
													})}
											/>
										{/each}
									</svg>

									{#if hoveredPoint}
										{@const showBelow = hoveredPoint.y < 30}
										{@const alignLeft = hoveredPoint.x > 80}
										{@const alignRight =
											hoveredPoint.x < 20}
										<div
											class="graph-tooltip"
											class:below={showBelow}
											class:align-left={alignLeft}
											class:align-right={alignRight}
											style="left: {hoveredPoint.x}%; top: {hoveredPoint.y}%"
										>
											<div class="tooltip-time">
												{formatDate(
													hoveredPoint.check
														.checkedAt,
												)}
											</div>
											<div class="tooltip-response">
												<span class="tooltip-label"
													>Response:</span
												>
												<span class="tooltip-value"
													>{formatTime(
														hoveredPoint.check
															.responseTime,
													)}</span
												>
											</div>
											<div class="tooltip-status">
												<span class="tooltip-label"
													>Status:</span
												>
												<span
													class="tooltip-value"
													class:success={hoveredPoint
														.check.success}
													class:error={!hoveredPoint
														.check.success}
												>
													{hoveredPoint.check
														.statusCode ?? "error"}
												</span>
											</div>
											{#if hoveredPoint.check.errorMessage}
												<div class="tooltip-error">
													{hoveredPoint.check
														.errorMessage}
												</div>
											{/if}
										</div>
									{/if}
								</div>
								<div class="x-axis">
									{#each graphData.timeLabels as label}
										<span style="left: {label.x}%"
											>{label.label}</span
										>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					<div class="checks-section">
						<h3>Recent Checks</h3>
						<div class="checks-list">
							{#each serviceChecks.slice(0, 20) as check}
								<div
									class="check-item"
									class:success={check.success}
									class:error={!check.success}
								>
									<span class="check-status-dot"></span>
									<span class="check-time"
										>{formatShortTime(
											check.checkedAt,
										)}</span
									>
									<span class="check-response"
										>{formatTime(check.responseTime)}</span
									>
									<span class="check-code"
										>{check.statusCode ?? "err"}</span
									>
									{#if check.errorMessage}
										<span class="check-error"
											>{check.errorMessage}</span
										>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<div class="info-section">
						<h3>Service Info</h3>
						<dl class="info-list">
							<dt>URL</dt>
							<dd>
								<a
									href={selectedService.displayUrl ||
										selectedService.url}
									target="_blank"
									rel="noopener noreferrer"
									>{selectedService.displayUrl ||
										selectedService.url}</a
								>
							</dd>
							{#if selectedService.displayUrl}
								<dt>Check URL</dt>
								<dd>
									<a
										href={selectedService.url}
										target="_blank"
										rel="noopener noreferrer"
										>{selectedService.url}</a
									>
								</dd>
							{/if}
							{#if selectedService.description}
								<dt>Description</dt>
								<dd>{selectedService.description}</dd>
							{/if}
							<dt>Expected Status</dt>
							<dd>{selectedService.expectedStatus}</dd>
							<dt>Check Interval</dt>
							<dd>{selectedService.checkInterval}s</dd>
						</dl>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if editingService}
	<div
		class="modal-overlay"
		onclick={closeEditModal}
		onkeydown={(e) => e.key === "Escape" && closeEditModal()}
		role="presentation"
	>
		<div
			class="modal edit-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>edit service</h2>
				<button
					type="button"
					class="modal-close"
					onclick={closeEditModal}>&times;</button
				>
			</div>

			{#if form?.editError}
				<div class="error-message">{form.editError}</div>
			{/if}

			<form
				method="POST"
				action="?/edit"
				class="form"
				use:enhance={handleFormResult}
			>
				<input type="hidden" name="id" value={editingService.id} />

				<div class="form-group">
					<input
						type="text"
						id="edit-name"
						name="name"
						placeholder=" "
						value={editingService.name}
						required
					/>
					<label for="edit-name">Service Name</label>
				</div>

				<div class="form-group">
					<input
						type="url"
						id="edit-url"
						name="url"
						placeholder=" "
						value={editingService.url}
						required
					/>
					<label for="edit-url">Check URL</label>
				</div>

				<div class="form-group">
					<input
						type="text"
						id="edit-displayUrl"
						name="displayUrl"
						placeholder=" "
						value={editingService.displayUrl ?? ""}
					/>
					<label for="edit-displayUrl">Display URL (optional)</label>
				</div>

				<div class="form-group">
					<input
						type="text"
						id="edit-description"
						name="description"
						placeholder=" "
						value={editingService.description ?? ""}
					/>
					<label for="edit-description">Description (optional)</label>
				</div>

				<div class="form-row">
					<div class="form-group">
						<input
							type="number"
							id="edit-expectedStatus"
							name="expectedStatus"
							value={editingService.expectedStatus}
							min="100"
							max="599"
							required
						/>
						<label for="edit-expectedStatus">Expected Status</label>
					</div>

					<div class="form-group">
						<input
							type="number"
							id="edit-checkInterval"
							name="checkInterval"
							value={editingService.checkInterval}
							min="10"
							max="3600"
							required
						/>
						<label for="edit-checkInterval">Interval (sec)</label>
					</div>
				</div>

				<div class="form-group">
					<input
						type="text"
						id="edit-groupName"
						name="groupName"
						placeholder=" "
						value={editingService.groupName ?? ""}
					/>
					<label for="edit-groupName">Group (optional)</label>
				</div>

				<div class="form-group checkbox-group">
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="enabled"
							checked={editingService.enabled}
						/>
						<span>Enable monitoring</span>
					</label>
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="isPublic"
							checked={editingService.isPublic}
						/>
						<span>Public (visible to everyone)</span>
					</label>
				</div>

				<div class="form-actions">
					<button type="button" class="btn" onclick={closeEditModal}
						>cancel</button
					>
					<button type="submit" class="btn primary"
						>save changes</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if creatingService}
	<div
		class="modal-overlay"
		onclick={closeCreateModal}
		onkeydown={(e) => e.key === "Escape" && closeCreateModal()}
		role="presentation"
	>
		<div
			class="modal edit-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>add service</h2>
				<button
					type="button"
					class="modal-close"
					onclick={closeCreateModal}>&times;</button
				>
			</div>

			{#if form?.createError}
				<div class="error-message">{form.createError}</div>
			{/if}

			<form
				method="POST"
				action="?/create"
				class="form"
				use:enhance={handleFormResult}
			>
				<div class="form-group">
					<input
						type="text"
						id="create-name"
						name="name"
						placeholder=" "
						required
					/>
					<label for="create-name">Service Name</label>
				</div>

				<div class="form-group">
					<input
						type="url"
						id="create-url"
						name="url"
						placeholder=" "
						required
					/>
					<label for="create-url">Check URL</label>
				</div>

				<div class="form-group">
					<input
						type="text"
						id="create-displayUrl"
						name="displayUrl"
						placeholder=" "
					/>
					<label for="create-displayUrl">Display URL (optional)</label
					>
				</div>

				<div class="form-group">
					<input
						type="text"
						id="create-description"
						name="description"
						placeholder=" "
					/>
					<label for="create-description"
						>Description (optional)</label
					>
				</div>

				<div class="form-row">
					<div class="form-group">
						<input
							type="number"
							id="create-expectedStatus"
							name="expectedStatus"
							value="200"
							min="100"
							max="599"
							required
						/>
						<label for="create-expectedStatus"
							>Expected Status</label
						>
					</div>

					<div class="form-group">
						<input
							type="number"
							id="create-checkInterval"
							name="checkInterval"
							value="60"
							min="10"
							max="3600"
							required
						/>
						<label for="create-checkInterval">Interval (sec)</label>
					</div>
				</div>

				<div class="form-group">
					<input
						type="text"
						id="create-groupName"
						name="groupName"
						placeholder=" "
						value={creatingInGroup ?? ""}
					/>
					<label for="create-groupName">Group (optional)</label>
				</div>

				<div class="form-group checkbox-group">
					<label class="checkbox-label">
						<input type="checkbox" name="enabled" checked />
						<span>Enable monitoring</span>
					</label>
					<label class="checkbox-label">
						<input type="checkbox" name="isPublic" />
						<span>Public (visible to everyone)</span>
					</label>
				</div>

				<div class="form-actions">
					<button type="button" class="btn" onclick={closeCreateModal}
						>cancel</button
					>
					<button type="submit" class="btn primary"
						>add service</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
