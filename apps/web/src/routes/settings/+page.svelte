<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    
    // Redirect to profile page as default settings page
    onMount(() => {
        goto('/settings/profile', { replaceState: true });
    });
</script>

<div class="flex items-center justify-center h-full">
    <div class="animate-pulse flex items-center gap-3 text-gray-400">
        <span class="material-symbols-outlined animate-spin">progress_activity</span>
        <span>Loading settings...</span>
    </div>
</div>
