<script lang="ts">
    let { children } = $props();
</script>

<!-- Studio uses its own full-page layout without the dashboard sidebar -->
<div class="bg-dark-base font-display text-white overflow-hidden h-screen flex flex-col selection:bg-primary selection:text-white">
    {@render children()}
</div>
