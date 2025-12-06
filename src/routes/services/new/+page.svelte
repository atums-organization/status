<script lang="ts">
import { UserMenu } from "$lib";
import type { ActionData, PageData } from "./$types";

const { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="container">
	<header class="header">
		<h1><span class="brand">atums</span>/status</h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			<a href="/services" class="nav-link active">services</a>
		</nav>
		<UserMenu user={data.user} />
	</header>

	<main class="main narrow">
		{#if form?.error}
			<div class="error-message">{form.error}</div>
		{/if}

		<form method="POST" class="form">
			<div class="form-group">
				<input
					type="text"
					id="name"
					name="name"
					placeholder=" "
					value={form?.name ?? ""}
					required
				/>
				<label for="name">Service Name</label>
			</div>

			<div class="form-group">
				<input
					type="url"
					id="url"
					name="url"
					placeholder=" "
					value={form?.url ?? ""}
					required
				/>
				<label for="url">Check URL</label>
			</div>

			<div class="form-group">
				<input
					type="text"
					id="displayUrl"
					name="displayUrl"
					placeholder=" "
					value={form?.displayUrl ?? ""}
				/>
				<label for="displayUrl">Display URL (optional)</label>
			</div>

			<div class="form-group">
				<input
					type="text"
					id="description"
					name="description"
					placeholder=" "
					value={form?.description ?? ""}
				/>
				<label for="description">Description (optional)</label>
			</div>

			<div class="form-row">
				<div class="form-group">
					<input
						type="number"
						id="expectedStatus"
						name="expectedStatus"
						value={form?.expectedStatus ?? 200}
						min="100"
						max="599"
						required
					/>
					<label for="expectedStatus">Expected Status</label>
				</div>

				<div class="form-group">
					<input
						type="number"
						id="checkInterval"
						name="checkInterval"
						value={form?.checkInterval ?? 60}
						min="10"
						max="3600"
						required
					/>
					<label for="checkInterval">Interval (sec)</label>
				</div>
			</div>

			<div class="form-group">
				<input
					type="text"
					id="groupName"
					name="groupName"
					placeholder=" "
					value={form?.groupName ?? ""}
				/>
				<label for="groupName">Group (optional)</label>
			</div>

			<div class="form-group checkbox-group">
				<label class="checkbox-label">
					<input type="checkbox" name="enabled" checked />
					<span>Enable monitoring</span>
				</label>
				<label class="checkbox-label">
					<input type="checkbox" name="isPublic" />
					<span>Public (visible to everyone)</span>
				</label>
			</div>

			<div class="form-actions">
				<a href="/services" class="btn">cancel</a>
				<button type="submit" class="btn primary">add service</button>
			</div>
		</form>
	</main>
</div>

