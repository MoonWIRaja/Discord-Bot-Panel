<script lang="ts">
    import { useSession } from '$lib/auth';
    
    const session = useSession();
    
    // Notification preferences (local only)
    let emailUpdates = $state(true);

    function openDiscord() {
        window.open('https://discord.com/app', '_blank');
    }

    function refreshProfile() {
        // Force session refresh by reloading the page
        window.location.reload();
    }
</script>

<div class="mx-auto max-w-3xl flex flex-col gap-8 pb-10">
    <div class="flex flex-col gap-2">
        <h1 class="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Profile</h1>
        <p class="text-gray-500 text-base font-normal leading-normal">Your profile is synced from Discord. Changes made on Discord will appear here.</p>
    </div>

    {#if $session.data}
        <!-- Discord Profile Card -->
        <div class="bg-gradient-to-br from-[#5865F2]/20 to-dark-card rounded-xl border border-[#5865F2]/30 p-6">
            <div class="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div class="relative">
                    {#if $session.data.user.image}
                        <div class="bg-center bg-no-repeat bg-cover rounded-full size-24 md:size-28 ring-4 ring-[#5865F2]/30" style='background-image: url("{$session.data.user.image}");'></div>
                    {:else}
                        <div class="size-24 md:size-28 rounded-full bg-gray-700 ring-4 ring-[#5865F2]/30 flex items-center justify-center">
                            <span class="text-4xl font-bold text-white">{$session.data.user.name?.charAt(0) || '?'}</span>
                        </div>
                    {/if}
                    <div class="absolute -bottom-1 -right-1 size-8 rounded-full bg-[#5865F2] flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-[16px]">check</span>
                    </div>
                </div>
                <div class="flex-1 text-center md:text-left">
                    <h2 class="text-2xl font-bold text-white mb-1">{$session.data.user.name}</h2>
                    <p class="text-gray-400 text-sm mb-4">{$session.data.user.email}</p>
                    <div class="flex flex-wrap gap-2 justify-center md:justify-start">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5865F2]/20 text-[#5865F2] rounded-full text-xs font-bold">
                            <span class="material-symbols-outlined text-[14px]">verified</span>
                            Discord Connected
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-dark-card rounded-xl border border-dark-border p-5">
                <div class="flex items-center gap-3 mb-3">
                    <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-[20px]">badge</span>
                    </div>
                    <span class="text-sm font-bold text-gray-500 uppercase tracking-wider">Display Name</span>
                </div>
                <p class="text-white text-lg font-medium">{$session.data.user.name}</p>
            </div>
            <div class="bg-dark-card rounded-xl border border-dark-border p-5">
                <div class="flex items-center gap-3 mb-3">
                    <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-[20px]">mail</span>
                    </div>
                    <span class="text-sm font-bold text-gray-500 uppercase tracking-wider">Email</span>
                </div>
                <p class="text-white text-lg font-medium">{$session.data.user.email}</p>
            </div>
        </div>

        <!-- How to Update -->
        <div class="bg-dark-card rounded-xl border border-dark-border p-6">
            <div class="flex items-start gap-4">
                <div class="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-amber-500 text-[24px]">info</span>
                </div>
                <div class="flex-1">
                    <h3 class="text-white font-bold mb-2">Want to update your profile?</h3>
                    <p class="text-gray-400 text-sm mb-4">
                        Your profile is linked to your Discord account. To change your name, avatar, or email, update them in Discord and then refresh this page.
                    </p>
                    <div class="flex flex-wrap gap-3">
                        <button onclick={openDiscord} class="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg text-sm font-medium transition-colors">
                            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
                            Open Discord
                        </button>
                        <button onclick={refreshProfile} class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors">
                            <span class="material-symbols-outlined text-[18px]">refresh</span>
                            Refresh Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Notification Preferences (local) -->
        <div class="bg-dark-card rounded-xl border border-dark-border p-6">
            <h3 class="text-white font-bold mb-4">Notification Preferences</h3>
            <div class="flex items-center justify-between py-2">
                <div class="flex flex-col gap-0.5">
                    <p class="text-white text-sm font-bold">Email Updates</p>
                    <p class="text-gray-500 text-sm">Receive digest emails about your bot's performance.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input bind:checked={emailUpdates} class="sr-only peer" type="checkbox"/>
                    <div class="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>
    {:else}
        <div class="animate-pulse space-y-6">
            <div class="h-40 bg-white/5 rounded-xl"></div>
            <div class="grid grid-cols-2 gap-4">
                <div class="h-24 bg-white/5 rounded-xl"></div>
                <div class="h-24 bg-white/5 rounded-xl"></div>
            </div>
        </div>
    {/if}
</div>
