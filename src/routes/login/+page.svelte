<script lang="ts">
	import type { ActionData, PageData } from "./$types";
	import "./page.css";

	const { data, form }: { data: PageData; form: ActionData } = $props();

	const page = $derived((form?.page as "login" | "register") ?? data.page);
</script>

<div class="login-container">
	<main id="main-content" class="card">
		<h1><span class="brand">{data.site.brand}</span>{data.site.suffix}</h1>

		{#if !data.isFirstUser}
			<div class="tabs">
				<a href="?page=login" class:active={page === "login"}>Login</a>
				<a href="?page=register" class:active={page === "register"}
					>Register</a
				>
			</div>
		{/if}

		{#if form?.error}
			<div class="error" role="alert">{form.error}</div>
		{/if}

		{#if page === "login"}
			<form method="POST" action="?/login">
				<div class="field">
					<input
						type="text"
						id="username"
						name="username"
						placeholder=" "
						required
						autocomplete="username"
					/>
					<label for="username">Username</label>
				</div>
				<div class="field">
					<input
						type="password"
						id="password"
						name="password"
						placeholder=" "
						required
						autocomplete="current-password"
					/>
					<label for="password">Password</label>
				</div>
				<button type="submit" class="submit">Login</button>
			</form>
		{:else}
			<form method="POST" action="?/register">
				{#if !data.isFirstUser}
					<div class="field">
						<input
							type="text"
							id="inviteCode"
							name="inviteCode"
							placeholder=" "
							required
							autocomplete="off"
							style="text-transform: lowercase; letter-spacing: 0.1em;"
						/>
						<label for="inviteCode">Invite Code</label>
					</div>
				{/if}
				<div class="field">
					<input
						type="text"
						id="reg-username"
						name="username"
						placeholder=" "
						required
						autocomplete="username"
					/>
					<label for="reg-username">Username</label>
				</div>
				<div class="field">
					<input
						type="email"
						id="email"
						name="email"
						placeholder=" "
						required
						autocomplete="email"
					/>
					<label for="email">Email</label>
				</div>
				<div class="field">
					<input
						type="password"
						id="reg-password"
						name="password"
						placeholder=" "
						required
						autocomplete="new-password"
					/>
					<label for="reg-password">Password</label>
				</div>
				<div class="field">
					<input
						type="password"
						id="confirmPassword"
						name="confirmPassword"
						placeholder=" "
						required
						autocomplete="new-password"
					/>
					<label for="confirmPassword">Confirm Password</label>
				</div>
				<button type="submit" class="submit">Create Account</button>
			</form>

			{#if data.isFirstUser}
				<p class="first-user-note">
					Create your admin account to get started.
				</p>
			{/if}
		{/if}

		{#if !data.isFirstUser && page === "login"}
			<p class="invite-note">
				Need an account? Ask an admin for an invite code.
			</p>
		{/if}
	</main>
</div>
