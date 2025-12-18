<script lang="ts">
import { enhance } from "$app/forms";
import { notifications } from "$lib";
</script>

<section class="settings-section">
	<h3>change password</h3>

	<form method="POST" action="?/password" class="form" use:enhance={() => {
		return async ({ result }) => {
			if (result.type === "success") {
				notifications.success("password updated");
			} else if (result.type === "failure") {
				const error = result.data?.error as string | undefined;
				notifications.error(error || "failed to update password");
			}
		};
	}}>
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
