<script lang="ts">
    import { useSession } from '$lib/auth';
    const session = useSession();
</script>

<header class="h-16 bg-dark-surface border-b border-dark-border flex items-center justify-between px-6 shrink-0 z-10">
    <div class="flex-1 max-w-md">
        <div class="relative group">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input class="w-full bg-dark-base border border-dark-border text-sm rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary transition-all" placeholder="Search bots, flows, or templates..." type="text"/>
        </div>
    </div>
    <div class="flex items-center gap-4 ml-6">
        <button class="relative p-2 text-gray-400 hover:text-white hover:bg-dark-border rounded-full transition-colors">
            <span class="material-symbols-outlined text-[24px]">notifications</span>
            <span class="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-dark-surface"></span>
        </button>
        <div class="h-8 w-px bg-dark-border mx-1"></div>
        {#if $session.data}
            <a href="/settings/profile" class="flex items-center gap-3 group">
                {#if $session.data.user.image}
                    <div class="size-9 rounded-full bg-cover bg-center ring-2 ring-dark-border group-hover:ring-primary/50 transition-all" style="background-image: url('{$session.data.user.image}')"></div>
                {:else}
                    <div class="size-9 rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-dark-border group-hover:ring-primary/50 transition-all">
                        <span class="text-white font-bold text-sm">{$session.data.user.name.charAt(0)}</span>
                    </div>
                {/if}
                <span class="text-sm font-medium text-gray-400 group-hover:text-white transition-colors hidden lg:block">{$session.data.user.name}</span>
            </a>
        {:else}
            <div class="size-9 rounded-full bg-white/5 animate-pulse"></div>
        {/if}
    </div>
</header>
