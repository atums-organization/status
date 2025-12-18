<script lang="ts">
import { enhance } from "$app/forms";
import { formatDate, copyToClipboard, notifications } from "$lib";
import type { Invite } from "$lib";

const { invites, error, success }: { invites: Invite[]; error?: string; success?: string } = $props();

async function shareInvite(code: string) {
	const copied = await copyToClipboard(code);
	if (copied) {
		notifications.success("Invite code copied to clipboard");
	} else {
		notifications.error("Failed to copy invite code");
	}
}
</script>

<section class="settings-section">
	<h3>invites</h3>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if success}
		<div class="success-message">{success}</div>
	{/if}

	<form method="POST" action="?/createInvite" use:enhance class="invite-create">
		<button type="submit" class="btn">create invite</button>
	</form>

	{#if invites.length > 0}
		<div class="invites-list">
			{#each invites as invite (invite.id)}
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
