<script lang="ts">
    import { page } from '$app/stores';
    let id = $derived($page.params.id);
</script>

<div class="bg-background-dark font-display text-white overflow-hidden h-screen flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between whitespace-nowrap border-b border-border-dark bg-surface-dark px-6 py-3 shrink-0 z-20 shadow-md relative">
        <div class="flex items-center gap-6">
            <a href="/bots/{id}/settings" class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <span class="material-symbols-outlined text-xl">arrow_back</span>
                <span class="text-sm font-medium">Back to Dashboard</span>
            </a>
            <div class="h-6 w-[1px] bg-border-dark"></div>
            <div class="flex items-center gap-3">
                <div class="bg-white/5 p-2 rounded-lg border border-white/5">
                    <span class="material-symbols-outlined text-white">smart_toy</span>
                </div>
                <div class="flex flex-col">
                    <input class="text-white text-lg font-bold leading-none bg-transparent border-none p-0 focus:ring-0 w-48 placeholder-gray-600" type="text" value="Welcome Bot Flow"/>
                    <span class="text-xs text-gray-500 font-medium">Last saved 2m ago</span>
                </div>
            </div>
        </div>
        <div class="flex items-center gap-4">
            <div class="flex gap-2">
                <button class="flex items-center justify-center rounded-lg h-9 px-4 bg-card-dark border border-border-dark text-gray-200 hover:bg-[#262626] hover:text-white text-sm font-bold transition-colors">
                    <span class="material-symbols-outlined text-[18px] mr-2">play_arrow</span>
                    <span>Preview</span>
                </button>
                <button class="flex items-center justify-center rounded-lg h-9 px-4 bg-white hover:bg-gray-200 text-black text-sm font-bold shadow-md transition-colors">
                    <span class="material-symbols-outlined text-[18px] mr-2">save</span>
                    <span>Save & Run</span>
                </button>
            </div>
            <div class="h-8 w-[1px] bg-border-dark"></div>
             <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border border-border-dark" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBqI52vF7cfr3LYtpROBwWo2zN4AZ3dNhKL3uNe0ay5gy1vj4HTPJ4DUL94IjE5w9gZ7LXrzBjR5P0ORDXElw2Ej9s89D1QesHcKSzqhH_-cQyRdyFzrfSZ0LUK3P3FgVUZpdJU_bWw0mDIduR_pTZ9RcvY_0geul6YzstfPa6g_2gjZFbK6fksVrMwk1lj_I8T0eOJi2JtRFLIcuH_sanitae06eJctxoZ4jBH7gbNIkNzE4QiO6OyDfbLlHoI1K70v9NO1a6FL8qS");'></div>
        </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-72 bg-surface-dark flex flex-col border-r border-border-dark shrink-0 z-10 shadow-xl">
            <div class="p-4 border-b border-border-dark">
                <h2 class="text-white text-sm font-bold tracking-wider mb-3 flex items-center gap-2">
                    <span class="material-symbols-outlined text-white/50 text-[18px]">grid_view</span>
                    VERB PALETTE
                </h2>
                <div class="relative group">
                    <input class="w-full bg-[#1e1e1e] border border-border-dark text-white text-sm rounded-lg px-3 py-2 pl-9 focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555] transition-all placeholder-white/30" placeholder="Search verbs..."/>
                    <span class="material-symbols-outlined absolute left-2.5 top-2.5 text-white/30 text-[18px]">search</span>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-2">
                 <div class="mb-2">
                    <button class="flex items-center justify-between w-full p-2 text-white/90 hover:bg-white/5 rounded-md text-xs font-bold uppercase tracking-wider mb-1 group">
                        <span>Events</span>
                        <span class="material-symbols-outlined text-[16px] text-white/50 group-hover:text-white">expand_less</span>
                    </button>
                    <!-- Drag Items -->
                     <div class="space-y-1 pl-1">
                        <div class="flex items-center gap-3 p-2 rounded-md bg-[#1e1e1e] border border-border-dark hover:border-accent-purple/50 cursor-grab active:cursor-grabbing group transition-all hover:translate-x-1">
                            <div class="bg-accent-purple/20 p-1.5 rounded text-accent-purple">
                                <span class="material-symbols-outlined text-[18px]">bolt</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-white text-sm font-medium">On Message</span>
                                <span class="text-white/40 text-[10px]">Trigger</span>
                            </div>
                            <span class="material-symbols-outlined ml-auto text-white/20 text-[16px] group-hover:text-white/60">drag_indicator</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Canvas Area -->
        <main class="flex-1 bg-background-dark relative overflow-hidden group/canvas cursor-grab active:cursor-grabbing">
             <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 20px 20px;"></div>
             <!-- Mock Canvas Content -->
             <div class="absolute top-[80px] left-1/2 -translate-x-1/2 w-64 bg-card-dark rounded-xl shadow-lg shadow-black/40 border border-border-dark z-10">
                <div class="h-1.5 w-full bg-accent-purple rounded-t-xl"></div>
                <div class="p-4">
                    <div class="flex items-center justify-between mb-2">
                         <div class="flex items-center gap-2">
                            <div class="bg-accent-purple/10 p-1 rounded text-accent-purple">
                                <span class="material-symbols-outlined text-[20px]">bolt</span>
                            </div>
                            <span class="font-bold text-sm text-gray-200">On Message Create</span>
                        </div>
                    </div>
                     <div class="bg-white/5 rounded p-2 text-xs text-gray-400">
                        Triggered when any user sends a message in the server.
                    </div>
                </div>
             </div>
        </main>
        
        <!-- Right Properties Panel -->
        <aside class="w-80 bg-surface-dark flex flex-col border-l border-border-dark shrink-0 z-10 shadow-xl">
             <div class="p-5 border-b border-border-dark">
                <h2 class="text-white text-sm font-bold tracking-wider flex items-center gap-2">
                    <span class="material-symbols-outlined text-white/50 text-[18px]">tune</span>
                    PROPERTIES
                </h2>
            </div>
             <div class="flex-1 p-5 text-gray-400 text-sm">
                Select a node to edit properties.
            </div>
        </aside>
    </div>
</div>
