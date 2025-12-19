<script lang="ts">
    import Sidebar from '$lib/components/dashboard/Sidebar.svelte';
    import Header from '$lib/components/dashboard/Header.svelte';
    let { children } = $props();
</script>

<div class="bg-dark-base font-display text-main overflow-hidden h-screen flex selection:bg-primary selection:text-white">
    <Sidebar />
    <main class="flex-1 flex flex-col h-full min-w-0 bg-dark-base relative">
        <Header />
        <div class="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
            {@render children()}
        </div>
    </main>
</div>
