<script lang="ts">
    import { page } from '$app/stores';
    let { children } = $props();
    let id = $derived($page.params.id);
</script>

<div class="bg-bot-bg-light dark:bg-bot-bg-dark text-slate-900 dark:text-white overflow-hidden h-screen flex selection:bg-bot-primary selection:text-white font-display">
    <!-- SIDEBAR -->
    <aside class="hidden w-64 flex-col border-r border-slate-200 dark:border-bot-border bg-white dark:bg-[#111118] lg:flex shrink-0 transition-all duration-300">
        <div class="flex h-full flex-col justify-between p-4">
            <div class="flex flex-col gap-6">
                <!-- Brand / Current Context -->
                <div class="flex items-center gap-3 px-2">
                    <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-bot-primary/20" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuC-pRJnqDE_tPZc8h7gdNCO4nFfob7n934ZFa3MdOCEx0eGtnYmpo1LqRuxQxGexVuJzCgqo9De2TvQgpMRDZ50kl33REV0emf94YJnBJAFFaTDFnv-OuxeW3OdeBF8XMpA9rNNVgLDM9IH3LjQN4qvHp7u_nT7zfUa2uuFbTCvB5YUIR8Uxgf0vICGJwbq7Sd_nh7z743cdR0v2c3pk4Wk60u09JMKSDmX81RebZKn7h2V646c8ZuBKTeQZtBAaFG5vSL_BvmCL7fO");'></div>
                    <div class="flex flex-col">
                        <h1 class="text-base font-bold leading-tight dark:text-white">Dev Studio</h1>
                        <p class="text-slate-500 dark:text-[#9d9db9] text-xs font-medium">Pro Plan</p>
                    </div>
                </div>
                <!-- Navigation -->
                <nav class="flex flex-col gap-1">
                    <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-[#9d9db9] hover:bg-slate-100 dark:hover:bg-bot-surface-lighter transition-colors group" href="/dashboard">
                        <span class="material-symbols-outlined text-[20px] group-hover:text-bot-primary transition-colors">dashboard</span>
                        <span class="text-sm font-medium">Dashboard</span>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-[#9d9db9] hover:bg-slate-100 dark:hover:bg-bot-surface-lighter transition-colors group" href="/dashboard/bots">
                        <span class="material-symbols-outlined text-[20px] fill-1 group-hover:text-bot-primary transition-colors">smart_toy</span>
                        <span class="text-sm font-medium">My Bots</span>
                    </a>
                     <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-[#9d9db9] hover:bg-slate-100 dark:hover:bg-bot-surface-lighter transition-colors group" href="/bots/{id}/logs">
                        <span class="material-symbols-outlined text-[20px] group-hover:text-bot-primary transition-colors">description</span>
                        <span class="text-sm font-medium">Logs</span>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-[#9d9db9] hover:bg-slate-100 dark:hover:bg-bot-surface-lighter transition-colors group" href="/bots/{id}/settings">
                        <span class="material-symbols-outlined text-[20px] group-hover:text-bot-primary transition-colors">settings</span>
                        <span class="text-sm font-medium">Settings</span>
                    </a>
                     <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-[#9d9db9] hover:bg-slate-100 dark:hover:bg-bot-surface-lighter transition-colors group" href="/bots/{id}/studio">
                        <span class="material-symbols-outlined text-[20px] group-hover:text-bot-primary transition-colors">account_tree</span>
                        <span class="text-sm font-medium">Workflow Editor</span>
                    </a>
                </nav>
            </div>
             <!-- Bottom User Actions -->
            <div class="flex flex-col gap-2 border-t border-slate-200 dark:border-bot-border pt-4">
                <button class="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-[#9d9db9] hover:text-slate-900 dark:hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-[20px]">logout</span>
                    <span class="text-sm font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    </aside>
    <!-- MAIN CONTENT -->
    <main class="flex-1 flex flex-col h-full overflow-hidden relative">
        <header class="w-full h-16 shrink-0 border-b border-slate-200 dark:border-bot-border bg-white dark:bg-[#111118]/80 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm">
                <a class="text-slate-500 dark:text-[#9d9db9] hover:text-bot-primary transition-colors" href="/dashboard">Home</a>
                <span class="text-slate-400 dark:text-[#5f5f7a]">/</span>
                <a class="text-slate-500 dark:text-[#9d9db9] hover:text-bot-primary transition-colors" href="/dashboard/bots">My Bots</a>
                <span class="text-slate-400 dark:text-[#5f5f7a]">/</span>
                <span class="font-medium text-slate-900 dark:text-white">ModerationBot</span>
            </div>
            <div class="flex items-center gap-4">
                <button class="flex items-center gap-2 text-slate-500 dark:text-[#9d9db9] hover:text-bot-primary transition-colors">
                    <span class="material-symbols-outlined text-[20px]">notifications</span>
                </button>
                <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-bot-surface-lighter bg-cover bg-center" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBqI52vF7cfr3LYtpROBwWo2zN4AZ3dNhKL3uNe0ay5gy1vj4HTPJ4DUL94IjE5w9gZ7LXrzBjR5P0ORDXElw2Ej9s89D1QesHcKSzqhH_-cQyRdyFzrfSZ0LUK3P3FgVUZpdJU_bWw0mDIduR_pTZ9RcvY_0geul6YzstfPa6g_2gjZFbK6fksVrMwk1lj_I8T0eOJi2JtRFLIcuH_sanitae06eJctxoZ4jBH7gbNIkNzE4QiO6OyDfbLlHoI1K70v9NO1a6FL8qS");'></div>
            </div>
        </header>

        <div class="flex-1 overflow-y-auto p-6 md:p-10 lg:px-20 scroll-smooth">
            {@render children()}
        </div>
    </main>
</div>
