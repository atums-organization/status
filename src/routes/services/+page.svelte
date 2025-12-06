<script lang="ts">
import { type Service, UserMenu } from "$lib";
import type { ActionData, PageData } from "./$types";
import "./page.css";

const { data, form }: { data: PageData; form: ActionData } = $props();

let editingService = $state<Service | null>(null);

function formatTime(ms: number | null): string {
	if (ms === null) return "-";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(date: string): string {
	return new Date(date).toLocaleString();
}

function openEditModal(service: Service) {
	editingService = service;
}

function closeEditModal() {
	editingService = null;
}

$effect(() => {
	if (form?.edited) {
		editingService = null;
	}
});
</script>

<div class="container">
	<header class="header">
		<h1><span class="brand">atums</span>/status</h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			<a href="/services" class="nav-link active">services</a>
		</nav>
		<UserMenu user={data.user} />
	</header>

	<main class="main centered">
		<div class="page-header">
			<a href="/services/new" class="btn primary">add service</a>
		</div>

		{#if data.services.length === 0}
			<div class="empty">
				<p>No services configured yet.</p>
				<a href="/services/new" class="add-link"
					>Add your first service</a
				>
			</div>
		{:else}
			<div class="services-list">
				{#each data.services as service}
					{@const check = data.checks[service.id]}
					<div class="service-card">
						<span
							class="service-status"
							class:success={check?.success}
							class:error={check && !check.success}
							class:pending={!check}
						></span>
						<div class="service-info">
							<h3>{service.name}</h3>
							{#if service.description}
								<p class="description">{service.description}</p>
							{/if}
							<a
								href={service.url}
								target="_blank"
								rel="noopener noreferrer"
								class="url">{service.url}</a
							>
							<div class="meta">
								{#if check}
									<span class="response-time"
										>{formatTime(check.responseTime)}</span
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
						</div>
						<div class="service-actions">
							<form
								method="POST"
								action="?/check"
								class="action-form"
							>
								<input
									type="hidden"
									name="id"
									value={service.id}
								/>
								<button type="submit" class="btn sm"
									>check</button
								>
							</form>
							<button
								type="button"
								class="btn sm"
								onclick={() => openEditModal(service)}
								>edit</button
							>
							<form
								method="POST"
								action="?/delete"
								class="action-form"
							>
								<input
									type="hidden"
									name="id"
									value={service.id}
								/>
								<button type="submit" class="btn sm danger"
									>delete</button
								>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if editingService}
	<div
		class="modal-overlay"
		onclick={closeEditModal}
		onkeydown={(e) => e.key === "Escape" && closeEditModal()}
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

			<form method="POST" action="?/edit" class="form">
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
					<label for="edit-url">URL</label>
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
