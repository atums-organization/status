<script lang="ts">
import {
	type Service,
	type ServiceCheck,
	type ServiceStats,
	UserMenu,
	formatDateTime,
	formatDate as formatDateUtil,
	formatShortTime as formatShortTimeUtil,
	formatResponseTime,
} from "$lib";
import { createSSEConnection } from "$lib/sse";
import type { PageData } from "./$types";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { onMount } from "svelte";
import "./page.css";

const { data }: { data: PageData } = $props();

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
	if (selectedService) {
		document.body.style.overflow = "hidden";
	} else {
		document.body.style.overflow = "";
	}
});

$effect(() => {
	const modalParam = page.url.searchParams.get("modal");
	if (modalParam) {
		if (!selectedService || selectedService.id !== modalParam) {
			const service = data.services?.find((s) => s.id === modalParam);
			if (service) {
				openServiceDetail(service, false);
			} else {
				goto(`/${data.groupName}`, { replaceState: true, noScroll: true });
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

const canonicalUrl = $derived(
	data.embed.siteUrl ? `${data.embed.siteUrl}/${encodeURIComponent(data.groupName)}` : undefined,
);

let selectedService = $state<Service | null>(null);
let serviceChecks = $state<ServiceCheck[]>([]);
let serviceStats = $state<ServiceStats | null>(null);
let loading = $state(false);
let showRecentEvents = $state(false);

const overallUptime = $derived.by(() => {
	const uptime = data.uptime || {};
	const services = data.services || [];
	if (services.length === 0) return null;

	const values = services
		.map((s) => uptime[s.id])
		.filter((u) => u && u.totalChecks > 0);

	if (values.length === 0) return null;

	const avg = values.reduce((sum, u) => sum + u.uptimePercent, 0) / values.length;
	return Math.round(avg * 100) / 100;
});

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

function formatEventDate(date: string): string {
	return formatDateUtil(date);
}

function getEventTypeClass(type: string): string {
	switch (type) {
		case "incident": return "event-incident";
		case "maintenance": return "event-maintenance";
		default: return "event-info";
	}
}

async function openServiceDetail(service: Service, updateUrl = true) {
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
	goto(`/${data.groupName}`, { replaceState: false, noScroll: true });
}

let hoveredPoint = $state<{
	check: ServiceCheck;
	x: number;
	y: number;
} | null>(null);

let isMobile = $state(false);

onMount(() => {
	const checkMobile = () => {
		isMobile = window.innerWidth < 600;
	};
	checkMobile();
	window.addEventListener("resize", checkMobile);
	return () => window.removeEventListener("resize", checkMobile);
});

const graphData = $derived(() => {
	if (serviceChecks.length === 0)
		return { points: [], maxTime: 0, minTime: 0, timeLabels: [], yLabels: [] };

	const maxPoints = isMobile ? 20 : 50;
	const allChecks = [...serviceChecks].reverse();
	const step = allChecks.length > maxPoints ? Math.ceil(allChecks.length / maxPoints) : 1;
	const reversed = allChecks.filter((_, i) => i % step === 0);
	const times = reversed.map((c) => c.responseTime ?? 0);
	const maxTime = Math.max(...times);
	const minTime = Math.min(...times);
	const padding = 10;

	const getY = (responseTime: number) => {
		if (maxTime === minTime) return 50;
		return (
			padding +
			((maxTime - responseTime) / (maxTime - minTime)) * (100 - padding * 2)
		);
	};

	const timeLabels: { x: number; label: string }[] = [];
	if (reversed.length > 0) {
		const first = reversed[0];
		const last = reversed[reversed.length - 1];
		const mid = reversed[Math.floor(reversed.length / 2)];

		timeLabels.push({ x: 0, label: formatGraphDate(first.checkedAt) });
		if (reversed.length > 2) {
			timeLabels.push({ x: 50, label: formatGraphDate(mid.checkedAt) });
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
		<h1><a href="/" class="brand-link"><span class="brand">{data.site.brand}</span>{data.site.suffix}</a></h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			{#if data.site.sourceUrl}
				<a href={data.site.sourceUrl} target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
			{/if}
			{#if data.site.discordUrl}
				<a href={data.site.discordUrl} target="_blank" rel="noopener noreferrer" class="nav-link">discord</a>
			{/if}
		</nav>
		{#if data.user}
			<UserMenu user={data.user} />
		{:else}
			<a href="/login" class="login-link">login</a>
		{/if}
	</header>

	<main class="main centered">
		{#if overallUptime !== null}
			<div class="overall-uptime">
				<span class="uptime-label">group uptime</span>
				<span
					class="uptime-value"
					class:is-success={overallUptime >= 90}
					class:is-warning={overallUptime >= 75 && overallUptime < 90}
					class:is-error={overallUptime < 75}
				>{overallUptime.toFixed(2)}%</span>
			</div>
		{/if}

		<div class="page-header">
			<h2 class="page-title">{data.groupName}</h2>
			<div class="page-actions">
				{#if data.recentEvents.length > 0}
					<button
						type="button"
						class="btn sm"
						class:active={showRecentEvents}
						onclick={() => showRecentEvents = !showRecentEvents}
					>
						{showRecentEvents ? "hide" : "show"} events ({data.recentEvents.length})
					</button>
				{/if}
				<a href="/" class="back-link">view all</a>
			</div>
		</div>

		{#if data.activeEvents.length > 0}
			<div class="active-events">
				{#each data.activeEvents as event}
					<div class="event-banner {getEventTypeClass(event.type)}">
						<div class="event-header">
							<span class="event-type">{event.type}</span>
							<span class="event-status">{event.status}</span>
						</div>
						<h3 class="event-title">{event.title}</h3>
						{#if event.description}
							<p class="event-description">{event.description}</p>
						{/if}
						<span class="event-date">started {formatEventDate(event.startedAt)}</span>
					</div>
				{/each}
			</div>
		{/if}

		{#if showRecentEvents && data.recentEvents.length > 0}
			<div class="recent-events">
				<h3>recent events</h3>
				<div class="events-list">
					{#each data.recentEvents as event}
						<div class="event-item {getEventTypeClass(event.type)}" class:resolved={event.status === "resolved"}>
							<div class="event-item-header">
								<span class="event-type">{event.type}</span>
								<span class="event-status">{event.status}</span>
								<span class="event-date">{formatEventDate(event.startedAt)}</span>
							</div>
							<h4 class="event-title">{event.title}</h4>
							{#if event.description}
								<p class="event-description">{event.description}</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="services-list">
			{#each data.services as service}
				{@const check = checks[service.id]}
				{@const serviceUptime = data.uptime?.[service.id]}
				<div
					class="service-card"
					onclick={() => openServiceDetail(service)}
					onkeydown={(e) => e.key === "Enter" && openServiceDetail(service)}
					role="button"
					tabindex="0"
				>
					{#if serviceUptime && serviceUptime.totalChecks > 0}
						<span
							class="service-uptime"
							class:is-success={serviceUptime.uptimePercent >= 90}
							class:is-warning={serviceUptime.uptimePercent >= 75 && serviceUptime.uptimePercent < 90}
							class:is-error={serviceUptime.uptimePercent < 75}
						>{serviceUptime.uptimePercent.toFixed(1)}%</span>
					{/if}
					<div class="service-info">
						<div class="service-header">
							<h3>{service.name}</h3>
							{#if data.user && !service.isPublic}
								<span class="visibility-badge private">private</span>
							{/if}
						</div>
						<a
							href={service.displayUrl || service.url}
							target="_blank"
							rel="noopener noreferrer"
							class="url"
							onclick={(e) => e.stopPropagation()}
						>{service.displayUrl || service.url}</a>
						<div class="meta">
							{#if check}
								<span class="response-time">{formatTime(check.responseTime)}</span>
								<span
									class="status-code"
									class:success={check.success}
									class:error={!check.success}
								>{check.statusCode ?? "error"}</span>
								<span class="last-check">checked {formatDate(check.checkedAt)}</span>
							{:else}
								<span class="pending-text">pending first check</span>
							{/if}
						</div>
						{#if service.description}
							{#if service.description.startsWith('http://') || service.description.startsWith('https://')}
								<a
									href={service.description}
									target="_blank"
									rel="noopener noreferrer"
									class="description description-link"
									onclick={(e) => e.stopPropagation()}
								>{service.description}</a>
							{:else}
								<p class="description">{service.description}</p>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		</div>
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
						class:error={checks[selectedService.id] && !checks[selectedService.id]?.success}
					>
						{checks[selectedService.id]?.success ? "operational" : "degraded"}
					</span>
				</div>
				<button type="button" class="modal-close" onclick={closeModal}>&times;</button>
			</div>

			<div class="modal-body">
				{#if loading}
					<div class="loading">Loading...</div>
				{:else}
					{#if serviceStats}
						<div class="stats-grid">
							<div class="stat">
								<span class="stat-value" class:is-success={serviceStats.uptimePercent >= 90}>{serviceStats.uptimePercent.toFixed(2)}%</span>
								<span class="stat-label">uptime (24h)</span>
							</div>
							<div class="stat">
								<span class="stat-value">{formatTime(serviceStats.avgResponseTime)}</span>
								<span class="stat-label">avg response</span>
							</div>
							<div class="stat">
								<span class="stat-value">{serviceStats.totalChecks}</span>
								<span class="stat-label">checks (24h)</span>
							</div>
							<div class="stat">
								<span class="stat-value">{formatTime(serviceStats.minResponseTime)} - {formatTime(serviceStats.maxResponseTime)}</span>
								<span class="stat-label">response range</span>
							</div>
						</div>
					{/if}

					{#if serviceChecks.length > 1}
						<div class="graph-section">
							<h3>Response Time ({graphData().points.length} checks)</h3>
							<div class="graph-wrapper">
								<div class="y-axis">
									{#each graphData().yLabels as label}
										<span style="top: {label.y}%">{label.label}</span>
									{/each}
								</div>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="graph-container" onmouseleave={() => hoveredPoint = null}>
									<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="graph">
										<line x1="0" y1="10" x2="100" y2="10" class="grid-line" />
										<line x1="0" y1="30" x2="100" y2="30" class="grid-line" />
										<line x1="0" y1="50" x2="100" y2="50" class="grid-line" />
										<line x1="0" y1="70" x2="100" y2="70" class="grid-line" />
										<line x1="0" y1="90" x2="100" y2="90" class="grid-line" />
										<line x1="0" y1="0" x2="0" y2="100" class="grid-line" />
										<line x1="25" y1="0" x2="25" y2="100" class="grid-line" />
										<line x1="50" y1="0" x2="50" y2="100" class="grid-line" />
										<line x1="75" y1="0" x2="75" y2="100" class="grid-line" />
										<line x1="100" y1="0" x2="100" y2="100" class="grid-line" />
										<polygon
											fill="var(--color-accent-muted)"
											opacity="0.3"
											points={`0,100 ${graphData().points.map((p) => `${p.x},${p.y}`).join(" ")} 100,100`}
										/>
										<polyline
											fill="none"
											stroke="var(--color-accent)"
											stroke-width="0.5"
											stroke-linejoin="round"
											points={graphData().points.map((p) => `${p.x},${p.y}`).join(" ")}
										/>
										{#each graphData().points as point}
											<circle
												cx={point.x}
												cy={point.y}
												r="1.5"
												fill={point.check.success ? "var(--color-success)" : "var(--color-error)"}
												class="data-point"
												role="img"
												onmouseenter={() => hoveredPoint = { check: point.check, x: point.x, y: point.y }}
											/>
										{/each}
									</svg>

									{#if hoveredPoint}
										{@const showBelow = hoveredPoint.y < 30}
										{@const alignLeft = hoveredPoint.x > 80}
										{@const alignRight = hoveredPoint.x < 20}
										<div
											class="graph-tooltip"
											class:below={showBelow}
											class:align-left={alignLeft}
											class:align-right={alignRight}
											style="left: {hoveredPoint.x}%; top: {hoveredPoint.y}%"
										>
											<div class="tooltip-time">{formatDate(hoveredPoint.check.checkedAt)}</div>
											<div class="tooltip-response">
												<span class="tooltip-label">Response:</span>
												<span class="tooltip-value">{formatTime(hoveredPoint.check.responseTime)}</span>
											</div>
											<div class="tooltip-status">
												<span class="tooltip-label">Status:</span>
												<span class="tooltip-value" class:success={hoveredPoint.check.success} class:error={!hoveredPoint.check.success}>
													{hoveredPoint.check.statusCode ?? "error"}
												</span>
											</div>
											{#if hoveredPoint.check.errorMessage}
												<div class="tooltip-error">{hoveredPoint.check.errorMessage}</div>
											{/if}
										</div>
									{/if}
								</div>
								<div class="x-axis">
									{#each graphData().timeLabels as label}
										<span style="left: {label.x}%">{label.label}</span>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					<div class="checks-section">
						<h3>Recent Checks</h3>
						<div class="checks-list">
							{#each serviceChecks.slice(0, 20) as check}
								<div class="check-item" class:success={check.success} class:error={!check.success}>
									<span class="check-status-dot"></span>
									<span class="check-time">{formatShortTime(check.checkedAt)}</span>
									<span class="check-response">{formatTime(check.responseTime)}</span>
									<span class="check-code">{check.statusCode ?? "err"}</span>
									{#if check.errorMessage}
										<span class="check-error">{check.errorMessage}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<div class="info-section">
						<h3>Service Info</h3>
						<dl class="info-list">
							<dt>URL</dt>
							<dd><a href={selectedService.displayUrl || selectedService.url} target="_blank" rel="noopener noreferrer">{selectedService.displayUrl || selectedService.url}</a></dd>
							{#if selectedService.displayUrl}
								<dt>Check URL</dt>
								<dd><a href={selectedService.url} target="_blank" rel="noopener noreferrer">{selectedService.url}</a></dd>
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
