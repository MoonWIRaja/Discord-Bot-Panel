<script lang="ts">
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    
    let logs = $state<any[]>([]);
    let loading = $state(true);
    let pagination = $state({ page: 1, limit: 50, total: 0, pages: 0 });
    
    onMount(async () => {
        await loadLogs();
    });
    
    async function loadLogs() {
        loading = true;
        try {
            const response = await api.get(`/admin/logs?page=${pagination.page}`);
            logs = response.logs;
            pagination = response.pagination;
        } catch (error) {
            console.error('Failed to load logs:', error);
        } finally {
            loading = false;
        }
    }
    
    function getActionColor(action: string): string {
        if (action.includes('delete')) return 'text-red-400';
        if (action.includes('create')) return 'text-emerald-400';
        if (action.includes('update')) return 'text-blue-400';
        if (action.includes('login')) return 'text-amber-400';
        return 'text-gray-400';
    }
</script>

<div class="flex flex-col gap-6">
    <div>
        <h1 class="text-2xl font-bold text-white">System Logs</h1>
        <p class="text-gray-500">View activity and system logs</p>
    </div>
    
    <!-- Logs Table -->
    <div class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <table class="w-full">
            <thead class="bg-dark-surface border-b border-dark-border">
                <tr>
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Time</th>
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Resource</th>
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Details</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-dark-border font-mono text-sm">
                {#if loading}
                    <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                {:else if logs.length === 0}
                    <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No logs yet</td></tr>
                {:else}
                    {#each logs as item}
                        <tr class="hover:bg-white/5">
                            <td class="px-6 py-3 text-gray-500">
                                {item.log?.createdAt ? new Date(item.log.createdAt).toLocaleString() : '-'}
                            </td>
                            <td class="px-6 py-3 {getActionColor(item.log?.action || '')}">
                                {item.log?.action || '-'}
                            </td>
                            <td class="px-6 py-3 text-white">
                                {item.user?.name || 'System'}
                            </td>
                            <td class="px-6 py-3 text-gray-400">
                                {item.log?.resource || '-'}
                                {#if item.log?.resourceId}
                                    <span class="text-gray-600">({item.log.resourceId.slice(0, 8)}...)</span>
                                {/if}
                            </td>
                            <td class="px-6 py-3 text-gray-500 max-w-xs truncate">
                                {item.log?.details ? JSON.stringify(item.log.details) : '-'}
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
        
        {#if pagination.pages > 1}
            <div class="px-6 py-4 border-t border-dark-border flex justify-between">
                <span class="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
                <div class="flex gap-2">
                    <button onclick={() => { pagination.page--; loadLogs(); }} disabled={pagination.page === 1} class="px-3 py-1 bg-dark-border rounded text-gray-400 disabled:opacity-50">Prev</button>
                    <button onclick={() => { pagination.page++; loadLogs(); }} disabled={pagination.page === pagination.pages} class="px-3 py-1 bg-dark-border rounded text-gray-400 disabled:opacity-50">Next</button>
                </div>
            </div>
        {/if}
    </div>
</div>
