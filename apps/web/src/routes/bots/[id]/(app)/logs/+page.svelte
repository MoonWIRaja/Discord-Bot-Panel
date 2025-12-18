<script lang="ts">
    import { page } from '$app/stores';
    let id = $derived($page.params.id);
</script>

<div class="flex flex-col gap-6 font-display text-bot-primary dark:text-white">
    <div class="flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 class="text-3xl md:text-4xl font-black tracking-tight mb-1">ModerationBot_v2 Logs</h1>
                <p class="text-[#757575] dark:text-[#a0a0a0] text-base">Real-time monitoring and event history.</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
                <button class="group flex items-center gap-2 px-4 h-10 rounded-lg border border-[#e5e5e5] dark:border-bot-border bg-white dark:bg-bot-surface text-sm font-bold text-slate-700 dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-bot-border transition-colors">
                    <span class="material-symbols-outlined text-[20px] text-[#757575] group-hover:text-bot-primary dark:text-[#a0a0a0] dark:group-hover:text-white">pause</span>
                    Pause Stream
                </button>
                <button class="group flex items-center gap-2 px-4 h-10 rounded-lg border border-[#e5e5e5] dark:border-bot-border bg-white dark:bg-bot-surface text-sm font-bold text-slate-700 dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-bot-border transition-colors">
                    <span class="material-symbols-outlined text-[20px] text-[#757575] group-hover:text-bot-primary dark:text-[#a0a0a0] dark:group-hover:text-white">block</span>
                    Clear Console
                </button>
                <button class="flex items-center gap-2 px-4 h-10 rounded-lg bg-bot-primary dark:bg-white text-white dark:text-bot-primary text-sm font-bold hover:opacity-90 transition-opacity">
                    <span class="material-symbols-outlined text-[20px]">download</span>
                    Export Logs
                </button>
            </div>
        </div>
    </div>
    
    <!-- Filters -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-5 relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="material-symbols-outlined text-[#757575] dark:text-[#a0a0a0]">search</span>
            </div>
            <input class="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-[#e5e5e5]/50 dark:bg-bot-surface text-slate-900 dark:text-white placeholder-[#757575] dark:placeholder-[#a0a0a0] focus:ring-2 focus:ring-bot-primary dark:focus:ring-white sm:text-sm font-medium transition-colors" placeholder="Search logs by keyword, user ID, or event..." type="text"/>
        </div>
        <div class="lg:col-span-7 flex flex-wrap gap-3 items-center lg:justify-end">
            <div class="relative">
                <select class="appearance-none pl-3 pr-10 py-2.5 rounded-lg border-none bg-[#e5e5e5]/50 dark:bg-bot-surface text-sm font-bold text-slate-700 dark:text-white focus:ring-0 cursor-pointer min-w-[120px] transition-colors">
                    <option>All Events</option>
                    <option>User Joins</option>
                    <option>Message Deletes</option>
                    <option>Bot Errors</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-white">
                    <span class="material-symbols-outlined text-sm">expand_more</span>
                </div>
            </div>
            <!-- More selects as needed, simplified for brevity -->
        </div>
    </div>

    <!-- Log Console -->
    <div class="flex flex-col bg-white dark:bg-bot-surface border border-[#e5e5e5] dark:border-bot-border rounded-xl overflow-hidden shadow-sm h-[500px] flex-1 transition-colors">
        <div class="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-b-bot-border bg-[#fafafa] dark:bg-bot-surface-lighter">
            <div class="flex items-center gap-2">
                <span class="relative flex h-2.5 w-2.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span class="text-xs font-bold uppercase tracking-wider text-[#757575] dark:text-[#a0a0a0]">Live Feed</span>
            </div>
            <div class="flex items-center gap-4 text-xs font-medium text-[#757575] dark:text-[#a0a0a0]">
                <span class="hidden sm:inline">Connection: <span class="text-green-600 dark:text-green-400">Stable (14ms)</span></span>
                <span>v2.4.1</span>
            </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2 bg-white dark:bg-[#080808] font-mono text-sm transition-colors">
            <!-- Log Items -->
            <div class="flex flex-col gap-1">
                <div class="group flex items-start gap-3 p-2 rounded hover:bg-[#f7f7f7] dark:hover:bg-bot-surface transition-colors border-l-2 border-transparent hover:border-[#e5e5e5] dark:hover:border-bot-border">
                    <span class="text-[#9ca3af] whitespace-nowrap text-xs mt-0.5">10:42:05 PM</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-wide min-w-[50px] text-center">Info</span>
                    <div class="text-slate-700 dark:text-[#d4d4d4] flex-1 break-all">
                        Connected to Gateway shard #4.
                    </div>
                </div>
                 <div class="group flex items-start gap-3 p-2 rounded hover:bg-[#f7f7f7] dark:hover:bg-bot-surface transition-colors border-l-2 border-transparent hover:border-red-500/30">
                    <span class="text-[#9ca3af] whitespace-nowrap text-xs mt-0.5">10:42:22 PM</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 uppercase tracking-wide min-w-[50px] text-center">Error</span>
                    <div class="text-slate-700 dark:text-[#d4d4d4] flex-1 break-all">
                        Failed to fetch external API (Weather). Timeout exceeded 5000ms.
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
