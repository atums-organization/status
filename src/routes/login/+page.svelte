<script lang="ts">
import type { ActionData, PageData } from "./$types";

const { data, form }: { data: PageData; form: ActionData } = $props();

const page = $derived((form?.page as "login" | "register") ?? data.page);
</script>

<div class="container">
	<div class="card">
		<h1><span class="brand">atums</span>/status</h1>

		{#if !data.isFirstUser}
			<div class="tabs">
				<a href="?page=login" class:active={page === "login"}>Login</a>
				<a href="?page=register" class:active={page === "register"}>Register</a>
			</div>
		{/if}

		{#if form?.error}
			<div class="error">{form.error}</div>
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
				Need an account? Contact an administrator for an invite.
			</p>
		{/if}
	</div>
</div>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-md);
	}

	.card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		padding: var(--spacing-xl);
		width: 100%;
		max-width: 360px;
		box-shadow: var(--shadow-md);
	}

	h1 {
		margin: 0 0 var(--spacing-lg);
		font-size: var(--text-xl);
		font-weight: var(--font-normal);
		color: var(--color-text-secondary);
		text-align: center;
	}

	h1 .brand {
		color: var(--color-text);
		font-weight: var(--font-semibold);
	}

	.tabs {
		display: flex;
		margin-bottom: var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.tabs a {
		flex: 1;
		padding: var(--spacing-sm) var(--spacing-md);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		text-align: center;
		text-decoration: none;
		transition: color var(--transition-fast);
		position: relative;
	}

	.tabs a:hover {
		color: var(--color-text-secondary);
	}

	.tabs a.active {
		color: var(--color-accent);
	}

	.tabs a.active::after {
		content: "";
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--color-accent);
	}

	.error {
		background: var(--color-error-bg);
		border-left: 3px solid var(--color-error);
		color: var(--color-error);
		padding: var(--spacing-sm) var(--spacing-md);
		margin-bottom: var(--spacing-md);
		font-size: var(--text-sm);
	}

	.field {
		position: relative;
		margin-bottom: var(--spacing-md);
	}

	label {
		position: absolute;
		left: var(--spacing-md);
		top: 50%;
		transform: translateY(-50%);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		pointer-events: none;
		transition: all var(--transition-fast);
		background: var(--color-bg);
		padding: 0 var(--spacing-xs);
	}

	input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: var(--text-sm);
		transition: border-color var(--transition-fast);
	}

	input:focus,
	input:not(:placeholder-shown) {
		outline: none;
	}

	input:focus {
		border-color: var(--color-accent);
	}

	input:focus + label,
	input:not(:placeholder-shown) + label {
		top: 0;
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}

	input:focus + label {
		color: var(--color-accent);
	}

	.submit {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		background: transparent;
		color: var(--color-text);
		border: 1px solid var(--color-border);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		transition: all var(--transition-fast);
		margin-top: var(--spacing-sm);
		cursor: pointer;
	}

	.submit:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.invite-note,
	.first-user-note {
		margin: var(--spacing-md) 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
