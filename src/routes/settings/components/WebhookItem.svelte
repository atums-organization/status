<script lang="ts">
	import { enhance } from "$app/forms";
	import { notifications } from "$lib";
	import type { Webhook, Group } from "$lib";

	let {
		webhook,
		groups,
		editingId = $bindable(),
		editTypes = $bindable(),
		editIsGlobal = $bindable(),
		editGroups = $bindable(),
		showGroups = false,
	}: {
		webhook: Webhook;
		groups: Group[];
		editingId: string | null;
		editTypes: Record<string, "discord" | "webhook">;
		editIsGlobal: Record<string, boolean>;
		editGroups: Record<string, string[]>;
		showGroups?: boolean;
	} = $props();

	function toggleEdit() {
		if (editingId === webhook.id) {
			editingId = null;
		} else {
			editingId = webhook.id;
			editTypes[webhook.id] = webhook.type;
			editIsGlobal[webhook.id] = webhook.isGlobal;
			editGroups[webhook.id] = [...webhook.groups];
		}
	}

	function toggleEditGroup(groupName: string) {
		if (!editGroups[webhook.id]) editGroups[webhook.id] = [];
		if (editGroups[webhook.id].includes(groupName)) {
			editGroups[webhook.id] = editGroups[webhook.id].filter((g) => g !== groupName);
		} else {
			editGroups[webhook.id] = [...editGroups[webhook.id], groupName];
		}
	}

	function formatGroupsList(): string {
		if (webhook.isGlobal) return "all groups";
		if (webhook.groups.length === 0) return "no groups";
		return webhook.groups.join(", ");
	}

	function handleToggle() {
		return async ({ result, update }: { result: { type: string; data?: Record<string, unknown> }; update: () => Promise<void> }) => {
			if (result.type === "success") {
				notifications.success(webhook.enabled ? "webhook disabled" : "webhook enabled");
				await update();
			} else if (result.type === "failure") {
				notifications.error((result.data?.webhookError as string) || "failed to update webhook");
			}
		};
	}

	function handleDelete() {
		return async ({ result, update }: { result: { type: string; data?: Record<string, unknown> }; update: () => Promise<void> }) => {
			if (result.type === "success") {
				notifications.success("webhook deleted");
				await update();
			} else if (result.type === "failure") {
				notifications.error((result.data?.webhookError as string) || "failed to delete webhook");
			}
		};
	}

	function handleUpdate() {
		return async ({ result, update }: { result: { type: string; data?: Record<string, unknown> }; update: () => Promise<void> }) => {
			if (result.type === "success") {
				notifications.success("webhook updated");
				editingId = null;
				await update();
			} else if (result.type === "failure") {
				notifications.error((result.data?.webhookError as string) || "failed to update webhook");
			}
		};
	}
</script>

<div class="webhook-item" class:disabled={!webhook.enabled}>
	<div class="webhook-info">
		<div class="webhook-header">
			<span class="webhook-name">{webhook.name}</span>
			<span class="webhook-type">{webhook.type}</span>
			{#if showGroups}
				<span class="webhook-group">{formatGroupsList()}</span>
			{/if}
		</div>
		{#if !showGroups}
			<span class="webhook-url">{webhook.url}</span>
		{/if}
		<div class="webhook-messages">
			<span class="webhook-message">down: {webhook.messageDown}</span>
			<span class="webhook-message">up: {webhook.messageUp}</span>
		</div>
	</div>
	<div class="webhook-actions">
		<button
			type="button"
			class="btn sm"
			onclick={toggleEdit}
			aria-label={editingId === webhook.id ? `Cancel editing ${webhook.name}` : `Edit ${webhook.name}`}
		>
			{editingId === webhook.id ? "cancel" : "edit"}
		</button>
		<form method="POST" action="?/toggleWebhook" use:enhance={handleToggle}>
			<input type="hidden" name="webhookId" value={webhook.id} />
			<input type="hidden" name="enabled" value={!webhook.enabled} />
			<button
				type="submit"
				class="btn sm"
				aria-label={webhook.enabled ? `Disable ${webhook.name}` : `Enable ${webhook.name}`}
			>
				{webhook.enabled ? "disable" : "enable"}
			</button>
		</form>
		<form method="POST" action="?/deleteWebhook" use:enhance={handleDelete}>
			<input type="hidden" name="webhookId" value={webhook.id} />
			<button type="submit" class="btn sm danger" aria-label={`Delete ${webhook.name}`}>delete</button>
		</form>
	</div>
</div>

{#if editingId === webhook.id}
	<form method="POST" action="?/updateWebhook" use:enhance={handleUpdate} class="form webhook-edit-form">
		<input type="hidden" name="webhookId" value={webhook.id} />
		<div class="form-group">
			<input type="text" id="editName-{webhook.id}" name="name" placeholder=" " value={webhook.name} required />
			<label for="editName-{webhook.id}">name</label>
		</div>

		<div class="form-group">
			<input type="url" id="editUrl-{webhook.id}" name="url" placeholder=" " value={webhook.url} required />
			<label for="editUrl-{webhook.id}">url</label>
		</div>

		<div class="select-group">
			<label for="editType-{webhook.id}">type</label>
			<select id="editType-{webhook.id}" name="type" required bind:value={editTypes[webhook.id]}>
				<option value="discord">discord</option>
				<option value="webhook">webhook</option>
			</select>
		</div>

		<div class="scope-section">
			<span class="scope-label">scope</span>
			<input type="hidden" name="isGlobal" value={editIsGlobal[webhook.id]} />
			<input type="hidden" name="groups" value={JSON.stringify(editGroups[webhook.id] || [])} />
			<div class="scope-options">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={editIsGlobal[webhook.id]} />
					global (all groups)
				</label>
				{#if !editIsGlobal[webhook.id]}
					<div class="group-checkboxes">
						{#each groups as group (group.id)}
							<label class="checkbox-label">
								<input
									type="checkbox"
									checked={editGroups[webhook.id]?.includes(group.name)}
									onchange={() => toggleEditGroup(group.name)}
								/>
								{group.name}
							</label>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if editTypes[webhook.id] === "discord"}
			<div class="form-group">
				<input type="url" id="editAvatarUrl-{webhook.id}" name="avatarUrl" placeholder=" " value={webhook.avatarUrl || ""} />
				<label for="editAvatarUrl-{webhook.id}">avatar url (optional)</label>
			</div>
		{/if}

		<div class="form-group">
			<input type="text" id="editMessageDown-{webhook.id}" name="messageDown" placeholder=" " value={webhook.messageDown} />
			<label for="editMessageDown-{webhook.id}">down message</label>
		</div>

		<div class="form-group">
			<input type="text" id="editMessageUp-{webhook.id}" name="messageUp" placeholder=" " value={webhook.messageUp} />
			<label for="editMessageUp-{webhook.id}">up message</label>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn">save changes</button>
		</div>
	</form>
{/if}
