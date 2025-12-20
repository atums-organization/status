<script lang="ts">
	import { enhance } from "$app/forms";
	import { notifications } from "$lib";
	import type { SiteSettings } from "$lib";

	const { settings }: { settings: SiteSettings | null } = $props();

	let siteName = $state(settings?.siteName || "");
	let siteIcon = $state(settings?.siteIcon || "");
	let siteUrl = $state(settings?.siteUrl || "");
	let sourceUrl = $state(settings?.sourceUrl || "");
	let discordUrl = $state(settings?.discordUrl || "");
	let securityContact = $state(settings?.securityContact || "");
	let securityCanonical = $state(settings?.securityCanonical || "");

	$effect(() => {
		if (settings) {
			siteName = settings.siteName || "";
			siteIcon = settings.siteIcon || "";
			siteUrl = settings.siteUrl || "";
			sourceUrl = settings.sourceUrl || "";
			discordUrl = settings.discordUrl || "";
			securityContact = settings.securityContact || "";
			securityCanonical = settings.securityCanonical || "";
		}
	});
</script>

<section class="settings-section">
	<h3>site configuration</h3>

	<form
		method="POST"
		action="?/updateSiteSettings"
		class="form"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === "success") {
					notifications.success("settings saved");
					await update();
				} else if (result.type === "failure") {
					const error = result.data?.siteError as string | undefined;
					notifications.error(error || "failed to save settings");
				}
			};
		}}
	>
		<div class="form-group">
			<input
				type="text"
				id="siteName"
				name="siteName"
				placeholder=" "
				bind:value={siteName}
			/>
			<label for="siteName">site name</label>
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
