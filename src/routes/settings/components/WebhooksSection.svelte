<script lang="ts">
import { enhance } from "$app/forms";
import { notifications } from "$lib";
import type { Webhook, Group } from "$lib";

const { webhooks, groups }: {
	webhooks: Webhook[];
	groups: Group[];
} = $props();

let editingId = $state<string | null>(null);
let createType = $state<"discord" | "webhook">("discord");
let editTypes = $state<Record<string, "discord" | "webhook">>({});

const globalWebhooks = $derived(webhooks.filter(w => !w.groupName));
const groupWebhooks = $derived(webhooks.filter(w => w.groupName));

function toggleEdit(id: string) {
	if (editingId === id) {
		editingId = null;
	} else {
		editingId = id;
		const webhook = webhooks.find(w => w.id === id);
		if (webhook) {
			editTypes[id] = webhook.type;
		}
	}
}
</script>

<section class="settings-section">
	<h3>webhooks</h3>

	<form method="POST" action="?/createWebhook" use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === "success") {
				notifications.success("webhook created");
				await update();
			} else if (result.type === "failure") {
				const error = result.data?.webhookError as string | undefined;
				notifications.error(error || "failed to create webhook");
			}
		};
	}} class="form webhook-form">
		<div class="form-group">
			<input
				type="text"
				id="webhookName"
				name="name"
				placeholder=" "
				required
			/>
			<label for="webhookName">name</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="webhookUrl"
				name="url"
				placeholder=" "
				required
			/>
			<label for="webhookUrl">url</label>
		</div>

		<div class="form-row">
			<div class="select-group">
				<label for="webhookType">type</label>
				<select id="webhookType" name="type" required bind:value={createType}>
					<option value="discord">discord</option>
					<option value="webhook">webhook</option>
				</select>
			</div>

			<div class="select-group">
				<label for="webhookGroup">scope</label>
				<select id="webhookGroup" name="groupName">
					<option value="">global (all services)</option>
					{#each groups as group (group.id)}
						<option value={group.name}>{group.name}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if createType === "discord"}
			<div class="form-group">
				<input
					type="url"
					id="avatarUrl"
					name="avatarUrl"
					placeholder=" "
				/>
				<label for="avatarUrl">avatar url (optional)</label>
			</div>
		{/if}

		<div class="form-group">
			<input
				type="text"
				id="messageDown"
				name="messageDown"
				placeholder=" "
				value={"{service} is down"}
			/>
			<label for="messageDown">down message (use {"{service}"} for name)</label>
		</div>

		<div class="form-group">
			<input
				type="text"
				id="messageUp"
				name="messageUp"
				placeholder=" "
				value={"{service} is back up"}
			/>
			<label for="messageUp">up message (use {"{service}"} for name)</label>
		</div>

		<button type="submit" class="btn">add webhook</button>
	</form>

	{#if globalWebhooks.length > 0}
		<h4 class="webhook-section-title">global webhooks</h4>
		<div class="webhooks-list">
			{#each globalWebhooks as webhook (webhook.id)}
				<div class="webhook-item" class:disabled={!webhook.enabled}>
					<div class="webhook-info">
						<div class="webhook-header">
							<span class="webhook-name">{webhook.name}</span>
							<span class="webhook-type">{webhook.type}</span>
						</div>
						<span class="webhook-url">{webhook.url}</span>
						<div class="webhook-messages">
							<span class="webhook-message">down: {webhook.messageDown}</span>
							<span class="webhook-message">up: {webhook.messageUp}</span>
						</div>
					</div>
					<div class="webhook-actions">
						<button type="button" class="btn sm" onclick={() => toggleEdit(webhook.id)}>
							{editingId === webhook.id ? "cancel" : "edit"}
						</button>
						<form method="POST" action="?/toggleWebhook" use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === "success") {
									notifications.success(webhook.enabled ? "webhook disabled" : "webhook enabled");
									await update();
								} else if (result.type === "failure") {
									const error = result.data?.webhookError as string | undefined;
									notifications.error(error || "failed to update webhook");
								}
							};
						}}>
							<input type="hidden" name="webhookId" value={webhook.id} />
							<input type="hidden" name="enabled" value={!webhook.enabled} />
							<button type="submit" class="btn sm">
								{webhook.enabled ? "disable" : "enable"}
							</button>
						</form>
						<form method="POST" action="?/deleteWebhook" use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === "success") {
									notifications.success("webhook deleted");
									await update();
								} else if (result.type === "failure") {
									const error = result.data?.webhookError as string | undefined;
									notifications.error(error || "failed to delete webhook");
								}
							};
						}}>
							<input type="hidden" name="webhookId" value={webhook.id} />
							<button type="submit" class="btn sm danger">delete</button>
						</form>
					</div>
				</div>
				{#if editingId === webhook.id}
					<form method="POST" action="?/updateWebhook" use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === "success") {
								notifications.success("webhook updated");
								editingId = null;
								await update();
							} else if (result.type === "failure") {
								const error = result.data?.webhookError as string | undefined;
								notifications.error(error || "failed to update webhook");
							}
						};
					}} class="form webhook-edit-form">
						<input type="hidden" name="webhookId" value={webhook.id} />
						<div class="form-group">
							<input
								type="text"
								id="editName-{webhook.id}"
								name="name"
								placeholder=" "
								value={webhook.name}
								required
							/>
							<label for="editName-{webhook.id}">name</label>
						</div>

						<div class="form-group">
							<input
								type="url"
								id="editUrl-{webhook.id}"
								name="url"
								placeholder=" "
								value={webhook.url}
								required
							/>
							<label for="editUrl-{webhook.id}">url</label>
						</div>

						<div class="form-row">
							<div class="select-group">
								<label for="editType-{webhook.id}">type</label>
								<select id="editType-{webhook.id}" name="type" required bind:value={editTypes[webhook.id]}>
									<option value="discord">discord</option>
									<option value="webhook">webhook</option>
								</select>
							</div>

							<div class="select-group">
								<label for="editGroup-{webhook.id}">scope</label>
								<select id="editGroup-{webhook.id}" name="groupName">
									<option value="" selected={!webhook.groupName}>global (all services)</option>
									{#each groups as group (group.id)}
										<option value={group.name} selected={webhook.groupName === group.name}>{group.name}</option>
									{/each}
								</select>
							</div>
						</div>

						{#if editTypes[webhook.id] === "discord"}
							<div class="form-group">
								<input
									type="url"
									id="editAvatarUrl-{webhook.id}"
									name="avatarUrl"
									placeholder=" "
									value={webhook.avatarUrl || ""}
								/>
								<label for="editAvatarUrl-{webhook.id}">avatar url (optional)</label>
							</div>
						{/if}

						<div class="form-group">
							<input
								type="text"
								id="editMessageDown-{webhook.id}"
								name="messageDown"
								placeholder=" "
								value={webhook.messageDown}
							/>
							<label for="editMessageDown-{webhook.id}">down message (use {"{service}"} for name)</label>
						</div>

						<div class="form-group">
							<input
								type="text"
								id="editMessageUp-{webhook.id}"
								name="messageUp"
								placeholder=" "
								value={webhook.messageUp}
							/>
							<label for="editMessageUp-{webhook.id}">up message (use {"{service}"} for name)</label>
						</div>

						<button type="submit" class="btn">save changes</button>
					</form>
				{/if}
			{/each}
		</div>
	{/if}

	{#if groupWebhooks.length > 0}
		<h4 class="webhook-section-title">group webhooks (override global)</h4>
		<div class="webhooks-list">
			{#each groupWebhooks as webhook (webhook.id)}
				<div class="webhook-item" class:disabled={!webhook.enabled}>
					<div class="webhook-info">
						<div class="webhook-header">
							<span class="webhook-name">{webhook.name}</span>
							<span class="webhook-type">{webhook.type}</span>
							<span class="webhook-group">{webhook.groupName}</span>
						</div>
						<span class="webhook-url">{webhook.url}</span>
						<div class="webhook-messages">
							<span class="webhook-message">down: {webhook.messageDown}</span>
							<span class="webhook-message">up: {webhook.messageUp}</span>
						</div>
					</div>
					<div class="webhook-actions">
						<button type="button" class="btn sm" onclick={() => toggleEdit(webhook.id)}>
							{editingId === webhook.id ? "cancel" : "edit"}
						</button>
						<form method="POST" action="?/toggleWebhook" use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === "success") {
									notifications.success(webhook.enabled ? "webhook disabled" : "webhook enabled");
									await update();
								} else if (result.type === "failure") {
									const error = result.data?.webhookError as string | undefined;
									notifications.error(error || "failed to update webhook");
								}
							};
						}}>
							<input type="hidden" name="webhookId" value={webhook.id} />
							<input type="hidden" name="enabled" value={!webhook.enabled} />
							<button type="submit" class="btn sm">
								{webhook.enabled ? "disable" : "enable"}
							</button>
						</form>
						<form method="POST" action="?/deleteWebhook" use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === "success") {
									notifications.success("webhook deleted");
									await update();
								} else if (result.type === "failure") {
									const error = result.data?.webhookError as string | undefined;
									notifications.error(error || "failed to delete webhook");
								}
							};
						}}>
							<input type="hidden" name="webhookId" value={webhook.id} />
							<button type="submit" class="btn sm danger">delete</button>
						</form>
					</div>
				</div>
				{#if editingId === webhook.id}
					<form method="POST" action="?/updateWebhook" use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === "success") {
								notifications.success("webhook updated");
								editingId = null;
								await update();
							} else if (result.type === "failure") {
								const error = result.data?.webhookError as string | undefined;
								notifications.error(error || "failed to update webhook");
							}
						};
					}} class="form webhook-edit-form">
						<input type="hidden" name="webhookId" value={webhook.id} />
						<div class="form-group">
							<input
								type="text"
								id="editName-{webhook.id}"
								name="name"
								placeholder=" "
								value={webhook.name}
								required
							/>
							<label for="editName-{webhook.id}">name</label>
						</div>

						<div class="form-group">
							<input
								type="url"
								id="editUrl-{webhook.id}"
								name="url"
								placeholder=" "
								value={webhook.url}
								required
							/>
							<label for="editUrl-{webhook.id}">url</label>
						</div>

						<div class="form-row">
							<div class="select-group">
								<label for="editType-{webhook.id}">type</label>
								<select id="editType-{webhook.id}" name="type" required bind:value={editTypes[webhook.id]}>
									<option value="discord">discord</option>
									<option value="webhook">webhook</option>
								</select>
							</div>

							<div class="select-group">
								<label for="editGroup-{webhook.id}">scope</label>
								<select id="editGroup-{webhook.id}" name="groupName">
									<option value="" selected={!webhook.groupName}>global (all services)</option>
									{#each groups as group (group.id)}
										<option value={group.name} selected={webhook.groupName === group.name}>{group.name}</option>
									{/each}
								</select>
							</div>
						</div>

						{#if editTypes[webhook.id] === "discord"}
							<div class="form-group">
								<input
									type="url"
									id="editAvatarUrl-{webhook.id}"
									name="avatarUrl"
									placeholder=" "
									value={webhook.avatarUrl || ""}
								/>
								<label for="editAvatarUrl-{webhook.id}">avatar url (optional)</label>
							</div>
						{/if}

						<div class="form-group">
							<input
								type="text"
								id="editMessageDown-{webhook.id}"
								name="messageDown"
								placeholder=" "
								value={webhook.messageDown}
							/>
							<label for="editMessageDown-{webhook.id}">down message (use {"{service}"} for name)</label>
						</div>

						<div class="form-group">
							<input
								type="text"
								id="editMessageUp-{webhook.id}"
								name="messageUp"
								placeholder=" "
								value={webhook.messageUp}
							/>
							<label for="editMessageUp-{webhook.id}">up message (use {"{service}"} for name)</label>
						</div>

						<button type="submit" class="btn">save changes</button>
					</form>
				{/if}
			{/each}
		</div>
	{/if}

	{#if webhooks.length === 0}
		<p class="no-webhooks">no webhooks configured yet</p>
	{/if}
</section>
