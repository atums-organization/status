<script lang="ts">
import { enhance } from "$app/forms";
import { notifications } from "$lib";
import type { SiteSettings, Group } from "$lib";

const { settings, groups }: { settings: SiteSettings | null; groups: Group[] } = $props();

let sendingTestEmail = $state(false);
let testEmailError = $state("");
let testEmailSuccess = $state(false);

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

let siteName = $state(settings?.siteName || "");
let siteIcon = $state(settings?.siteIcon || "");
let siteUrl = $state(settings?.siteUrl || "");
let sourceUrl = $state(settings?.sourceUrl || "");
let discordUrl = $state(settings?.discordUrl || "");
let securityContact = $state(settings?.securityContact || "");
let securityCanonical = $state(settings?.securityCanonical || "");
let smtpHost = $state(settings?.smtpHost || "");
let smtpPort = $state(settings?.smtpPort || "587");
let smtpUser = $state(settings?.smtpUser || "");
let smtpPass = $state(settings?.smtpPass || "");
let smtpFrom = $state(settings?.smtpFrom || "");
let smtpSecure = $state(settings?.smtpSecure || false);
let smtpEnabled = $state(settings?.smtpEnabled || false);

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
let emailTo = $state(settings?.emailTo || "");
let emailIsGlobal = $state(settings?.emailIsGlobal !== false);
let emailGroups = $state<string[]>(settings?.emailGroups || []);
let retryCount = $state(settings?.retryCount || 0);

function toggleEmailGroup(groupName: string) {
	if (emailGroups.includes(groupName)) {
		emailGroups = emailGroups.filter(g => g !== groupName);
	} else {
		emailGroups = [...emailGroups, groupName];
	}
}

$effect(() => {
	if (settings) {
		siteName = settings.siteName || "";
		siteIcon = settings.siteIcon || "";
		siteUrl = settings.siteUrl || "";
		sourceUrl = settings.sourceUrl || "";
		discordUrl = settings.discordUrl || "";
		securityContact = settings.securityContact || "";
		securityCanonical = settings.securityCanonical || "";
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
		retryCount = settings.retryCount || 0;
	}
});
</script>

<section class="settings-section">
	<h3>site configuration</h3>

	<form method="POST" action="?/updateSiteSettings" class="form" use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === "success") {
				notifications.success("settings saved");
				await update();
			} else if (result.type === "failure") {
				const error = result.data?.siteError as string | undefined;
				notifications.error(error || "failed to save settings");
			}
		};
	}}>
		<div class="form-group">
			<input
				type="text"
				id="siteName"
				name="siteName"
				placeholder=" "
				bind:value={siteName}
			/>
			<label for="siteName">site name (use / to split brand)</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="siteIcon"
				name="siteIcon"
				placeholder=" "
				bind:value={siteIcon}
			/>
			<label for="siteIcon">site icon (.jpg or .png url)</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="siteUrl"
				name="siteUrl"
				placeholder=" "
				bind:value={siteUrl}
			/>
			<label for="siteUrl">site url</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="sourceUrl"
				name="sourceUrl"
				placeholder=" "
				bind:value={sourceUrl}
			/>
			<label for="sourceUrl">source url</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="discordUrl"
				name="discordUrl"
				placeholder=" "
				bind:value={discordUrl}
			/>
			<label for="discordUrl">discord url</label>
		</div>

		<div class="form-group">
			<input
				type="email"
				id="securityContact"
				name="securityContact"
				placeholder=" "
				bind:value={securityContact}
			/>
			<label for="securityContact">security contact</label>
		</div>

		<div class="form-group">
			<input
				type="text"
				id="securityCanonical"
				name="securityCanonical"
				placeholder=" "
				bind:value={securityCanonical}
			/>
			<label for="securityCanonical">security canonical url</label>
		</div>

		<button type="submit" class="btn">save settings</button>
	</form>
</section>

<section class="settings-section">
	<h3>email notifications</h3>

	{#if portWarning}
		<div class="warning-banner">{portWarning}</div>
	{/if}

	<form method="POST" action="?/updateSiteSettings" class="form" use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === "success") {
				notifications.success("email settings saved");
				await update();
			} else if (result.type === "failure") {
				const error = result.data?.siteError as string | undefined;
				notifications.error(error || "failed to save email settings");
			}
		};
	}}>
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
			<input
				type="text"
				id="smtpHost"
				name="smtpHost"
				placeholder=" "
				bind:value={smtpHost}
			/>
			<label for="smtpHost">smtp host</label>
		</div>

		<div class="form-group">
			<input
				type="text"
				id="smtpPort"
				name="smtpPort"
				placeholder=" "
				bind:value={smtpPort}
			/>
			<label for="smtpPort">smtp port</label>
		</div>

		<div class="form-group">
			<input
				type="text"
				id="smtpUser"
				name="smtpUser"
				placeholder=" "
				bind:value={smtpUser}
			/>
			<label for="smtpUser">smtp username</label>
		</div>

		<div class="form-group">
			<input
				type="password"
				id="smtpPass"
				name="smtpPass"
				placeholder=" "
				bind:value={smtpPass}
			/>
			<label for="smtpPass">smtp password</label>
		</div>

		<div class="form-group">
			<input
				type="email"
				id="smtpFrom"
				name="smtpFrom"
				placeholder=" "
				bind:value={smtpFrom}
			/>
			<label for="smtpFrom">from address</label>
		</div>

		<div class="form-group">
			<input
				type="email"
				id="emailTo"
				name="emailTo"
				placeholder=" "
				bind:value={emailTo}
			/>
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
			<p class="field-hint">number of failed checks before sending notifications</p>
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
