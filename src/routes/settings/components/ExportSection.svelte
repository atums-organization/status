<script lang="ts">
import type { Group } from "$lib";

const { groups }: { groups: Group[] } = $props();

let exportType = $state<"global" | "group">("global");
let selectedGroup = $state<string>("");
let importFile = $state<File | null>(null);
let importStatus = $state<string>("");
let exportStatus = $state<string>("");
let fileInputEl = $state<HTMLInputElement | null>(null);

function deserializeSvelteKitData(parsed: unknown[]): Record<string, unknown> {
	if (!Array.isArray(parsed) || parsed.length < 1) return {};
	const keyMap = parsed[0] as Record<string, number>;
	const result: Record<string, unknown> = {};
	for (const [key, index] of Object.entries(keyMap)) {
		result[key] = parsed[index];
	}
	return result;
}

function resetFileInput() {
	importFile = null;
	if (fileInputEl) {
		fileInputEl.value = "";
	}
}

function downloadJson(data: object, filename: string) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

async function handleExport() {
	exportStatus = "exporting...";
	try {
		const formData = new FormData();
		formData.append("exportType", exportType);
		if (exportType === "group" && selectedGroup) {
			formData.append("groupName", selectedGroup);
		}

		const response = await fetch("?/exportData", {
			method: "POST",
			body: formData,
		});

		const result = await response.json();

		if (result.type === "success" && typeof result.data === "string") {
			const parsed = JSON.parse(result.data);
			const data = deserializeSvelteKitData(parsed);
			if (data.exportData && typeof data.exportData === "string") {
				const exportData = JSON.parse(data.exportData);
				const timestamp = new Date().toISOString().split("T")[0];
				const filename = exportType === "global"
					? `status-export-${timestamp}.json`
					: `status-export-${selectedGroup}-${timestamp}.json`;
				downloadJson(exportData, filename);
				exportStatus = "export complete";
			} else {
				exportStatus = "export failed: no data";
			}
		} else if (result.type === "failure" && typeof result.data === "string") {
			const parsed = JSON.parse(result.data);
			const data = deserializeSvelteKitData(parsed);
			exportStatus = (data.error as string) || "export failed";
		} else {
			exportStatus = "export failed";
		}
	} catch (err) {
		exportStatus = err instanceof Error ? err.message : "export failed";
	}
}

function handleFileSelect(event: Event) {
	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		importFile = target.files[0];
		importStatus = "";
	}
}

async function handleImport() {
	if (!importFile) {
		importStatus = "please select a file";
		return;
	}

	importStatus = "importing...";
	try {
		const content = await importFile.text();
		JSON.parse(content);

		const formData = new FormData();
		formData.append("importData", content);

		const response = await fetch("?/importData", {
			method: "POST",
			body: formData,
		});

		const result = await response.json();

		if (result.type === "success" && typeof result.data === "string") {
			const parsed = JSON.parse(result.data);
			const stats = deserializeSvelteKitData(parsed);
			const parts = [`${stats.groupsCreated ?? 0} groups`, `${stats.servicesCreated ?? 0} services`];
			if (stats.groupsRenamed) parts.push(`${stats.groupsRenamed} renamed`);
			importStatus = `imported: ${parts.join(", ")}`;
			resetFileInput();
		} else if (result.type === "failure" && typeof result.data === "string") {
			const parsed = JSON.parse(result.data);
			const data = deserializeSvelteKitData(parsed);
			importStatus = (data.error as string) || "import failed";
			resetFileInput();
		} else {
			importStatus = "import failed";
			resetFileInput();
		}
	} catch (err) {
		importStatus = err instanceof Error ? err.message : "invalid json file";
		resetFileInput();
	}
}
</script>

<section class="settings-section">
	<h3>export</h3>
	<p class="section-description">export groups and services to a json file</p>

	<div class="export-options">
		<div class="checkbox-group">
			<label class="checkbox-label">
				<input type="radio" name="exportType" value="global" bind:group={exportType} />
				global
			</label>
			<label class="checkbox-label">
				<input type="radio" name="exportType" value="group" bind:group={exportType} />
				single group
			</label>
		</div>

		{#if exportType === "group"}
			<div class="select-group">
				<label for="exportGroup">group</label>
				<select id="exportGroup" bind:value={selectedGroup}>
					<option value="">select a group</option>
					{#each groups as group (group.id)}
						<option value={group.name}>{group.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<button
			type="button"
			class="btn btn-primary"
			onclick={handleExport}
			disabled={exportType === "group" && !selectedGroup}
		>
			export
		</button>

		{#if exportStatus}
			<p class="status-message">{exportStatus}</p>
		{/if}
	</div>
</section>

<section class="settings-section">
	<h3>import</h3>
	<p class="section-description">import groups and services from a json file</p>

	<div class="import-options">
		<div class="file-input">
			<input
				type="file"
				accept=".json,application/json"
				onchange={handleFileSelect}
				id="importFile"
				bind:this={fileInputEl}
			/>
			<label for="importFile" class="btn btn-secondary">
				{importFile ? importFile.name : "choose file"}
			</label>
		</div>

		<button
			type="button"
			class="btn btn-primary"
			onclick={handleImport}
			disabled={!importFile}
		>
			import
		</button>

		{#if importStatus}
			<p class="status-message">{importStatus}</p>
		{/if}
	</div>

</section>
