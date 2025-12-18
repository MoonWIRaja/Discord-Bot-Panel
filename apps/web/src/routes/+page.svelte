<script lang="ts">
	import Navbar from '$lib/components/landing/Navbar.svelte';
	import Hero from '$lib/components/landing/Hero.svelte';
	import Features from '$lib/components/landing/Features.svelte';
	import DashboardPreview from '$lib/components/landing/DashboardPreview.svelte';
	import Footer from '$lib/components/landing/Footer.svelte';
</script>

<div class="bg-background-light dark:bg-background-dark min-h-screen font-display">
	<Navbar />
	<main>
		<Hero />
		<Features />
		<DashboardPreview />
	</main>
	<Footer />
</div>
