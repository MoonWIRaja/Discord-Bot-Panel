<script lang="ts">
    import { useSession, signOut } from '$lib/auth';
    
    const session = useSession();
    let showDeleteModal = $state(false);
    let deleteConfirmText = $state('');
    let deleting = $state(false);

    async function handleDeleteAccount() {
        if (deleteConfirmText !== 'DELETE') return;
        deleting = true;
        // In a real app, call an API to delete the account
        await new Promise(resolve => setTimeout(resolve, 1500));
        await signOut();
        window.location.href = '/login';
    }
</script>

<div class="mx-auto max-w-3xl flex flex-col gap-8 pb-32">
     <div class="mb-2">
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">Account Settings</h1>
        <p class="text-gray-500 text-base md:text-lg max-w-2xl">
            Manage your security preferences, authentication methods, and connected services.
        </p>
    </div>

    <!-- 2FA -->
    <section class="bg-dark-card rounded-xl border border-dark-border shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-dark-border flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-lg text-primary">
                    <span class="material-symbols-outlined">shield</span>
                </div>
                <div>
                    <h2 class="text-lg font-semibold text-white">Two-Factor Authentication</h2>
                    <p class="text-sm text-gray-500 mt-0.5">Add an extra layer of security to your account.</p>
                </div>
            </div>
             <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Coming Soon
            </span>
        </div>
        <div class="p-6">
            <button disabled class="px-4 py-2 bg-dark-border text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed">
                Setup 2FA (Not Available)
            </button>
        </div>
    </section>

    <!-- Connected Accounts -->
    <section class="bg-dark-card rounded-xl border border-dark-border shadow-sm overflow-hidden">
         <div class="px-6 py-5 border-b border-dark-border flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg text-primary">
                <span class="material-symbols-outlined">link</span>
            </div>
            <h2 class="text-lg font-semibold text-white">Connected Accounts</h2>
        </div>
        <div class="divide-y divide-dark-border">
             <div class="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                <div class="flex items-center gap-4">
                     <div class="size-12 rounded-full bg-[#5865F2] flex items-center justify-center text-white shrink-0">
                        <span class="material-symbols-outlined">sports_esports</span>
                    </div>
                    <div>
                        <h3 class="font-medium text-white">Discord</h3>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="size-2 rounded-full bg-green-500"></span>
                            {#if $session.data}
                                <p class="text-sm text-gray-500">Connected as <span class="text-white font-medium">{$session.data.user.name}</span></p>
                            {:else}
                                <p class="text-sm text-gray-500">Loading...</p>
                            {/if}
                        </div>
                    </div>
                </div>
                <span class="text-xs font-medium text-gray-600 px-3 py-1.5">
                    Primary Login Method
                </span>
            </div>
        </div>
    </section>

    <!-- Danger Zone -->
    <section class="rounded-xl border border-red-500/20 overflow-hidden bg-red-500/5">
         <div class="px-6 py-5 border-b border-red-500/20 flex items-center gap-3">
            <div class="p-2 bg-red-500/10 rounded-lg text-red-400">
                <span class="material-symbols-outlined">warning</span>
            </div>
            <h2 class="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>
        <div class="p-6 flex flex-col gap-6">
             <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p class="text-white font-medium">Delete Account</p>
                    <p class="text-sm text-gray-500 mt-1">Permanently remove your account and all associated bots. This action cannot be undone.</p>
                </div>
                <button onclick={() => showDeleteModal = true} class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                    Delete Account
                </button>
            </div>
        </div>
    </section>
</div>

{#if showDeleteModal}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={() => showDeleteModal = false} aria-label="Close modal"></button>
    <div class="relative w-full max-w-md bg-dark-surface rounded-xl border border-red-500/30 shadow-2xl flex flex-col overflow-hidden">
        <div class="p-6 text-center">
            <div class="mx-auto size-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                <span class="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Delete Your Account?</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-4">
                This will permanently delete your account, all your bots, flows, and data.
                <br><span class="text-red-400 font-semibold">This action cannot be undone.</span>
            </p>
            <div class="text-left">
                <label for="delete-confirm-input" class="text-sm text-gray-400 mb-1 block">Type <span class="font-bold text-white">DELETE</span> to confirm:</label>
                <input id="delete-confirm-input" bind:value={deleteConfirmText} class="w-full bg-dark-base border border-dark-border rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none" placeholder="DELETE"/>
            </div>
        </div>
        <div class="flex items-center border-t border-white/5 bg-white/5 p-4 gap-3">
            <button onclick={() => showDeleteModal = false} class="flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors">
                Cancel
            </button>
            <button onclick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting} class="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {#if deleting}
                    <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Deleting...
                {:else}
                    <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                    Delete Permanently
                {/if}
            </button>
        </div>
    </div>
</div>
{/if}
