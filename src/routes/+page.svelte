<script lang="ts">
import {
	type Service,
	type ServiceCheck,
	type ServiceStats,
	UserMenu,
} from "$lib";
import type { PageData } from "./$types";

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
		const response = await fetch(`/api/services/${service.id}`);
		if (response.ok) {
			const data = await response.json();
			serviceChecks = data.checks;
			serviceStats = data.stats;
		}
	} catch (err) {
		console.error("Failed to load service details:", err);
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
		{#if data.services.length === 0}
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
									{#if service.description}
										<p class="description">{service.description}</p>
									{/if}
									<span class="url">{service.url}</span>
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
								{#if service.description}
									<p class="description">{service.description}</p>
								{/if}
								<span class="url">{service.url}</span>
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
							<dd><a href={selectedService.url} target="_blank" rel="noopener noreferrer">{selectedService.url}</a></dd>
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

<style>
	.login-link {
		padding: var(--spacing-xs) var(--spacing-sm);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		text-decoration: none;
		transition: all var(--transition-fast);
	}

	.login-link:hover {
		border-color: var(--color-border-hover);
		color: var(--color-text);
	}

	.empty {
		text-align: center;
		padding: var(--spacing-2xl);
		color: var(--color-text-secondary);
	}

	.login-hint {
		margin-top: var(--spacing-sm);
		font-size: var(--text-sm);
	}

	.login-hint a {
		color: var(--color-accent);
	}

	.add-link {
		color: var(--color-accent);
		text-decoration: none;
	}

	.add-link:hover {
		text-decoration: underline;
	}

	.service-group {
		margin-bottom: var(--spacing-xl);
	}

	.group-title {
		margin: 0 0 var(--spacing-md);
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text-secondary);
		text-transform: lowercase;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: var(--spacing-sm);
	}

	.services-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.services-list.has-groups {
		margin-top: var(--spacing-xl);
	}

	.service-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		border: 1px solid var(--color-border);
		background: var(--color-bg-elevated);
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition: all var(--transition-fast);
	}

	.service-card:hover {
		border-color: var(--color-border-hover);
		background: var(--color-bg-hover);
	}

	.service-status {
		position: absolute;
		top: var(--spacing-sm);
		right: var(--spacing-sm);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-text-muted);
		animation: pulse 2s ease-in-out infinite;
	}

	.service-status.success {
		background: var(--color-success);
	}

	.service-status.error {
		background: var(--color-error);
	}

	.service-status.pending {
		background: var(--color-warning);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.service-info {
		flex: 1;
	}

	.service-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-xs);
	}

	.service-header h3 {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text);
	}

	.visibility-badge {
		font-size: var(--text-xs);
		padding: 2px 6px;
		border-radius: 2px;
		text-transform: lowercase;
	}

	.visibility-badge.private {
		background: var(--color-bg-hover);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}

	.service-info .description {
		margin: 0 0 var(--spacing-xs);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.service-info .url {
		display: block;
		margin: 0 0 var(--spacing-sm);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-family: monospace;
	}

	.meta {
		display: flex;
		gap: var(--spacing-md);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}

	.meta .response-time {
		color: var(--color-text-secondary);
	}

	.meta .status-code {
		font-weight: var(--font-medium);
	}

	.meta .status-code.success {
		color: var(--color-success);
	}

	.meta .status-code.error {
		color: var(--color-error);
	}

	.meta .pending-text {
		color: var(--color-warning);
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--spacing-lg);
	}

	.modal {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		width: 100%;
		max-width: 700px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md) var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg-elevated);
	}

	.modal-title {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.modal-title h2 {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
	}

	.modal-status {
		font-size: var(--text-xs);
		padding: 2px 8px;
		border-radius: 2px;
		text-transform: lowercase;
	}

	.modal-status.success {
		background: var(--color-success-bg);
		color: var(--color-success);
		border: 1px solid var(--color-success-border);
	}

	.modal-status.error {
		background: var(--color-error-bg);
		color: var(--color-error);
		border: 1px solid var(--color-error-border);
	}

	.modal-close {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--text-lg);
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.modal-close:hover {
		border-color: var(--color-text);
		color: var(--color-text);
	}

	.modal-body {
		padding: var(--spacing-lg);
	}

	.loading {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--color-text-muted);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
	}

	.stat {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		padding: var(--spacing-md);
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--color-text);
	}

	.stat-value.success {
		color: var(--color-success);
	}

	.stat-label {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		text-transform: lowercase;
	}

	.graph-section {
		margin-bottom: var(--spacing-lg);
	}

	.graph-section h3 {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-text-secondary);
		text-transform: lowercase;
	}

	.graph-wrapper {
		display: grid;
		grid-template-columns: 60px 1fr;
		grid-template-rows: 1fr 24px;
		gap: 4px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		padding: var(--spacing-md);
		overflow: hidden;
	}

	.y-axis {
		position: relative;
		grid-row: 1;
		grid-column: 1;
	}

	.y-axis span {
		position: absolute;
		right: var(--spacing-xs);
		transform: translateY(-50%);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.graph-container {
		position: relative;
		grid-row: 1;
		grid-column: 2;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
	}

	.graph {
		width: 100%;
		height: 180px;
		display: block;
	}

	.grid-line {
		stroke: var(--color-border);
		stroke-width: 0.15;
	}

	.data-point {
		cursor: pointer;
		transition: r 0.1s ease;
	}

	.data-point:hover {
		r: 2.5;
	}

	.x-axis {
		position: relative;
		grid-row: 2;
		grid-column: 2;
	}

	.x-axis span {
		position: absolute;
		transform: translateX(-50%);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.x-axis span:first-child {
		transform: translateX(0);
	}

	.x-axis span:last-child {
		transform: translateX(-100%);
	}

	.graph-tooltip {
		position: absolute;
		transform: translate(-50%, -100%);
		margin-top: -10px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		padding: var(--spacing-sm);
		z-index: 10;
		pointer-events: none;
		min-width: 150px;
		box-shadow: var(--shadow-md);
	}

	.graph-tooltip.below {
		transform: translate(-50%, 0);
		margin-top: 10px;
	}

	.graph-tooltip.align-left {
		transform: translate(-90%, -100%);
	}

	.graph-tooltip.align-left.below {
		transform: translate(-90%, 0);
	}

	.graph-tooltip.align-right {
		transform: translate(-10%, -100%);
	}

	.graph-tooltip.align-right.below {
		transform: translate(-10%, 0);
	}

	.tooltip-time {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		margin-bottom: var(--spacing-xs);
		border-bottom: 1px solid var(--color-border);
		padding-bottom: var(--spacing-xs);
	}

	.tooltip-response,
	.tooltip-status {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-xs);
		margin-bottom: 2px;
	}

	.tooltip-label {
		color: var(--color-text-muted);
	}

	.tooltip-value {
		color: var(--color-text);
		font-weight: var(--font-medium);
	}

	.tooltip-value.success {
		color: var(--color-success);
	}

	.tooltip-value.error {
		color: var(--color-error);
	}

	.tooltip-error {
		font-size: var(--text-xs);
		color: var(--color-error);
		margin-top: var(--spacing-xs);
		padding-top: var(--spacing-xs);
		border-top: 1px solid var(--color-border);
	}

	.checks-section {
		margin-bottom: var(--spacing-lg);
	}

	.checks-section h3 {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-text-secondary);
		text-transform: lowercase;
	}

	.checks-list {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		max-height: 200px;
		overflow-y: auto;
	}

	.check-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-bottom: 1px solid var(--color-border);
		font-size: var(--text-xs);
	}

	.check-item:last-child {
		border-bottom: none;
	}

	.check-status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.check-item.success .check-status-dot {
		background: var(--color-success);
	}

	.check-item.error .check-status-dot {
		background: var(--color-error);
	}

	.check-time {
		color: var(--color-text-muted);
		min-width: 50px;
	}

	.check-response {
		color: var(--color-text-secondary);
		min-width: 60px;
	}

	.check-code {
		font-weight: var(--font-medium);
		min-width: 30px;
	}

	.check-item.success .check-code {
		color: var(--color-success);
	}

	.check-item.error .check-code {
		color: var(--color-error);
	}

	.check-error {
		color: var(--color-error);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.info-section h3 {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-text-secondary);
		text-transform: lowercase;
	}

	.info-list {
		margin: 0;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		padding: var(--spacing-md);
	}

	.info-list dt {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		text-transform: lowercase;
	}

	.info-list dd {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--text-sm);
		color: var(--color-text);
		font-family: monospace;
	}

	.info-list dd:last-child {
		margin-bottom: 0;
	}

	.info-list dd a {
		color: var(--color-accent);
		text-decoration: none;
	}

	.info-list dd a:hover {
		text-decoration: underline;
	}
</style>
