<script lang="ts">
</script>

<div class="mx-auto max-w-[800px] flex flex-col gap-8 pb-10">
    <div class="flex flex-col gap-2">
        <h1 class="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Profile Settings</h1>
        <p class="text-slate-500 dark:text-[#a1a1aa] text-base font-normal leading-normal">Manage your personal identity, avatar, and notification preferences.</p>
    </div>

    <!-- Avatar Section -->
    <div class="bg-white dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-bot-border p-6 shadow-sm">
        <div class="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div class="flex gap-5 items-center">
                <div class="relative group cursor-pointer">
                    <div class="bg-center bg-no-repeat bg-cover rounded-full size-24 md:size-28 ring-4 ring-slate-100 dark:border-bot-border" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0KcNj8gRRbeoudzNd6t31JPO-x3etvO4qoxoP-fG-vTIItGTgRRhMKUMiPOS8nsbvZtKLa4vSrbR-kFuqnMwTq4ha2wTlLlw9hT_pc0y8iDRPr9oYYaQ0OWOpnBRFhOzcfe8PXRHoqtt7jZJceaUsomcYFGnRrU7e-yZJ5UsNPQ3291SJt9qCnqG_kXVIN7jpqI9fSTRlRPu8W-noDz1oBQY4ts0HQC8kNUnb0REaxvKGkmCNIxREwEE-hpud7Sot6vlmzGPFcN0l");'></div>
                    <div class="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <span class="material-symbols-outlined">edit</span>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="text-slate-900 dark:text-white text-xl font-bold leading-tight">Your Avatar</p>
                    <p class="text-slate-500 dark:text-[#a1a1aa] text-sm font-normal">We support PNGs, JPGs under 10MB</p>
                </div>
            </div>
            <div class="flex gap-3 w-full md:w-auto">
                <button class="flex-1 md:flex-none cursor-pointer items-center justify-center rounded-lg h-10 px-6 bg-slate-200 dark:bg-bot-border hover:bg-slate-300 dark:hover:bg-bot-surface text-slate-900 dark:text-white text-sm font-bold transition-colors">
                    Remove
                </button>
                <button class="flex-1 md:flex-none cursor-pointer items-center justify-center rounded-lg h-10 px-6 bg-bot-primary hover:bg-bot-primary-hover text-white text-sm font-bold transition-colors shadow-lg shadow-bot-primary/25">
                    Upload New
                </button>
            </div>
        </div>
    </div>

    <!-- Personal Information -->
    <div class="bg-white dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-bot-border p-6 shadow-sm flex flex-col gap-6">
        <h2 class="text-slate-900 dark:text-white text-lg font-bold">Personal Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label class="flex flex-col gap-2">
                <span class="text-slate-900 dark:text-white text-sm font-medium">Display Name</span>
                <input class="w-full rounded-lg border border-slate-300 dark:border-bot-border bg-slate-50 dark:bg-bot-bg-dark text-slate-900 dark:text-white focus:border-bot-primary focus:ring-1 focus:ring-bot-primary h-12 px-4 placeholder:text-slate-400 dark:placeholder:text-[#a1a1aa] text-base transition-colors" type="text" value="BotMaster_99"/>
            </label>
            <label class="flex flex-col gap-2 relative">
                <span class="text-slate-900 dark:text-white text-sm font-medium flex justify-between">
                    Discord Username
                    <span class="text-xs font-bold text-green-500 flex items-center gap-1 uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded-full">
                        <span class="material-symbols-outlined text-[14px]">check_circle</span> Linked
                    </span>
                </span>
                <div class="relative">
                    <input class="w-full rounded-lg border border-slate-200 dark:border-bot-border bg-slate-100 dark:bg-bot-surface text-slate-500 dark:text-gray-400 h-12 px-4 pl-10 text-base cursor-not-allowed select-none" readonly value="user#1234"/>
                    <span class="material-symbols-outlined absolute left-3 top-3 text-slate-400 dark:text-gray-500">chat</span>
                </div>
            </label>
            <label class="flex flex-col gap-2 md:col-span-2">
                <span class="text-slate-900 dark:text-white text-sm font-medium">Email Address</span>
                <input class="w-full rounded-lg border border-slate-300 dark:border-bot-border bg-slate-50 dark:bg-bot-bg-dark text-slate-900 dark:text-white focus:border-bot-primary focus:ring-1 focus:ring-bot-primary h-12 px-4 placeholder:text-slate-400 dark:placeholder:text-[#a1a1aa] text-base transition-colors" type="email" value="hello@example.com"/>
                <p class="text-xs text-slate-500 dark:text-[#a1a1aa]">We'll verify this email if you change it.</p>
            </label>
        </div>
    </div>

    <!-- Notifications -->
    <div class="bg-white dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-bot-border p-6 shadow-sm flex flex-col gap-6">
        <h2 class="text-slate-900 dark:text-white text-lg font-bold">Notification Preferences</h2>
        <div class="flex flex-col gap-4 divide-y divide-slate-100 dark:divide-bot-border">
             <div class="flex items-center justify-between py-2">
                <div class="flex flex-col gap-0.5">
                    <p class="text-slate-900 dark:text-white text-sm font-bold">Email Updates</p>
                    <p class="text-slate-500 dark:text-[#a1a1aa] text-sm">Receive digest emails about your bot's performance.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input checked class="sr-only peer" type="checkbox"/>
                    <div class="w-11 h-6 bg-slate-200 dark:bg-bot-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bot-primary"></div>
                </label>
            </div>
        </div>
    </div>

     <!-- Footer Actions -->
    <div class="flex flex-col-reverse md:flex-row justify-end gap-4 mt-2">
        <button class="px-6 py-3 rounded-lg text-slate-700 dark:text-white font-bold text-sm bg-transparent hover:bg-slate-200 dark:hover:bg-bot-border transition-colors">
            Cancel
        </button>
        <button class="px-8 py-3 rounded-lg bg-bot-primary hover:bg-bot-primary-hover text-white font-bold text-sm shadow-lg shadow-bot-primary/30 transition-all transform active:scale-95 flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">save</span>
            Save Changes
        </button>
    </div>
</div>
