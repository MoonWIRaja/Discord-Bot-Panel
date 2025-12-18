<script lang="ts">
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
        <button class="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors">
            <span>Help</span>
            <span class="material-symbols-outlined text-[20px]">help</span>
        </button>
    </div>
</header>
