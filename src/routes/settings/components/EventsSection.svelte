<script lang="ts">
import { enhance } from "$app/forms";
import { formatDate } from "$lib";
import type { StatusEvent, Group } from "$lib";

const { events, groups, error, success }: { events: StatusEvent[]; groups: Group[]; error?: string; success?: string } = $props();
</script>

<section class="settings-section">
	<h3>events</h3>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if success}
		<div class="success-message">{success}</div>
	{/if}

	<form method="POST" action="?/createEvent" use:enhance class="form event-form">
		<div class="form-group">
			<input
				type="text"
				id="eventTitle"
				name="title"
				placeholder=" "
				required
			/>
			<label for="eventTitle">title</label>
		</div>

		<div class="form-group">
			<input
				type="text"
				id="eventDescription"
				name="description"
				placeholder=" "
			/>
			<label for="eventDescription">description (optional)</label>
		</div>

		<div class="form-row">
			<div class="select-group">
				<label for="eventType">type</label>
				<select id="eventType" name="type">
					<option value="incident">incident</option>
					<option value="maintenance">maintenance</option>
					<option value="info">info</option>
				</select>
			</div>

			<div class="select-group">
				<label for="eventStatus">status</label>
				<select id="eventStatus" name="status">
					<option value="ongoing">ongoing</option>
					<option value="scheduled">scheduled</option>
					<option value="resolved">resolved</option>
				</select>
			</div>

			<div class="select-group">
				<label for="eventGroup">group</label>
				<select id="eventGroup" name="groupName">
					<option value="">global</option>
					{#each groups as group}
						<option value={group.name}>{group.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<button type="submit" class="btn">create event</button>
	</form>

	{#if events.length > 0}
		<div class="events-list">
			{#each events as event (event.id)}
				<div
					class="event-item"
					class:resolved={event.status === "resolved"}
					class:event-incident={event.type === "incident"}
					class:event-maintenance={event.type === "maintenance"}
					class:event-info={event.type === "info"}
				>
					<div class="event-item-header">
						<span class="event-type">{event.type}</span>
						<span class="event-status">{event.status}</span>
						{#if event.groupName}
							<span class="event-group">{event.groupName}</span>
						{:else}
							<span class="event-group global">global</span>
						{/if}
					</div>
					<h4 class="event-title">{event.title}</h4>
					{#if event.description}
						<p class="event-description">{event.description}</p>
					{/if}
					<span class="event-date">started {formatDate(event.startedAt)}</span>
					<div class="event-actions">
						{#if event.status !== "resolved"}
							<form method="POST" action="?/resolveEvent" use:enhance>
								<input type="hidden" name="eventId" value={event.id} />
								<button type="submit" class="btn sm">resolve</button>
							</form>
						{/if}
						<form method="POST" action="?/deleteEvent" use:enhance>
							<input type="hidden" name="eventId" value={event.id} />
							<button type="submit" class="btn sm danger">delete</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="no-events">no events created yet</p>
	{/if}
</section>
