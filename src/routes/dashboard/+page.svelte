<script lang="ts">
import { UserMenu } from "$lib";
import type { PageData } from "./$types";
import "./page.css";

const { data }: { data: PageData } = $props();
</script>

<div class="container">
	<header class="header">
		<h1><span class="brand">atums</span>/status</h1>
		<nav class="nav">
			<a href="/" class="nav-link">index</a>
			<a href="/services" class="nav-link">services</a>
			<a href="https://heliopolis.live/atums/status" target="_blank" rel="noopener noreferrer" class="nav-link">source</a>
		</nav>
		<UserMenu user={data.user} />
	</header>

	<main class="main">
		<div class="welcome">
			<h2>Welcome back, {data.user.username}</h2>
			<p>Your services will appear here once configured.</p>
			<a href="/services" class="btn configure-btn">configure services</a>
		</div>
	</main>
</div>
