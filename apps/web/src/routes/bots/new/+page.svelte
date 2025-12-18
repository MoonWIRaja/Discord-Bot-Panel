<script lang="ts">
    import { page } from '$app/stores';
</script>

<div class="bg-background-light dark:bg-background-dark font-display text-bot-primary overflow-hidden h-screen flex relative">
    <!-- Static Sidebar Replica (to form background) -->
    <aside class="w-64 bg-slate-900 text-gray-400 flex flex-col h-full shrink-0">
         <div class="h-16 flex items-center px-6 gap-3 text-white border-b border-white/10">
            <div class="size-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <span class="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <h1 class="text-lg font-bold tracking-tight">BotPanel</h1>
        </div>
        <div class="p-4">
             <div class="h-8 bg-white/5 rounded w-3/4 mb-4"></div>
             <div class="h-4 bg-white/5 rounded w-1/2 mb-2"></div>
             <div class="h-4 bg-white/5 rounded w-2/3"></div>
        </div>
    </aside>
    
    <!-- Static Content Replica -->
    <main class="flex-1 flex flex-col h-full min-w-0 bg-background-light dark:bg-[#101022] p-6">
         <div class="h-16 w-full bg-white dark:bg-[#202020] rounded-lg mb-8 opacity-50"></div>
         <div class="grid grid-cols-3 gap-4">
             <div class="h-32 bg-white dark:bg-[#202020] rounded-xl opacity-50"></div>
             <div class="h-32 bg-white dark:bg-[#202020] rounded-xl opacity-50"></div>
             <div class="h-32 bg-white dark:bg-[#202020] rounded-xl opacity-50"></div>
         </div>
    </main>

    <!-- Modal Overlay -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <a href="/dashboard" class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity cursor-default"></a>
        <div class="relative w-full max-w-lg bg-[#111111] text-gray-100 rounded-2xl shadow-2xl border border-gray-800 transform transition-all scale-100">
            <div class="flex items-center justify-between p-6 border-b border-gray-800">
                <h3 class="text-xl font-bold text-white tracking-tight">Enter Your Bot Token</h3>
                <a href="/dashboard" class="text-gray-500 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </a>
            </div>
            <div class="p-6">
                <div class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2" for="bot-token">
                            Bot Token
                        </label>
                        <div class="relative group">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="material-symbols-outlined text-gray-500 text-[20px]">key</span>
                            </div>
                            <input class="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" id="bot-token" placeholder="MTAx..." type="password"/>
                            <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                <span class="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                        </div>
                        <p class="mt-2 text-xs text-gray-500">The token is required to authenticate your bot with Discord.</p>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="flex items-start gap-3 p-4 rounded-lg bg-[#1a1a1a] border-l-4 border-l-amber-500 border-y border-r border-y-gray-800 border-r-gray-800">
                            <span class="material-symbols-outlined text-amber-500 text-[22px] shrink-0 mt-0.5">warning</span>
                            <div class="text-sm leading-relaxed text-gray-300">
                                <strong class="block mb-1 font-bold text-amber-500 tracking-wide">Security Warning</strong>
                                Never share your bot token with anyone! If someone gets your token, they can control your bot.
                            </div>
                        </div>
                        <a class="inline-flex items-center gap-1.5 text-sm text-indigo-400 font-medium hover:text-indigo-300 hover:underline w-fit group transition-colors" href="#">
                            <span>How to get my token?</span>
                            <span class="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">open_in_new</span>
                        </a>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-end gap-3 p-6 pt-2 border-t border-gray-800/50">
                <a href="/dashboard" class="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    Cancel
                </a>
                <button class="px-6 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    <span>Validate</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
            </div>
        </div>
    </div>
</div>
