<script lang="ts">
</script>

<div class="bg-slate-50 dark:bg-bot-bg-dark text-slate-900 dark:text-white font-display overflow-x-hidden min-h-screen flex flex-col">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-bot-border bg-white dark:bg-bot-bg-dark/95 backdrop-blur px-6 py-3 h-16">
        <div class="flex items-center gap-4">
            <div class="flex items-center justify-center size-8 bg-bot-primary/10 rounded-lg text-bot-primary">
                <span class="material-symbols-outlined text-2xl">smart_toy</span>
            </div>
            <h2 class="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">BotPanel Studio</h2>
        </div>
        <nav class="hidden md:flex items-center gap-6 ml-10">
            <a class="text-sm font-medium text-slate-500 hover:text-bot-primary dark:text-[#9d9db9] dark:hover:text-white transition-colors" href="#">Products</a>
            <a class="text-sm font-medium text-slate-500 hover:text-bot-primary dark:text-[#9d9db9] dark:hover:text-white transition-colors" href="#">Community</a>
            <a class="text-sm font-medium text-slate-900 dark:text-white" href="#">Documentation</a>
        </nav>
        <div class="flex flex-1 justify-end gap-4 items-center">
            <a href="/dashboard" class="flex items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-bot-primary text-white text-sm font-bold shadow-lg shadow-bot-primary/20 hover:bg-blue-700 transition-colors">
                <span class="truncate">Go to Dashboard</span>
            </a>
            <div class="bg-center bg-no-repeat bg-cover rounded-full size-9 border border-slate-200 dark:border-bot-border cursor-pointer ml-2" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBqI52vF7cfr3LYtpROBwWo2zN4AZ3dNhKL3uNe0ay5gy1vj4HTPJ4DUL94IjE5w9gZ7LXrzBjR5P0ORDXElw2Ej9s89D1QesHcKSzqhH_-cQyRdyFzrfSZ0LUK3P3FgVUZpdJU_bWw0mDIduR_pTZ9RcvY_0geul6YzstfPa6g_2gjZFbK6fksVrMwk1lj_I8T0eOJi2JtRFLIcuH_sanitae06eJctxoZ4jBH7gbNIkNzE4QiO6OyDfbLlHoI1K70v9NO1a6FL8qS");'></div>
        </div>
    </header>

    <div class="flex flex-1 max-w-[1440px] mx-auto w-full">
        <!-- Sidebar -->
        <aside class="hidden lg:flex flex-col w-72 h-[calc(100vh-64px)] sticky top-16 border-r border-slate-200 dark:border-bot-border bg-white dark:bg-bot-surface overflow-y-auto">
            <div class="p-4 flex flex-col gap-6">
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9d9db9] material-symbols-outlined text-[20px]">search</span>
                    <input class="w-full bg-slate-50 dark:bg-bot-border text-slate-900 dark:text-white rounded-lg h-10 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-bot-primary border border-slate-200 dark:border-transparent placeholder:text-slate-400 dark:placeholder:text-[#9d9db9]/70" placeholder="Search docs..."/>
                </div>
                <nav class="flex flex-col gap-6">
                    <div>
                        <h3 class="px-3 text-xs font-bold text-slate-400 dark:text-[#9d9db9] uppercase tracking-wider mb-2">Getting Started</h3>
                        <ul class="flex flex-col gap-1">
                            <li><a class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-bot-border rounded-md transition-colors" href="#">Installation</a></li>
                            <li><a class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-bot-border rounded-md transition-colors" href="#">Your First Bot</a></li>
                        </ul>
                    </div>
                     <div>
                        <h3 class="px-3 text-xs font-bold text-slate-400 dark:text-[#9d9db9] uppercase tracking-wider mb-2">Verbs Reference</h3>
                        <ul class="flex flex-col gap-1">
                            <li>
                                <a class="flex items-center justify-between px-3 py-2 text-sm font-medium text-bot-primary bg-bot-primary/10 dark:bg-bot-primary/20 rounded-md transition-colors" href="#">
                                    <span>Logic Verbs</span>
                                    <span class="material-symbols-outlined text-[16px]">call_split</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </nav>
            </div>
             <div class="mt-auto p-4 border-t border-slate-200 dark:border-bot-border bg-white dark:bg-bot-surface">
                <a class="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-bot-primary dark:hover:border-bot-primary hover:bg-bot-primary/5 transition-colors group" href="#">
                    <span class="material-symbols-outlined text-slate-400 dark:text-[#9d9db9] group-hover:text-bot-primary">help</span>
                    <div class="flex flex-col">
                        <span class="text-sm font-medium text-slate-900 dark:text-white">Need help?</span>
                        <span class="text-xs text-slate-500 dark:text-[#9d9db9]">Join our Discord community</span>
                    </div>
                </a>
            </div>
        </aside>

        <!-- Content -->
        <main class="flex-1 min-w-0 px-4 py-8 md:px-12 md:py-10">
            <div class="max-w-4xl mx-auto">
                <nav class="flex flex-wrap gap-2 mb-6 text-sm">
                    <a class="text-slate-500 dark:text-[#9d9db9] hover:text-bot-primary transition-colors" href="#">Docs</a>
                    <span class="text-slate-400 dark:text-[#9d9db9]/50">/</span>
                    <a class="text-slate-500 dark:text-[#9d9db9] hover:text-bot-primary transition-colors" href="#">Verbs Reference</a>
                    <span class="text-slate-400 dark:text-[#9d9db9]/50">/</span>
                    <span class="font-medium text-slate-900 dark:text-white">Logic Verbs</span>
                </nav>

                <header class="mb-10 pb-6 border-b border-slate-200 dark:border-bot-border">
                    <h1 class="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Using Logic Verbs</h1>
                    <p class="text-lg text-slate-600 dark:text-[#9d9db9] leading-relaxed max-w-2xl">
                        Control the flow of your bot with conditional logic blocks. Create complex interactions by chaining If/Else statements, loops, and randomized outcomes.
                    </p>
                </header>
                
                <article class="prose prose-slate dark:prose-invert max-w-none">
                     <div class="mb-12">
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                            <span class="flex items-center justify-center size-8 rounded bg-bot-primary text-white shadow-lg shadow-bot-primary/30">
                                <span class="material-symbols-outlined text-xl">call_split</span>
                            </span>
                            The "If/Else" Verb
                        </h2>
                        <p class="text-slate-600 dark:text-slate-300 leading-7 mb-6">
                            The <strong>If/Else</strong> verb is the fundamental building block of logic in BotPanel. It allows your bot to make decisions based on variables, user roles, channel types, or random chance.
                        </p>
                        <!-- Visual Preview -->
                        <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-bot-border bg-slate-100 dark:bg-bot-surface mb-8">
                            <div class="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-bot-border bg-slate-50 dark:bg-bot-surface-lighter">
                                <span class="text-xs font-medium text-slate-500 dark:text-[#9d9db9]">Visual Editor Preview</span>
                                <div class="flex gap-1.5">
                                    <div class="size-2 rounded-full bg-red-400/50"></div>
                                    <div class="size-2 rounded-full bg-amber-400/50"></div>
                                    <div class="size-2 rounded-full bg-green-400/50"></div>
                                </div>
                            </div>
                            <div class="p-8 flex justify-center items-center bg-dots-pattern aspect-[2/1] relative">
                                <div class="absolute inset-0 bg-cover bg-center opacity-80" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuA89o684_3LzWAWVJc_PMdmKgLdMZ0vhWx09Y_TdCcgcQVpVItuhsuRBmRbbb-rdl-_zEZNLlxDomFN61OtqyNwzp_GQHSHpKYt01FooadkbOaYn2vZ2Zg5eGYzFKOWlG3rW_bbUIJrTSjeWPKOBhAjBvmxIX-bsb4zlSUMOYcvqVEYKuAeOehi_R2tvzdS-WOtcza0ZWIoV2Bv0t-6RhrTIAs-WKgBKH1pomrrfwdfeaBo3tTj5hEXhFxg2J7hQFjGXPbeCC85swKs');"></div>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </main>
    </div>
</div>
