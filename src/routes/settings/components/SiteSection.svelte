<script lang="ts">
import { enhance } from "$app/forms";
import type { SiteSettings } from "$lib";

const { settings, error, success }: { settings: SiteSettings | null; error?: string; success?: string } = $props();
</script>

<section class="settings-section">
	<h3>site configuration</h3>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if success}
		<div class="success-message">{success}</div>
	{/if}

	<form method="POST" action="?/updateSiteSettings" class="form" use:enhance>
		<div class="form-group">
			<input
				type="text"
				id="siteName"
				name="siteName"
				placeholder=" "
				value={settings?.siteName || ""}
			/>
			<label for="siteName">site name (use / to split brand)</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="siteUrl"
				name="siteUrl"
				placeholder=" "
				value={settings?.siteUrl || ""}
			/>
			<label for="siteUrl">site url</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="sourceUrl"
				name="sourceUrl"
				placeholder=" "
				value={settings?.sourceUrl || ""}
			/>
			<label for="sourceUrl">source url</label>
		</div>

		<div class="form-group">
			<input
				type="url"
				id="discordUrl"
				name="discordUrl"
				placeholder=" "
				value={settings?.discordUrl || ""}
			/>
			<label for="discordUrl">discord url</label>
		</div>

		<div class="form-group">
			<input
				type="email"
				id="securityContact"
				name="securityContact"
				placeholder=" "
				value={settings?.securityContact || ""}
			/>
			<label for="securityContact">security contact</label>
		</div>

		<div class="form-group">
			<input
				type="text"
				id="securityCanonical"
				name="securityCanonical"
				placeholder=" "
				value={settings?.securityCanonical || ""}
			/>
			<label for="securityCanonical">security canonical url</label>
		</div>

		<button type="submit" class="btn">save settings</button>
	</form>
</section>
