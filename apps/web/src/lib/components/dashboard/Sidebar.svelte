<script lang="ts">
    import { useSession, signOut } from '$lib/auth';
    import { scale } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    import { page } from '$app/stores';
    import { sidebarOpen, closeSidebar } from '$lib/stores/sidebar';
    
    const session = useSession();
    let showProfileMenu = $state(false);
    
    // Dynamic user limits from API
    let userLimits = $state<any>({
        plan: 'free',
        planEnabled: true,
        botLimit: 5,
        flowLimit: 10,
        ownedBotCount: 0,
        botLimitDisplay: '5',
        flowLimitDisplay: '10'
    });
    
    // Get user plan from session
    let userPlan = $derived(($session.data?.user as any)?.plan || 'free');
    let userRole = $derived(($session.data?.user as any)?.role || 'user');
    
    // Max bots from dynamic limits
    let maxBots = $derived(userLimits.botLimit === 0 ? Infinity : userLimits.botLimit);
    let botCount = $derived(userLimits.ownedBotCount); // Only owned bots
    
    // Plan enabled status
    let planEnabled = $derived(userLimits.planEnabled);
    
    // Plan display name - use from API for custom plans
    let planDisplayName = $derived(
        !planEnabled ? 'No Plan' :
        userLimits.planDisplayName || userPlan
    );
    
    // Plan color
    let planColor = $derived(
        !planEnabled ? 'bg-gray-500' :
        userPlan === 'unlimited' ? 'bg-amber-500' : 
        userPlan === 'pro' ? 'bg-emerald-500' : 'bg-indigo-500'
    );
    
    // Get current path for active state
    let currentPath = $derived($page.url.pathname);
    
    // Check if user is admin (you can adjust this logic based on your user model)
    let isAdmin = $derived($session.data?.user?.email === 'admin@example.com' || userRole === 'admin');

    onMount(async () => {
        try {
            // Fetch dynamic limits which includes owned bot count
            userLimits = await api.get('/bots/user/limits');
        } catch (e) {
            console.error("Failed to fetch user limits:", e);
        }
    });

    async function handleSignOut() {
        await signOut();
        window.location.href = '/login';
    }
    
    // Helper to check active state
    function isActive(path: string): boolean {
        if (path === '/dashboard') {
            return currentPath === '/dashboard';
        }
        return currentPath.startsWith(path);
    }
</script>

<!-- Mobile backdrop overlay -->
{#if $sidebarOpen}
    <button 
        onclick={closeSidebar}
        class="lg:hidden fixed inset-0 bg-black/50 z-30 cursor-default"
        aria-label="Close sidebar"
    ></button>
{/if}

<!-- Sidebar - hidden on mobile by default, shown when toggle is clicked -->
<aside class="
    w-64 bg-dark-surface border-r border-dark-border text-muted flex flex-col h-full shrink-0 transition-all duration-300 z-40
    fixed lg:relative
    top-0 bottom-0 left-0
    transform lg:transform-none
    {$sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
">
    <div class="h-16 flex items-center px-6 gap-3 text-white border-b border-dark-border">
        <div class="size-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-[20px]">smart_toy</span>
        </div>
        <h1 class="text-lg font-bold tracking-tight">BotPanel</h1>
    </div>
    <div class="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
        <p class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-3">Menu</p>
        <a onclick={closeSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {isActive('/dashboard') ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}" href="/dashboard">
            <span class="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
        </a>
        <a onclick={closeSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {isActive('/bots') ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}" href="/bots">
            <span class="material-symbols-outlined text-[20px]">robot_2</span>
            My Bots
        </a>
        <a onclick={closeSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {isActive('/templates') ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}" href="/templates">
            <span class="material-symbols-outlined text-[20px]">grid_view</span>
            Templates
        </a>
        {#if isAdmin}
            <a onclick={closeSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {isActive('/admin') ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'}" href="/admin">
                <span class="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                Admin Panel
            </a>
        {/if}
    </div>
    <div class="p-4 border-t border-dark-border relative">
        {#if $session.data}
            <button onclick={() => showProfileMenu = !showProfileMenu} class="w-full bg-dark-card rounded-xl p-3 flex flex-col gap-3 border border-dark-border hover:border-primary/50 transition-colors text-left group relative">
                <div class="flex items-center gap-3">
                    {#if $session.data.user.image}
                         <div class="size-10 rounded-full bg-cover bg-center ring-2 ring-dark-border group-hover:ring-primary/50 transition-all" style="background-image: url('{$session.data.user.image}')"></div>
                    {:else}
                         <div class="size-10 rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-dark-border group-hover:ring-primary/50 transition-all">
                             <span class="text-white font-bold">{$session.data.user.name.charAt(0)}</span>
                         </div>
                    {/if}
                    <div class="flex flex-col overflow-hidden flex-1">
                        <span class="text-white text-sm font-medium truncate">{$session.data.user.name}</span>
                        <span class="text-xs text-gray-500 truncate">{$session.data.user.email}</span>
                    </div>
                     <span class="material-symbols-outlined text-gray-500 group-hover:text-white transition-colors">unfold_more</span>
                </div>
                <!-- Plan Mini Bar -->
                <div class="flex flex-col gap-1.5 mt-1">
                    {#if planEnabled}
                        <div class="flex justify-between items-end text-[10px] uppercase font-bold tracking-wider">
                            <span class="{planColor.replace('bg-', 'text-')}">{planDisplayName}</span>
                            <span class="text-gray-500">{botCount}/{maxBots === Infinity ? '∞' : maxBots} Bots</span>
                        </div>
                        <div class="h-1 w-full bg-dark-border rounded-full overflow-hidden">
                            <div class="h-full {planColor} rounded-full" style="width: {maxBots === Infinity ? 0 : Math.min(botCount / maxBots * 100, 100)}%"></div>
                        </div>
                    {:else}
                        <div class="flex justify-between items-end text-[10px] uppercase font-bold tracking-wider">
                            <span class="text-gray-500">No Plan</span>
                            <a href="/settings/billing" class="text-primary hover:underline">Upgrade</a>
                        </div>
                        <div class="h-1 w-full bg-red-500/30 rounded-full"></div>
                    {/if}
                </div>
            </button>
        {:else}
            <div class="animate-pulse flex items-center gap-3 p-2">
                <div class="size-10 rounded-full bg-white/5"></div>
                 <div class="flex-1 space-y-2">
                    <div class="h-3 w-20 bg-white/5 rounded"></div>
                    <div class="h-2 w-16 bg-white/5 rounded"></div>
                 </div>
            </div>
        {/if}
    </div>
</aside>

{#if showProfileMenu && $session.data}
    <!-- Backdrop -->
    <button type="button" class="fixed inset-0 z-30 cursor-default" onclick={() => showProfileMenu = false} aria-label="Close menu"></button>
    
    <!-- Profile Popover -->
    <div transition:scale={{duration: 200, start: 0.95}} class="fixed bottom-24 left-6 w-80 bg-[#151515] border border-gray-800 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="p-6 bg-gradient-to-br from-indigo-900/20 to-transparent border-b border-white/5">
             <div class="flex items-center gap-4">
                 {#if $session.data.user.image}
                    <img src={$session.data.user.image} alt="Profile" class="size-16 rounded-full border-4 border-[#151515] shadow-xl"/>
                 {:else}
                    <div class="size-16 rounded-full bg-gray-700 flex items-center justify-center border-4 border-[#151515] shadow-xl">
                        <span class="text-2xl font-bold text-white">{$session.data.user.name.charAt(0)}</span>
                    </div>
                 {/if}
                 <div>
                     <h3 class="font-bold text-white text-lg">{$session.data.user.name}</h3>
                     <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold {planColor} text-white uppercase tracking-wider">{planDisplayName}</span>
                 </div>
             </div>
        </div>

        <!-- Plan Upsell -->
        <div class="p-5 border-b border-white/5">
            <div class="flex justify-between items-center mb-3">
                <span class="text-sm font-medium text-gray-300">Plan Usage</span>
            </div>
             <div class="space-y-3">
                 <div>
                     <div class="flex justify-between text-xs mb-1">
                         <span class="text-gray-400">Bots</span>
                         <span class="text-white">{botCount} / {maxBots === Infinity ? '∞' : maxBots}</span>
                     </div>
                     <div class="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                         <div class="h-full bg-indigo-500 rounded-full" style="width: {Math.min(botCount / maxBots * 100, 100)}%"></div>
                     </div>
                 </div>
             </div>
             
             <button class="mt-4 w-full py-2 bg-white text-black font-bold text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                 <span class="material-symbols-outlined text-[18px]">bolt</span>
                 Upgrade to Pro
             </button>
        </div>

        <!-- Menu Links -->
        <div class="p-2 space-y-1">
            <a href="/settings/profile" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <span class="material-symbols-outlined text-[18px]">settings</span>
                Settings
            </a>
            <div class="h-px bg-white/5 my-1 mx-2"></div>
            <button onclick={handleSignOut} class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                <span class="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
            </button>
        </div>
    </div>
{/if}
