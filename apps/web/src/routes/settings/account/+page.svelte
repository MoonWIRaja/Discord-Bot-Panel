<script lang="ts">
</script>

<div class="mx-auto max-w-5xl flex flex-col gap-8 pb-32">
     <div class="mb-2">
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">Account Settings</h1>
        <p class="text-slate-500 dark:text-[#a1a1aa] text-base md:text-lg max-w-2xl">
            Manage your security preferences, authentication methods, and connected services.
        </p>
    </div>

    <!-- Password Section -->
    <section class="bg-white dark:bg-[#1c1c27] rounded-xl border border-slate-200 dark:border-bot-border shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-200 dark:border-bot-border flex items-center gap-3">
            <div class="p-2 bg-bot-primary/10 rounded-lg text-bot-primary">
                <span class="material-symbols-outlined">lock</span>
            </div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Password & Security</h2>
        </div>
        <div class="p-6 grid gap-6 max-w-2xl">
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                <input class="w-full rounded-lg bg-slate-50 dark:bg-bot-bg-dark border border-slate-300 dark:border-bot-border text-slate-900 dark:text-white h-12 px-4 focus:ring-2 focus:ring-bot-primary focus:border-bot-primary transition-all placeholder:text-slate-400 dark:placeholder:text-[#a1a1aa]" placeholder="Enter your current password" type="password"/>
            </div>
             <div class="pt-2">
                <button class="px-5 py-2.5 bg-slate-100 dark:bg-bot-border text-slate-700 dark:text-white font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">Update Password</button>
            </div>
        </div>
    </section>

    <!-- 2FA -->
    <section class="bg-white dark:bg-[#1c1c27] rounded-xl border border-slate-200 dark:border-bot-border shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-200 dark:border-bot-border flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-bot-primary/10 rounded-lg text-bot-primary">
                    <span class="material-symbols-outlined">shield</span>
                </div>
                <div>
                    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</h2>
                    <p class="text-sm text-slate-500 dark:text-[#a1a1aa] mt-0.5">Add an extra layer of security to your account.</p>
                </div>
            </div>
             <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                Currently Disabled
            </span>
        </div>
        <div class="p-6">
            <button class="px-4 py-2 bg-bot-primary hover:bg-bot-primary-hover text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-bot-primary/25">
                Setup 2FA
            </button>
        </div>
    </section>

    <!-- Connected Accounts -->
    <section class="bg-white dark:bg-[#1c1c27] rounded-xl border border-slate-200 dark:border-bot-border shadow-sm overflow-hidden">
         <div class="px-6 py-5 border-b border-slate-200 dark:border-bot-border flex items-center gap-3">
            <div class="p-2 bg-bot-primary/10 rounded-lg text-bot-primary">
                <span class="material-symbols-outlined">link</span>
            </div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Connected Accounts</h2>
        </div>
        <div class="divide-y divide-slate-200 dark:divide-bot-border">
             <div class="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <div class="flex items-center gap-4">
                     <div class="size-12 rounded-full bg-[#5865F2] flex items-center justify-center text-white shrink-0">
                        <span class="material-symbols-outlined">sports_esports</span>
                    </div>
                    <div>
                        <h3 class="font-medium text-slate-900 dark:text-white">Discord</h3>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="size-2 rounded-full bg-green-500"></span>
                            <p class="text-sm text-slate-500 dark:text-[#a1a1aa]">Connected as <span class="text-slate-900 dark:text-white font-medium">BotMaster#9921</span></p>
                        </div>
                    </div>
                </div>
                <button class="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-[#a1a1aa] dark:hover:text-white px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-bot-border transition-all">
                    Disconnect
                </button>
            </div>
        </div>
    </section>

    <!-- Danger Zone -->
    <section class="rounded-xl border border-red-200 dark:border-red-900/50 overflow-hidden bg-red-50/50 dark:bg-red-950/10">
         <div class="px-6 py-5 border-b border-red-200 dark:border-red-900/50 flex items-center gap-3">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <span class="material-symbols-outlined">warning</span>
            </div>
            <h2 class="text-lg font-semibold text-red-700 dark:text-red-400">Data & Privacy</h2>
        </div>
        <div class="p-6 flex flex-col gap-6">
             <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p class="text-slate-900 dark:text-white font-medium">Delete Account</p>
                    <p class="text-sm text-slate-500 dark:text-[#a1a1aa] mt-1">Permanently remove your account and all associated bots. This action cannot be undone.</p>
                </div>
                <button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                    Delete Account
                </button>
            </div>
        </div>
    </section>
</div>
