<script lang="ts">
    import { page } from '$app/stores';
    import { useSession, signOut } from '$lib/auth';
    let { children } = $props();
    let currentPath = $derived($page.url.pathname);
    const session = useSession();
    
    // Mobile sidebar toggle
    let showSidebar = $state(false);

    async function handleSignOut() {
        await signOut();
        window.location.href = '/login';
    }
    
    // Close sidebar on navigation
    function closeSidebar() {
        showSidebar = false;
    }
</script>

<div class="bg-dark-base font-display text-white antialiased overflow-hidden h-screen flex">
    <!-- Mobile backdrop -->
    {#if showSidebar}
        <button 
            onclick={closeSidebar}
            class="lg:hidden fixed inset-0 bg-black/50 z-30"
            aria-label="Close sidebar"
        ></button>
    {/if}
    
    <!-- Main Sidebar -->
    <aside class="
        w-64 bg-dark-surface border-r border-dark-border flex flex-col h-full shrink-0 z-40
        fixed lg:relative
        transform lg:transform-none transition-transform duration-300
        {showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    ">
        <div class="h-16 flex items-center px-6 gap-3 text-white border-b border-dark-border">
            <a href="/dashboard" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div class="size-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <span class="material-symbols-outlined text-[20px]">smart_toy</span>
                </div>
                <h1 class="text-lg font-bold tracking-tight">BotPanel</h1>
            </a>
        </div>
        <div class="flex-1 flex flex-col p-4 overflow-y-auto">
            <p class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 px-3">Settings</p>
            <nav class="flex flex-col gap-1">
                <a onclick={closeSidebar} href="/settings/profile" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/settings/profile' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">person</span>
                    Profile
                </a>
                <a onclick={closeSidebar} href="/settings/account" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/settings/account' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">shield</span>
                    Account Security
                </a>
                <a onclick={closeSidebar} href="/settings/billing" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/settings/billing' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">credit_card</span>
                    Billing
                </a>
                <a onclick={closeSidebar} href="/settings/api-keys" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {currentPath === '/settings/api-keys' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">api</span>
                    API Keys
                </a>
            </nav>
        </div>
        <div class="p-4 border-t border-dark-border space-y-2">
            <a onclick={closeSidebar} href="/dashboard" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
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
        <header class="h-16 bg-dark-surface border-b border-dark-border flex items-center justify-between px-4 lg:px-6 shrink-0">
            <div class="flex items-center gap-2">
                <!-- Mobile hamburger menu -->
                <button 
                    onclick={() => showSidebar = !showSidebar}
                    class="lg:hidden flex items-center justify-center size-10 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors mr-2"
                    aria-label="Toggle menu"
                >
                    <span class="material-symbols-outlined text-[24px]">
                        {showSidebar ? 'close' : 'menu'}
                    </span>
                </button>
                <h2 class="text-base lg:text-lg font-bold">Settings</h2>
            </div>
            <div class="flex items-center gap-4">
                {#if $session.data}
                    <div class="flex items-center gap-3">
                        {#if $session.data.user.image}
                            <div class="size-9 rounded-full bg-cover bg-center ring-2 ring-dark-border" style="background-image: url('{$session.data.user.image}')"></div>
                        {:else}
                            <div class="size-9 rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-dark-border">
                                <span class="text-white font-bold text-sm">{$session.data.user.name.charAt(0)}</span>
                            </div>
                        {/if}
                        <span class="text-sm text-gray-400 hidden sm:inline">{$session.data.user.name}</span>
                    </div>
                {/if}
            </div>
        </header>
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
            {@render children()}
        </div>
    </main>
</div>
