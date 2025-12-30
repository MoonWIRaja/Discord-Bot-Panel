<script lang="ts">
    import { useSession } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    
    const session = useSession();
    
    // Get user role from session
    let userRole = $derived(($session.data?.user as any)?.role || 'user');
    let userPlan = $derived(($session.data?.user as any)?.plan || 'free');
    
    // Stats from API
    let stats = $state({
        users: 0,
        bots: 0,
        activeBots: 0,
        transactions: 0,
        revenue: 0
    });
    let loading = $state(true);
    
    // Redirect non-admins and load stats
    onMount(async () => {
        if ($session.data && userRole !== 'admin') {
            goto('/dashboard');
            return;
        }
        
        // Load stats from API
        try {
            const data = await api.get('/admin/stats');
            stats = data;
        } catch (error) {
            console.error('Failed to load admin stats:', error);
        } finally {
            loading = false;
        }
    });
</script>

<div class="mx-auto max-w-5xl flex flex-col gap-8 pb-32">
    <div class="mb-2">
        <div class="flex items-center gap-3 mb-3">
            <div class="p-2 bg-amber-500/20 rounded-lg">
                <span class="material-symbols-outlined text-[28px] text-amber-500">admin_panel_settings</span>
            </div>
            <div>
                <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-white">Admin Panel</h1>
                <p class="text-amber-400 text-sm font-medium">System Administration</p>
            </div>
        </div>
        <p class="text-gray-500 text-base md:text-lg max-w-2xl">
            Manage system settings, users, and monitor platform activity.
        </p>
    </div>

    <!-- Admin Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-dark-card rounded-xl border border-dark-border p-5">
            <div class="flex items-center gap-3 mb-3">
                <div class="p-2 bg-blue-500/10 rounded-lg">
                    <span class="material-symbols-outlined text-blue-400">group</span>
                </div>
                <span class="text-sm font-medium text-gray-400">Total Users</span>
            </div>
            {#if loading}
                <p class="text-3xl font-bold text-gray-600">...</p>
            {:else}
                <p class="text-3xl font-bold text-white">{stats.users}</p>
            {/if}
            <p class="text-xs text-gray-500 mt-1">Registered accounts</p>
        </div>
        
        <div class="bg-dark-card rounded-xl border border-dark-border p-5">
            <div class="flex items-center gap-3 mb-3">
                <div class="p-2 bg-emerald-500/10 rounded-lg">
                    <span class="material-symbols-outlined text-emerald-400">robot_2</span>
                </div>
                <span class="text-sm font-medium text-gray-400">Total Bots</span>
            </div>
            {#if loading}
                <p class="text-3xl font-bold text-gray-600">...</p>
            {:else}
                <p class="text-3xl font-bold text-white">{stats.bots}</p>
            {/if}
            <p class="text-xs text-gray-500 mt-1">{stats.activeBots} currently online</p>
        </div>
        
        <div class="bg-dark-card rounded-xl border border-dark-border p-5">
            <div class="flex items-center gap-3 mb-3">
                <div class="p-2 bg-purple-500/10 rounded-lg">
                    <span class="material-symbols-outlined text-purple-400">receipt_long</span>
                </div>
                <span class="text-sm font-medium text-gray-400">Transactions</span>
            </div>
            {#if loading}
                <p class="text-3xl font-bold text-gray-600">...</p>
            {:else}
                <p class="text-3xl font-bold text-white">{stats.transactions}</p>
            {/if}
            <p class="text-xs text-gray-500 mt-1">Completed payments</p>
        </div>
        
        <div class="bg-dark-card rounded-xl border border-dark-border p-5">
            <div class="flex items-center gap-3 mb-3">
                <div class="p-2 bg-amber-500/10 rounded-lg">
                    <span class="material-symbols-outlined text-amber-400">payments</span>
                </div>
                <span class="text-sm font-medium text-gray-400">Revenue</span>
            </div>
            {#if loading}
                <p class="text-3xl font-bold text-gray-600">...</p>
            {:else}
                <p class="text-3xl font-bold text-white">RM {(stats.revenue / 100).toFixed(2)}</p>
            {/if}
            <p class="text-xs text-gray-500 mt-1">Total earnings</p>
        </div>
    </div>

    <!-- Quick Actions -->
    <section class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div class="px-6 py-5 border-b border-dark-border flex items-center gap-3">
            <div class="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <span class="material-symbols-outlined">bolt</span>
            </div>
            <h2 class="text-lg font-semibold text-white">Quick Actions</h2>
        </div>
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/admin/users" class="flex items-center gap-4 p-4 bg-dark-base rounded-lg border border-dark-border hover:border-amber-500/50 transition-colors group">
                <div class="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <span class="material-symbols-outlined text-blue-400">manage_accounts</span>
                </div>
                <div>
                    <h3 class="font-semibold text-white">Manage Users</h3>
                    <p class="text-sm text-gray-500">View and manage user accounts</p>
                </div>
            </a>
            
            <a href="/admin/bots" class="flex items-center gap-4 p-4 bg-dark-base rounded-lg border border-dark-border hover:border-amber-500/50 transition-colors group">
                <div class="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <span class="material-symbols-outlined text-emerald-400">smart_toy</span>
                </div>
                <div>
                    <h3 class="font-semibold text-white">All Bots</h3>
                    <p class="text-sm text-gray-500">Monitor all bots in system</p>
                </div>
            </a>
            
            <a href="/admin/logs" class="flex items-center gap-4 p-4 bg-dark-base rounded-lg border border-dark-border hover:border-amber-500/50 transition-colors group">
                <div class="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <span class="material-symbols-outlined text-purple-400">terminal</span>
                </div>
                <div>
                    <h3 class="font-semibold text-white">System Logs</h3>
                    <p class="text-sm text-gray-500">View activity and error logs</p>
                </div>
            </a>
            
            <a href="/admin/settings" class="flex items-center gap-4 p-4 bg-dark-base rounded-lg border border-dark-border hover:border-amber-500/50 transition-colors group">
                <div class="p-3 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                    <span class="material-symbols-outlined text-amber-400">settings</span>
                </div>
                <div>
                    <h3 class="font-semibold text-white">System Settings</h3>
                    <p class="text-sm text-gray-500">Configure platform settings</p>
                </div>
            </a>
        </div>
    </section>

    <!-- System Info -->
    <section class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div class="px-6 py-5 border-b border-dark-border flex items-center gap-3">
            <div class="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <span class="material-symbols-outlined">info</span>
            </div>
            <h2 class="text-lg font-semibold text-white">System Information</h2>
        </div>
        <div class="p-6">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Version</p>
                    <p class="text-white font-medium">2.0.0</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Environment</p>
                    <p class="text-white font-medium">Production</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Role</p>
                    <p class="text-amber-400 font-medium uppercase">{userRole}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Plan</p>
                    <p class="text-amber-400 font-medium uppercase">{userPlan}</p>
                </div>
            </div>
        </div>
    </section>
</div>
