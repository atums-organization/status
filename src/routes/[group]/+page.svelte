<script lang="ts">
	import { StatusPage } from "$lib";
	import type { PageData } from "./$types";
	import "../page.css";

	let { data }: { data: PageData } = $props();
</script>

<StatusPage {data} form={null} />
