<script lang="ts">
	import { enhance } from "$app/forms";
	import { notifications } from "$lib";
	import type { Webhook, Group, SiteSettings } from "$lib";

	const {
		webhooks,
		groups,
		settings,
	}: {
		webhooks: Webhook[];
		groups: Group[];
		settings: SiteSettings | null;
	} = $props();

	let editingId = $state<string | null>(null);
	let createType = $state<"discord" | "webhook">("discord");
	let createIsGlobal = $state(true);
	let createGroups = $state<string[]>([]);
	let editTypes = $state<Record<string, "discord" | "webhook">>({});
	let editIsGlobal = $state<Record<string, boolean>>({});
	let editGroups = $state<Record<string, string[]>>({});

	const globalWebhooks = $derived(webhooks.filter((w) => w.isGlobal));
	const groupWebhooks = $derived(webhooks.filter((w) => !w.isGlobal));

	let retryCount = $state(settings?.retryCount || 0);
	let smtpHost = $state(settings?.smtpHost || "");
	let smtpPort = $state(settings?.smtpPort || "587");
	let smtpUser = $state(settings?.smtpUser || "");
	let smtpPass = $state(settings?.smtpPass || "");
	let smtpFrom = $state(settings?.smtpFrom || "");
	let smtpSecure = $state(settings?.smtpSecure || false);
	let smtpEnabled = $state(settings?.smtpEnabled || false);
	let emailTo = $state(settings?.emailTo || "");
	let emailIsGlobal = $state(settings?.emailIsGlobal !== false);
	let emailGroups = $state<string[]>(settings?.emailGroups || []);
	let sendingTestEmail = $state(false);
	let testEmailError = $state("");
	let testEmailSuccess = $state(false);

	const portWarning = $derived.by(() => {
		const port = parseInt(smtpPort, 10);
		if (smtpSecure && (port === 587 || port === 25 || port === 2525)) {
			return `port ${port} typically uses STARTTLS, not SSL/TLS. try disabling "use ssl/tls" or use port 465.`;
		}
		if (!smtpSecure && port === 465) {
			return `port 465 typically requires SSL/TLS. try enabling "use ssl/tls" or use port 587.`;
		}
		return null;
	});

	$effect(() => {
		if (settings) {
			retryCount = settings.retryCount || 0;
			smtpHost = settings.smtpHost || "";
			smtpPort = settings.smtpPort || "587";
			smtpUser = settings.smtpUser || "";
			smtpPass = settings.smtpPass || "";
			smtpFrom = settings.smtpFrom || "";
			smtpSecure = settings.smtpSecure || false;
			smtpEnabled = settings.smtpEnabled || false;
			emailTo = settings.emailTo || "";
			emailIsGlobal = settings.emailIsGlobal !== false;
			emailGroups = settings.emailGroups || [];
		}
	});

	async function sendTestEmail() {
		if (sendingTestEmail) return;
		sendingTestEmail = true;
		testEmailError = "";
		testEmailSuccess = false;

		try {
			const response = await fetch("?/testEmail", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
			});
			const result = await response.json();

			if (result.type === "success") {
				testEmailSuccess = true;
			} else {
				testEmailError = result.data?.emailError || result.error || "failed to send test email";
			}
		} catch (err) {
			testEmailError = err instanceof Error ? err.message : "failed to send test email";
		} finally {
			sendingTestEmail = false;
		}
	}

	function toggleEmailGroup(groupName: string) {
		if (emailGroups.includes(groupName)) {
			emailGroups = emailGroups.filter((g) => g !== groupName);
		} else {
			emailGroups = [...emailGroups, groupName];
		}
	}

	function toggleEdit(id: string) {
		if (editingId === id) {
			editingId = null;
		} else {
			editingId = id;
			const webhook = webhooks.find((w) => w.id === id);
			if (webhook) {
				editTypes[id] = webhook.type;
				editIsGlobal[id] = webhook.isGlobal;
				editGroups[id] = [...webhook.groups];
			}
		}
	}

	function toggleCreateGroup(groupName: string) {
		if (createGroups.includes(groupName)) {
			createGroups = createGroups.filter((g) => g !== groupName);
		} else {
			createGroups = [...createGroups, groupName];
		}
	}

	function toggleEditGroup(webhookId: string, groupName: string) {
		if (!editGroups[webhookId]) editGroups[webhookId] = [];
		if (editGroups[webhookId].includes(groupName)) {
			editGroups[webhookId] = editGroups[webhookId].filter(
				(g) => g !== groupName,
			);
		} else {
			editGroups[webhookId] = [...editGroups[webhookId], groupName];
		}
	}

	function formatGroups(webhook: Webhook): string {
		if (webhook.isGlobal) return "all groups";
		if (webhook.groups.length === 0) return "no groups";
		return webhook.groups.join(", ");
	}
</script>

<section class="settings-section">
	<h3>retry</h3>

	<form
		method="POST"
		action="?/updateSiteSettings"
		class="form"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === "success") {
					notifications.success("retry settings saved");
					await update();
				} else if (result.type === "failure") {
					const error = result.data?.siteError as string | undefined;
					notifications.error(error || "failed to save retry settings");
				}
			};
		}}
	>
		<input type="hidden" name="_emailForm" value="1" />
		<div class="form-group">
			<input
				type="number"
				id="retryCount"
				name="retryCount"
				placeholder=" "
				min="0"
				max="10"
				bind:value={retryCount}
			/>
			<label for="retryCount">retry count (0-10)</label>
			<p class="field-hint">failed checks before sending notifications</p>
		</div>

		<button type="submit" class="btn">save</button>
	</form>
</section>

<section class="settings-section">
	<h3>email</h3>

	{#if portWarning}
		<div class="warning-banner">{portWarning}</div>
	{/if}

	<form
		method="POST"
		action="?/updateSiteSettings"
		class="form"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === "success") {
					notifications.success("email settings saved");
					await update();
				} else if (result.type === "failure") {
					const error = result.data?.siteError as string | undefined;
					notifications.error(error || "failed to save email settings");
				}
			};
		}}
	>
		<input type="hidden" name="_emailForm" value="1" />
		<div class="checkbox-group">
			<label class="checkbox-label">
				<input type="checkbox" name="smtpEnabled" bind:checked={smtpEnabled} />
				enable email notifications
			</label>
			<label class="checkbox-label">
				<input type="checkbox" name="smtpSecure" bind:checked={smtpSecure} />
				use ssl/tls
			</label>
		</div>

		<div class="form-group">
			<input type="text" id="smtpHost" name="smtpHost" placeholder=" " bind:value={smtpHost} />
			<label for="smtpHost">smtp host</label>
		</div>

		<div class="form-group">
			<input type="text" id="smtpPort" name="smtpPort" placeholder=" " bind:value={smtpPort} />
			<label for="smtpPort">smtp port</label>
		</div>

		<div class="form-group">
			<input type="text" id="smtpUser" name="smtpUser" placeholder=" " bind:value={smtpUser} />
			<label for="smtpUser">smtp username</label>
		</div>

		<div class="form-group">
			<input type="password" id="smtpPass" name="smtpPass" placeholder=" " bind:value={smtpPass} />
			<label for="smtpPass">smtp password</label>
		</div>

		<div class="form-group">
			<input type="email" id="smtpFrom" name="smtpFrom" placeholder=" " bind:value={smtpFrom} />
			<label for="smtpFrom">from address</label>
		</div>

		<div class="form-group">
			<input type="email" id="emailTo" name="emailTo" placeholder=" " bind:value={emailTo} />
			<label for="emailTo">notification recipient</label>
		</div>

		<div class="scope-section">
			<span class="scope-label">scope</span>
			<input type="hidden" name="emailIsGlobal" value={emailIsGlobal} />
			<input type="hidden" name="emailGroups" value={JSON.stringify(emailGroups)} />
			<div class="scope-options">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={emailIsGlobal} />
					global (all groups)
				</label>
				{#if !emailIsGlobal}
					<div class="group-checkboxes">
						{#each groups as group (group.id)}
							<label class="checkbox-label">
								<input
									type="checkbox"
									checked={emailGroups.includes(group.name)}
									onchange={() => toggleEmailGroup(group.name)}
								/>
								{group.name}
							</label>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn">save email settings</button>
			<button type="button" class="btn" onclick={sendTestEmail} disabled={sendingTestEmail}>
				{sendingTestEmail ? "sending..." : "send test email"}
			</button>
		</div>

		{#if testEmailError}
			<p class="error-message">{testEmailError}</p>
		{/if}
		{#if testEmailSuccess}
			<p class="success-message">test email sent</p>
		{/if}
	</form>
</section>

<section class="settings-section">
	<h3>webhooks</h3>

	<form
		method="POST"
		action="?/createWebhook"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === "success") {
					notifications.success("webhook created");
					createGroups = [];
					createIsGlobal = true;
					await update();
				} else if (result.type === "failure") {
					const error = result.data?.webhookError as
						| string
						| undefined;
					notifications.error(error || "failed to create webhook");
				}
			};
		}}
		class="form webhook-form"
	>
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

		<div class="select-group">
			<label for="webhookType">type</label>
			<select
				id="webhookType"
				name="type"
				required
				bind:value={createType}
			>
				<option value="discord">discord</option>
				<option value="webhook">webhook</option>
			</select>
		</div>

		<div class="scope-section">
			<span class="scope-label">scope</span>
			<input type="hidden" name="isGlobal" value={createIsGlobal} />
			<input
				type="hidden"
				name="groups"
				value={JSON.stringify(createGroups)}
			/>
			<div class="scope-options">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={createIsGlobal} />
					global (all groups)
				</label>
				{#if !createIsGlobal}
					<div class="group-checkboxes">
						{#each groups as group (group.id)}
							<label class="checkbox-label">
								<input
									type="checkbox"
									checked={createGroups.includes(group.name)}
									onchange={() =>
										toggleCreateGroup(group.name)}
								/>
								{group.name}
							</label>
						{/each}
					</div>
				{/if}
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
			<label for="messageDown">down message</label>
		</div>

		<div class="form-group">
			<input
				type="text"
				id="messageUp"
				name="messageUp"
				placeholder=" "
				value={"{service} is back up"}
			/>
			<label for="messageUp">up message</label>
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
							<span class="webhook-message"
								>down: {webhook.messageDown}</span
							>
							<span class="webhook-message"
								>up: {webhook.messageUp}</span
							>
						</div>
					</div>
					<div class="webhook-actions">
						<button
							type="button"
							class="btn sm"
							onclick={() => toggleEdit(webhook.id)}
						>
							{editingId === webhook.id ? "cancel" : "edit"}
						</button>
						<form
							method="POST"
							action="?/toggleWebhook"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === "success") {
										notifications.success(
											webhook.enabled
												? "webhook disabled"
												: "webhook enabled",
										);
										await update();
									} else if (result.type === "failure") {
										const error = result.data
											?.webhookError as
											| string
											| undefined;
										notifications.error(
											error || "failed to update webhook",
										);
									}
								};
							}}
						>
							<input
								type="hidden"
								name="webhookId"
								value={webhook.id}
							/>
							<input
								type="hidden"
								name="enabled"
								value={!webhook.enabled}
							/>
							<button type="submit" class="btn sm">
								{webhook.enabled ? "disable" : "enable"}
							</button>
						</form>
						<form
							method="POST"
							action="?/deleteWebhook"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === "success") {
										notifications.success(
											"webhook deleted",
										);
										await update();
									} else if (result.type === "failure") {
										const error = result.data
											?.webhookError as
											| string
											| undefined;
										notifications.error(
											error || "failed to delete webhook",
										);
									}
								};
							}}
						>
							<input
								type="hidden"
								name="webhookId"
								value={webhook.id}
							/>
							<button type="submit" class="btn sm danger"
								>delete</button
							>
						</form>
					</div>
				</div>
				{#if editingId === webhook.id}
					<form
						method="POST"
						action="?/updateWebhook"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === "success") {
									notifications.success("webhook updated");
									editingId = null;
									await update();
								} else if (result.type === "failure") {
									const error = result.data?.webhookError as
										| string
										| undefined;
									notifications.error(
										error || "failed to update webhook",
									);
								}
							};
						}}
						class="form webhook-edit-form"
					>
						<input
							type="hidden"
							name="webhookId"
							value={webhook.id}
						/>
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

						<div class="select-group">
							<label for="editType-{webhook.id}">type</label>
							<select
								id="editType-{webhook.id}"
								name="type"
								required
								bind:value={editTypes[webhook.id]}
							>
								<option value="discord">discord</option>
								<option value="webhook">webhook</option>
							</select>
						</div>

						<div class="scope-section">
							<span class="scope-label">scope</span>
							<input
								type="hidden"
								name="isGlobal"
								value={editIsGlobal[webhook.id]}
							/>
							<input
								type="hidden"
								name="groups"
								value={JSON.stringify(
									editGroups[webhook.id] || [],
								)}
							/>
							<div class="scope-options">
								<label class="checkbox-label">
									<input
										type="checkbox"
										bind:checked={editIsGlobal[webhook.id]}
									/>
									global (all groups)
								</label>
								{#if !editIsGlobal[webhook.id]}
									<div class="group-checkboxes">
										{#each groups as group (group.id)}
											<label class="checkbox-label">
												<input
													type="checkbox"
													checked={editGroups[
														webhook.id
													]?.includes(group.name)}
													onchange={() =>
														toggleEditGroup(
															webhook.id,
															group.name,
														)}
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
								<input
									type="url"
									id="editAvatarUrl-{webhook.id}"
									name="avatarUrl"
									placeholder=" "
									value={webhook.avatarUrl || ""}
								/>
								<label for="editAvatarUrl-{webhook.id}"
									>avatar url (optional)</label
								>
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
							<label for="editMessageDown-{webhook.id}">down message</label>
						</div>

						<div class="form-group">
							<input
								type="text"
								id="editMessageUp-{webhook.id}"
								name="messageUp"
								placeholder=" "
								value={webhook.messageUp}
							/>
							<label for="editMessageUp-{webhook.id}">up message</label>
						</div>

						<button type="submit" class="btn">save changes</button>
					</form>
				{/if}
			{/each}
		</div>
	{/if}

	{#if groupWebhooks.length > 0}
		<h4 class="webhook-section-title">group webhooks</h4>
		<div class="webhooks-list">
			{#each groupWebhooks as webhook (webhook.id)}
				<div class="webhook-item" class:disabled={!webhook.enabled}>
					<div class="webhook-info">
						<div class="webhook-header">
							<span class="webhook-name">{webhook.name}</span>
							<span class="webhook-type">{webhook.type}</span>
							<span class="webhook-group"
								>{formatGroups(webhook)}</span
							>
						</div>
						<div class="webhook-messages">
							<span class="webhook-message"
								>down: {webhook.messageDown}</span
							>
							<span class="webhook-message"
								>up: {webhook.messageUp}</span
							>
						</div>
					</div>
					<div class="webhook-actions">
						<button
							type="button"
							class="btn sm"
							onclick={() => toggleEdit(webhook.id)}
						>
							{editingId === webhook.id ? "cancel" : "edit"}
						</button>
						<form
							method="POST"
							action="?/toggleWebhook"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === "success") {
										notifications.success(
											webhook.enabled
												? "webhook disabled"
												: "webhook enabled",
										);
										await update();
									} else if (result.type === "failure") {
										const error = result.data
											?.webhookError as
											| string
											| undefined;
										notifications.error(
											error || "failed to update webhook",
										);
									}
								};
							}}
						>
							<input
								type="hidden"
								name="webhookId"
								value={webhook.id}
							/>
							<input
								type="hidden"
								name="enabled"
								value={!webhook.enabled}
							/>
							<button type="submit" class="btn sm">
								{webhook.enabled ? "disable" : "enable"}
							</button>
						</form>
						<form
							method="POST"
							action="?/deleteWebhook"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === "success") {
										notifications.success(
											"webhook deleted",
										);
										await update();
									} else if (result.type === "failure") {
										const error = result.data
											?.webhookError as
											| string
											| undefined;
										notifications.error(
											error || "failed to delete webhook",
										);
									}
								};
							}}
						>
							<input
								type="hidden"
								name="webhookId"
								value={webhook.id}
							/>
							<button type="submit" class="btn sm danger"
								>delete</button
							>
						</form>
					</div>
				</div>
				{#if editingId === webhook.id}
					<form
						method="POST"
						action="?/updateWebhook"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === "success") {
									notifications.success("webhook updated");
									editingId = null;
									await update();
								} else if (result.type === "failure") {
									const error = result.data?.webhookError as
										| string
										| undefined;
									notifications.error(
										error || "failed to update webhook",
									);
								}
							};
						}}
						class="form webhook-edit-form"
					>
						<input
							type="hidden"
							name="webhookId"
							value={webhook.id}
						/>
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

						<div class="select-group">
							<label for="editType-{webhook.id}">type</label>
							<select
								id="editType-{webhook.id}"
								name="type"
								required
								bind:value={editTypes[webhook.id]}
							>
								<option value="discord">discord</option>
								<option value="webhook">webhook</option>
							</select>
						</div>

						<div class="scope-section">
							<span class="scope-label">scope</span>
							<input
								type="hidden"
								name="isGlobal"
								value={editIsGlobal[webhook.id]}
							/>
							<input
								type="hidden"
								name="groups"
								value={JSON.stringify(
									editGroups[webhook.id] || [],
								)}
							/>
							<div class="scope-options">
								<label class="checkbox-label">
									<input
										type="checkbox"
										bind:checked={editIsGlobal[webhook.id]}
									/>
									global (all groups)
								</label>
								{#if !editIsGlobal[webhook.id]}
									<div class="group-checkboxes">
										{#each groups as group (group.id)}
											<label class="checkbox-label">
												<input
													type="checkbox"
													checked={editGroups[
														webhook.id
													]?.includes(group.name)}
													onchange={() =>
														toggleEditGroup(
															webhook.id,
															group.name,
														)}
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
								<input
									type="url"
									id="editAvatarUrl-{webhook.id}"
									name="avatarUrl"
									placeholder=" "
									value={webhook.avatarUrl || ""}
								/>
								<label for="editAvatarUrl-{webhook.id}"
									>avatar url (optional)</label
								>
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
							<label for="editMessageDown-{webhook.id}">down message</label>
						</div>

						<div class="form-group">
							<input
								type="text"
								id="editMessageUp-{webhook.id}"
								name="messageUp"
								placeholder=" "
								value={webhook.messageUp}
							/>
							<label for="editMessageUp-{webhook.id}">up message</label>
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
