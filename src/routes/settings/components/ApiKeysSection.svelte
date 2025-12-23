<script lang="ts">
import { API_SCOPES, notifications } from "$lib";
import type { ApiKey, ApiKeyScope } from "$lib";

let apiKeys = $state<ApiKey[]>([]);
let loading = $state(true);
let showCreate = $state(false);
let newKeyName = $state("");
let newKeyScopes = $state<ApiKeyScope[]>([]);
let newKeyExpiry = $state(getDefaultExpiry());
let createdKey = $state<string | null>(null);
let creating = $state(false);
let confirmInput = $state("");

function getDefaultExpiry(): string {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- not reactive, just calculating a default value
	const date = new Date();
	date.setDate(date.getDate() + 7);
	return date.toISOString().split("T")[0];
}

const confirmSuffix = $derived(createdKey ? createdKey.slice(-8) : "");
const canClose = $derived(confirmInput === confirmSuffix);

async function fetchApiKeys() {
	loading = true;
	try {
		const res = await fetch("/api/api-keys");
		if (res.ok) {
			const json = await res.json();
			apiKeys = json.data?.apiKeys ?? [];
		}
	} catch (err) {
		console.error("Failed to fetch API keys:", err);
	} finally {
		loading = false;
	}
}

async function createKey() {
	if (!newKeyName.trim()) {
		notifications.error("Name is required");
		return;
	}
	if (newKeyScopes.length === 0) {
		notifications.error("Select at least one scope");
		return;
	}

	creating = true;

	try {
		const res = await fetch("/api/api-keys", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: newKeyName.trim(),
				scopes: newKeyScopes,
				expiresAt: newKeyExpiry || null,
			}),
		});

		const json = await res.json();
		if (res.ok) {
			createdKey = json.data.key;
			apiKeys = [json.data.apiKey, ...apiKeys];
			showCreate = false;
		} else {
			notifications.error(json.error || "Failed to create API key");
		}
	} catch {
		notifications.error("Failed to create API key");
	} finally {
		creating = false;
	}
}

async function deleteKey(id: string) {
	if (!confirm("Are you sure you want to delete this API key?")) return;

	try {
		const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
		if (res.ok) {
			apiKeys = apiKeys.filter((k) => k.id !== id);
			notifications.success("API key deleted");
		}
	} catch {
		notifications.error("Failed to delete API key");
	}
}

function toggleScope(scope: ApiKeyScope) {
	if (newKeyScopes.includes(scope)) {
		newKeyScopes = newKeyScopes.filter((s) => s !== scope);
	} else {
		newKeyScopes = [...newKeyScopes, scope];
	}
}

function resetForm() {
	showCreate = false;
	newKeyName = "";
	newKeyScopes = [];
	newKeyExpiry = getDefaultExpiry();
	createdKey = null;
	confirmInput = "";
}

function copyKey() {
	if (createdKey) {
		navigator.clipboard.writeText(createdKey);
		notifications.success("API key copied to clipboard!");
	}
}

function closeModal() {
	if (canClose) {
		resetForm();
	}
}

$effect(() => {
	fetchApiKeys();
});

$effect(() => {
	if (createdKey) {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = "";
			return "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}
});
</script>

{#if createdKey}
	<div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="modal">
			<h3 id="modal-title">api key created</h3>
			<p class="modal-warning">save this key now. you won't be able to see it again!</p>

			<div class="key-display">
				<code>{createdKey}</code>
				<button type="button" class="btn btn-secondary btn-sm" onclick={copyKey}>copy</button>
			</div>

			<div class="confirm-section">
				<label for="confirm-key">type the last 8 characters to confirm you've saved it:</label>
				<div class="confirm-row">
					<code class="confirm-hint">...{confirmSuffix}</code>
					<input
						type="text"
						id="confirm-key"
						bind:value={confirmInput}
						placeholder="last 8 characters"
						maxlength="8"
						autocomplete="off"
					/>
				</div>
			</div>

			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-primary"
					onclick={closeModal}
					disabled={!canClose}
				>
					{canClose ? "done" : "confirm to close"}
				</button>
			</div>
		</div>
	</div>
{/if}

<section class="settings-section">
	<div class="section-header">
		<h3>API Keys</h3>
		{#if !showCreate && !createdKey}
			<button type="button" class="btn btn-secondary" onclick={() => (showCreate = true)}>
				create key
			</button>
		{/if}
	</div>

	{#if showCreate}
		<div class="create-form">
			<div class="form-row">
				<div class="form-group">
					<label for="key-name">name</label>
					<input
						type="text"
						id="key-name"
						bind:value={newKeyName}
						placeholder="e.g. Production Server"
					/>
				</div>

				<div class="form-group">
					<label for="key-expiry">expires</label>
					<input
						type="date"
						id="key-expiry"
						bind:value={newKeyExpiry}
					/>
				</div>
			</div>

			<div class="scopes-section">
				<span class="scope-label">scopes</span>
				<div class="scopes-list">
					{#each API_SCOPES as scope}
						<button
							type="button"
							class="scope-btn"
							class:active={newKeyScopes.includes(scope.value)}
							title={scope.label}
							onclick={() => toggleScope(scope.value)}
						>
							{scope.value}
						</button>
					{/each}
				</div>
			</div>

			<div class="form-actions">
				<button type="button" class="btn btn-secondary" onclick={resetForm}>
					cancel
				</button>
				<button
					type="button"
					class="btn btn-primary"
					onclick={createKey}
					disabled={creating}
				>
					{creating ? "creating..." : "create key"}
				</button>
			</div>
		</div>
	{:else if loading}
		<p class="loading">loading...</p>
	{:else if apiKeys.length === 0}
		<p class="no-keys">no api keys yet. create one to access the api programmatically.</p>
	{:else}
		<div class="api-keys-list">
			{#each apiKeys as key (key.id)}
				<div class="api-key-item">
					<div class="api-key-header">
						<span class="api-key-name">{key.name}</span>
						<code class="api-key-prefix">{key.keyPrefix}</code>
						<button
							type="button"
							class="btn btn-danger btn-sm"
							onclick={() => deleteKey(key.id)}
							aria-label="Delete API key {key.name}"
						>
							delete
						</button>
					</div>
					<div class="api-key-meta">
						<span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
						{#if key.lastUsedAt}
							<span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
						{:else}
							<span>Never used</span>
						{/if}
						{#if key.expiresAt}
							<span class:expired={new Date(key.expiresAt) < new Date()}>
								Expires: {new Date(key.expiresAt).toLocaleDateString()}
							</span>
						{/if}
					</div>
					<div class="api-key-scopes">
						{#each key.scopes as scope}
							<span class="scope-badge">{scope}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
