<script lang="ts">
import { censorEmail } from "$lib";
import type { User } from "$lib";

const { user }: { user: User } = $props();
</script>

<section class="settings-section">
	<h3>account</h3>
	<dl class="info-list">
		<dt>username</dt>
		<dd>{user.username}</dd>
		<dt>email</dt>
		<dd class="email-field" title={user.email}>
			<span class="email-censored">{censorEmail(user.email)}</span>
			<span class="email-reveal">{user.email}</span>
		</dd>
		<dt>role</dt>
		<dd>{user.role}</dd>
	</dl>
</section>
