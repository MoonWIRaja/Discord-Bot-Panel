<script lang="ts">
    import { page } from '$app/stores';
    import { useSession, signOut } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    let { children } = $props();
    let currentPath = $derived($page.url.pathname);
    const session = useSession();
    
    // Get user role from session
    let userRole = $derived(($session.data?.user as any)?.role || 'user');
    
    // Redirect non-admins
    $effect(() => {
        if ($session.data && userRole !== 'admin') {
            goto('/dashboard');
        }
    });

    async function handleSignOut() {
        await signOut();
        window.location.href = '/login';
    }
</script>

<div class="bg-dark-base font-display text-white antialiased overflow-hidden h-screen flex">
    <!-- Admin Sidebar -->
    <aside class="w-64 bg-dark-surface border-r border-dark-border flex flex-col h-full shrink-0">
        <div class="h-16 flex items-center px-6 gap-3 text-white border-b border-dark-border">
            <a href="/dashboard" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div class="size-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <span class="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                </div>
                <div>
                    <h1 class="text-lg font-bold tracking-tight">Admin Panel</h1>
                </div>
            </a>
        </div>
        <div class="flex-1 flex flex-col p-4 overflow-y-auto">
            <p class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 px-3">Administration</p>
            <nav class="flex flex-col gap-1">
                <a href="/admin" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/admin' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">dashboard</span>
                    Overview
                </a>
                <a href="/admin/users" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/admin/users' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">group</span>
                    Users
                </a>
                <a href="/admin/bots" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/admin/bots' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">smart_toy</span>
                    All Bots
                </a>
                <a href="/admin/logs" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/admin/logs' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">terminal</span>
                    System Logs
                </a>
                <a href="/admin/settings" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/admin/settings' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">settings</span>
                    Settings
                </a>
            </nav>
        </div>
        <div class="p-4 border-t border-dark-border space-y-2">
            <a href="/dashboard" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Dashboard
            </a>
            <button onclick={handleSignOut} class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                <span class="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
            </button>
        </div>
    </aside>
    
    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-full min-w-0 bg-dark-base relative">
        <!-- Header -->
        <header class="h-16 bg-dark-surface border-b border-dark-border flex items-center justify-between px-6 shrink-0">
            <div class="flex items-center gap-2">
                <span class="text-amber-500 text-xs font-bold uppercase tracking-wider px-2 py-1 bg-amber-500/10 rounded">Admin</span>
                <h2 class="text-lg font-bold">Administration</h2>
            </div>
            <div class="flex items-center gap-4">
                {#if $session.data}
                    <div class="flex items-center gap-3">
                        {#if $session.data.user.image}
                            <div class="size-9 rounded-full bg-cover bg-center ring-2 ring-amber-500/30" style="background-image: url('{$session.data.user.image}')"></div>
                        {:else}
                            <div class="size-9 rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-amber-500/30">
                                <span class="text-white font-bold text-sm">{$session.data.user.name.charAt(0)}</span>
                            </div>
                        {/if}
                        <span class="text-sm text-gray-400">{$session.data.user.name}</span>
                    </div>
                {/if}
            </div>
        </header>
        <div class="flex-1 overflow-y-auto p-6 lg:p-10">
            {@render children()}
        </div>
    </main>
</div>
