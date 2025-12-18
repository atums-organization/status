<script lang="ts">
import { formatDateTime } from "$lib";
import type { AuditLog } from "$lib";

const { logs }: { logs: AuditLog[] } = $props();
</script>

<section class="settings-section">
	<h3>audit log</h3>
	{#if logs.length > 0}
		<div class="audit-list">
			{#each logs as log (log.id)}
				<div class="audit-item">
					<div class="audit-header">
						<span class="audit-action {log.action}">{log.action}</span>
						<span class="audit-entity">{log.entityType}</span>
						<span class="audit-date">{formatDateTime(log.createdAt)}</span>
					</div>
					<div class="audit-details">
						<span class="audit-user">{log.userName || log.userId}</span>
						{#if log.entityId}
							<span class="audit-entity-id">{log.entityId.slice(0, 8)}...</span>
						{/if}
						{#if log.ipAddress}
							<span class="audit-ip">{log.ipAddress}</span>
						{/if}
					</div>
					{#if log.details}
						<div class="audit-extra">
							{#each Object.entries(log.details) as [key, value]}
								<span class="audit-detail">{key}: {value}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="no-logs">no audit logs yet</p>
	{/if}
</section>
