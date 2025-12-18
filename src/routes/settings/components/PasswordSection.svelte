<script lang="ts">
import { enhance } from "$app/forms";

const { error, success }: { error?: string; success?: string } = $props();
</script>

<section class="settings-section">
	<h3>change password</h3>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if success}
		<div class="success-message">{success}</div>
	{/if}

	<form method="POST" action="?/password" class="form" use:enhance>
		<div class="form-group">
			<input
				type="password"
				id="currentPassword"
				name="currentPassword"
				placeholder=" "
				required
			/>
			<label for="currentPassword">current password</label>
		</div>

		<div class="form-group">
			<input
				type="password"
				id="newPassword"
				name="newPassword"
				placeholder=" "
				required
				minlength="8"
			/>
			<label for="newPassword">new password</label>
		</div>

		<div class="form-group">
			<input
				type="password"
				id="confirmPassword"
				name="confirmPassword"
				placeholder=" "
				required
				minlength="8"
			/>
			<label for="confirmPassword">confirm password</label>
		</div>

		<button type="submit" class="btn">update password</button>
	</form>
</section>
