<script lang="ts">
import {
	type Service,
	type ServiceCheck,
	type ServiceStats,
	UserMenu,
} from "$lib";
import type { PageData } from "./$types";
import "./page.css";

const { data }: { data: PageData } = $props();

let selectedService = $state<Service | null>(null);
let serviceChecks = $state<ServiceCheck[]>([]);
let serviceStats = $state<ServiceStats | null>(null);
let loading = $state(false);

function formatTime(ms: number | null): string {
	if (ms === null) return "-";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(date: string): string {
	return new Date(date).toLocaleString();
}

function formatShortTime(date: string): string {
	return new Date(date).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

const groupedServices = $derived(() => {
	const groups: Record<string, Service[]> = {};
	const ungrouped: Service[] = [];

	if (!data.services) return { groups, ungrouped };

	for (const service of data.services) {
		if (service.groupName) {
			if (!groups[service.groupName]) {
				groups[service.groupName] = [];
			}
			groups[service.groupName].push(service);
		} else {
			ungrouped.push(service);
		}
	}

	return { groups, ungrouped };
});

async function openServiceDetail(service: Service) {
	selectedService = service;
	loading = true;
	serviceChecks = [];
	serviceStats = null;

	try {
		const [checksRes, statsRes] = await Promise.all([
			fetch(`/api/checks/service/${service.id}?limit=100`),
			fetch(`/api/checks/service/${service.id}/stats`),
		]);

		if (checksRes.ok) {
			const checksData = await checksRes.json();
			serviceChecks = checksData.checks ?? [];
		}
		if (statsRes.ok) {
			const statsData = await statsRes.json();
			serviceStats = statsData.stats ?? null;
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
}

let hoveredPoint = $state<{
	check: ServiceCheck;
	x: number;
	y: number;
} | null>(null);

const graphData = $derived(() => {
	if (serviceChecks.length === 0)
		return { points: [], maxTime: 0, minTime: 0, timeLabels: [], yLabels: [] };

	const reversed = [...serviceChecks].reverse();
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

	if (diffDays === 0) {
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
	if (diffDays === 1) {
		return (
			"Yesterday " +
			d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		);
	}
	return (
		d.toLocaleDateString([], { month: "short", day: "numeric" }) +
		" " +
		d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
	);
}
</script>

<div class="container">
	<header class="header">
		<h1><span class="brand">atums</span>/status</h1>
		<nav class="nav">
			<a href="/" class="nav-link active">index</a>
			{#if data.user}
				<a href="/services" class="nav-link">services</a>
			{/if}
		</nav>
		{#if data.user}
			<UserMenu user={data.user} />
		{:else}
			<a href="/login" class="login-link">login</a>
		{/if}
	</header>

	<main class="main centered">
		{#if !data.services?.length}
			<div class="empty">
				{#if data.user}
					<p>No services configured yet.</p>
					<a href="/services/new" class="add-link">Add your first service</a>
				{:else}
					<p>No public services available.</p>
					<p class="login-hint"><a href="/login">Log in</a> to manage services.</p>
				{/if}
			</div>
		{:else}
			{#each Object.entries(groupedServices().groups) as [groupName, services]}
				<div class="service-group">
					<h2 class="group-title">{groupName}</h2>
					<div class="services-list">
						{#each services as service}
							{@const check = data.checks[service.id]}
							<button
								type="button"
								class="service-card"
								onclick={() => openServiceDetail(service)}
							>
								<span
									class="service-status"
									class:success={check?.success}
									class:error={check && !check.success}
									class:pending={!check}
								></span>
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
							</button>
						{/each}
					</div>
				</div>
			{/each}

			{#if groupedServices().ungrouped.length > 0}
				<div class="services-list" class:has-groups={Object.keys(groupedServices().groups).length > 0}>
					{#each groupedServices().ungrouped as service}
						{@const check = data.checks[service.id]}
						<button
							type="button"
							class="service-card"
							onclick={() => openServiceDetail(service)}
						>
							<span
								class="service-status"
								class:success={check?.success}
								class:error={check && !check.success}
								class:pending={!check}
							></span>
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
						</button>
					{/each}
				</div>
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
						class:success={data.checks[selectedService.id]?.success}
						class:error={data.checks[selectedService.id] && !data.checks[selectedService.id]?.success}
					>
						{data.checks[selectedService.id]?.success ? "operational" : "degraded"}
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
								<span class="stat-value" class:success={serviceStats.uptimePercent >= 99}>{serviceStats.uptimePercent.toFixed(2)}%</span>
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
							<h3>Response Time ({serviceChecks.length} checks)</h3>
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
