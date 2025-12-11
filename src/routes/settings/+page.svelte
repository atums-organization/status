<script lang="ts">
import { UserMenu, censorEmail, formatDate, copyToClipboard, notifications } from "$lib";
import type { ActionData, PageData } from "./$types";
import { enhance } from "$app/forms";
import "./page.css";

const { data, form }: { data: PageData; form: ActionData } = $props();

async function shareInvite(code: string) {
	const success = await copyToClipboard(code);
	if (success) {
		notifications.success("Invite code copied to clipboard");
	} else {
		notifications.error("Failed to copy invite code");
	}
}
</script>

<div class="container">
	<header class="header">
		<h1><span class="brand">atums</span>/status</h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			<a href="https://heliopolis.live/atums/status" target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
		</nav>
		<UserMenu user={data.user} />
	</header>

	<main class="main narrow">
		<h2>settings</h2>

		<section class="settings-section">
			<h3>account</h3>
			<dl class="info-list">
				<dt>username</dt>
				<dd>{data.user.username}</dd>
				<dt>email</dt>
				<dd class="email-field" title={data.user.email}>
					<span class="email-censored">{censorEmail(data.user.email)}</span>
					<span class="email-reveal">{data.user.email}</span>
				</dd>
				<dt>role</dt>
				<dd>{data.user.role}</dd>
			</dl>
		</section>

		<section class="settings-section">
			<h3>change password</h3>

			{#if form?.error}
				<div class="error-message">{form.error}</div>
			{/if}

			{#if form?.success}
				<div class="success-message">{form.success}</div>
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

		{#if data.user.role === "admin"}
			<section class="settings-section">
				<h3>invites</h3>

				{#if form?.inviteError}
					<div class="error-message">{form.inviteError}</div>
				{/if}

				{#if form?.inviteSuccess}
					<div class="success-message">{form.inviteSuccess}</div>
				{/if}

				<form method="POST" action="?/createInvite" use:enhance class="invite-create">
					<button type="submit" class="btn">create invite</button>
				</form>

				{#if data.invites.length > 0}
					<div class="invites-list">
						{#each data.invites as invite (invite.id)}
							<div class="invite-item" class:used={invite.usedBy}>
								<div class="invite-code">{invite.code}</div>
								<div class="invite-meta">
									{#if invite.usedBy}
										<span class="invite-status used">used by {invite.usedByUsername}</span>
									{:else if invite.expiresAt && new Date(invite.expiresAt) < new Date()}
										<span class="invite-status expired">expired</span>
									{:else}
										<span class="invite-status available">available</span>
									{/if}
									<span class="invite-date">created {formatDate(invite.createdAt)}</span>
								</div>
								{#if !invite.usedBy}
									<button type="button" class="btn sm" onclick={() => shareInvite(invite.code)}>copy</button>
									<form method="POST" action="?/deleteInvite" use:enhance class="invite-delete">
										<input type="hidden" name="inviteId" value={invite.id} />
										<button type="submit" class="btn sm danger">delete</button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="no-invites">no invites created yet</p>
				{/if}
			</section>
		{/if}

		<section class="settings-section">
			<h3>session</h3>
			<form method="POST" action="?/logout">
				<button type="submit" class="btn danger">logout</button>
			</form>
		</section>
	</main>
</div>
