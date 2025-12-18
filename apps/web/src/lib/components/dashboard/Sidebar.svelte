<script lang="ts">
</script>

<aside class="w-64 bg-dark-surface border-r border-dark-border text-muted flex flex-col h-full shrink-0 transition-all duration-300">
    <div class="h-16 flex items-center px-6 gap-3 text-white border-b border-dark-border">
        <div class="size-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-[20px]">smart_toy</span>
        </div>
        <h1 class="text-lg font-bold tracking-tight">BotPanel</h1>
    </div>
    <div class="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
        <p class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-3">Menu</p>
        <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" href="/dashboard">
            <span class="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
        </a>
        <div class="flex flex-col gap-1">
            <a class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white group" href="/bots">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-[20px]">robot_2</span>
                    My Bots
                </div>
                <span class="material-symbols-outlined text-[16px] group-hover:rotate-180 transition-transform">expand_more</span>
            </a>
        </div>
        <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white" href="/templates">
            <span class="material-symbols-outlined text-[20px]">grid_view</span>
            Templates
        </a>
        <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white" href="/settings">
            <span class="material-symbols-outlined text-[20px]">settings</span>
            Settings
        </a>
        <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white" href="/docs">
            <span class="material-symbols-outlined text-[20px]">menu_book</span>
            Docs
        </a>
    </div>
    <div class="p-4 border-t border-dark-border">
        <div class="bg-dark-card rounded-xl p-4 flex flex-col gap-3 border border-dark-border">
            <div class="flex items-center gap-3">
                <div class="size-10 rounded-full bg-cover bg-center ring-2 ring-dark-border" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAqWcdi7KDUxT9mBA-AXZR3YmfanQqU32-I1dRDfkBgfldWzRA4VSlS3doWypVRM4roqmzECD8WDvuk6D0ZEJ9ZxRxM8LZ2oMDgp5n2oQnen6jU047_Yq8STRpBlz8QyupGdV4oL3GSkexrmPqFLKHi3EC3cqrsr2ArmMBSXxRNN1PS5GojocwfN3tLL3pr1PXwvj5A6WEtrKCgmSCvjjnEnvGlKTMUCHB81h2kqtUfRg0B8scDGjFMYGBj8yjvX9ZqZszITu91xY5N')"></div>
                <div class="flex flex-col overflow-hidden">
                    <span class="text-white text-sm font-medium truncate">Alex Smith</span>
                    <span class="text-xs text-gray-500 truncate">alex@example.com</span>
                </div>
            </div>
            <div class="flex flex-col gap-1.5">
                <div class="flex justify-between items-end text-xs">
                    <span class="text-white font-medium">Pro Plan</span>
                    <span class="text-gray-400">8/20 Bots</span>
                </div>
                <div class="h-1.5 w-full bg-dark-border rounded-full overflow-hidden">
                    <div class="h-full w-[40%] bg-primary rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                </div>
            </div>
        </div>
        <button class="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-white transition-colors mt-3 px-2">
            <span class="material-symbols-outlined text-[16px]">logout</span>
            Sign out
        </button>
    </div>
</aside>
