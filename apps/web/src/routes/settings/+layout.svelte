<script lang="ts">
    import { page } from '$app/stores';
    let { children } = $props();
    let currentPath = $derived($page.url.pathname);
</script>

<div class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased overflow-hidden h-screen flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-bot-border bg-white dark:bg-[#18181b] px-6 py-3 shrink-0 z-20">
        <div class="flex items-center gap-4">
            <a href="/dashboard" class="size-8 text-bot-primary flex items-center justify-center bg-bot-primary/10 rounded-lg hover:bg-bot-primary/20 transition-colors">
                <span class="material-symbols-outlined text-2xl">smart_toy</span>
            </a>
            <h2 class="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">BotPanel</h2>
        </div>
        <div class="flex flex-1 justify-end gap-6">
            <div class="flex gap-2">
                <button class="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-bot-border text-slate-900 dark:text-white transition-colors hover:bg-slate-200 dark:hover:bg-bot-surface">
                    <span class="material-symbols-outlined">notifications</span>
                </button>
                <button class="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-bot-border text-slate-900 dark:text-white transition-colors hover:bg-slate-200 dark:hover:bg-bot-surface">
                    <span class="material-symbols-outlined">help</span>
                </button>
            </div>
            <div class="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-slate-200 dark:ring-bot-border" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuA8yhdsfa2533TJaea4WGrH243s5Vdn6J4X2b0duXi982TYr5AX2XbN-POQ-v7UrVXU20rg4q1947WPk0Uyiry4XfHZy20bj_QK6_C1W3qRexNXQ9MfPXudApFy0qtItq__yBT3YE74ot9mJcdvAjoC-QVZM8m2HoI6mSFVXrOSn5JB9ovwc-ACZgWE_xKMQvNgPrqDbanD2CkGSO21ZlqeJt0vHaZcL0O7cO1d9Ta_El8v1xZRRUSW96fAJOSHTpXHR022J-T0IYwY");'></div>
        </div>
    </header>
    
    <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 lg:w-72 border-r border-slate-200 dark:border-bot-border bg-white dark:bg-[#18181b] flex-col hidden md:flex shrink-0">
            <div class="flex h-full flex-col justify-between p-4">
                <div class="flex flex-col gap-4">
                    <div class="px-2">
                        <h1 class="text-slate-500 dark:text-[#a1a1aa] text-xs font-bold uppercase tracking-wider leading-normal">Settings</h1>
                    </div>
                    <nav class="flex flex-col gap-1">
                        <a href="/settings/profile" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {currentPath === '/settings/profile' ? 'bg-bot-primary/10 text-bot-primary' : 'text-slate-600 dark:text-[#a1a1aa] hover:bg-slate-100 dark:hover:bg-bot-surface'} transition-colors group">
                            <span class="material-symbols-outlined {currentPath === '/settings/profile' ? 'fill-1' : ''} group-hover:text-slate-900 dark:group-hover:text-white transition-colors">person</span>
                            <p class="text-sm font-medium leading-normal group-hover:text-slate-900 dark:group-hover:text-white transition-colors {currentPath === '/settings/profile' ? 'font-bold' : ''}">Profile</p>
                        </a>
                        <a href="/settings/account" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {currentPath === '/settings/account' ? 'bg-bot-primary/10 text-bot-primary' : 'text-slate-600 dark:text-[#a1a1aa] hover:bg-slate-100 dark:hover:bg-bot-surface'} transition-colors group">
                            <span class="material-symbols-outlined {currentPath === '/settings/account' ? 'fill-1' : ''} group-hover:text-slate-900 dark:group-hover:text-white transition-colors">shield</span>
                            <p class="text-sm font-medium leading-normal group-hover:text-slate-900 dark:group-hover:text-white transition-colors {currentPath === '/settings/account' ? 'font-bold' : ''}">Account Security</p>
                        </a>
                         <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-[#a1a1aa] hover:bg-slate-100 dark:hover:bg-bot-surface transition-colors group">
                            <span class="material-symbols-outlined group-hover:text-slate-900 dark:group-hover:text-white transition-colors">credit_card</span>
                            <p class="text-sm font-medium leading-normal group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Billing</p>
                        </a>
                         <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-[#a1a1aa] hover:bg-slate-100 dark:hover:bg-bot-surface transition-colors group">
                            <span class="material-symbols-outlined group-hover:text-slate-900 dark:group-hover:text-white transition-colors">api</span>
                            <p class="text-sm font-medium leading-normal group-hover:text-slate-900 dark:group-hover:text-white transition-colors">API Keys</p>
                        </a>
                    </nav>
                </div>
                <div class="px-2 pb-2">
                    <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors" href="/login">
                        <span class="material-symbols-outlined">logout</span>
                        <p class="text-sm font-medium leading-normal">Log Out</p>
                    </a>
                </div>
            </div>
        </aside>
        
        <main class="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-8 lg:px-12 xl:px-24">
             {@render children()}
        </main>
    </div>
</div>
