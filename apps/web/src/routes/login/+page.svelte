<script lang="ts">
</script>

<div class="min-h-screen w-full flex bg-login-bg text-login-text font-display antialiased selection:bg-discord selection:text-white">
    <!-- Left Side - Visual -->
    <div class="hidden lg:flex w-1/2 bg-login-sidebar relative overflow-hidden items-center justify-center p-12">
        <div class="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/30 via-login-sidebar to-login-sidebar"></div>
        <div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 40px 40px;"></div>
        <div class="absolute top-0 right-0 p-12 opacity-5">
            <span class="material-symbols-outlined text-[300px] text-white">smart_toy</span>
        </div>
        <div class="relative z-10 max-w-lg flex flex-col items-center text-center">
            <div class="w-full aspect-square bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md mb-8 flex items-center justify-center p-8 shadow-2xl shadow-black/50 relative overflow-hidden group hover:border-white/20 transition-all duration-500">
                <div class="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay" data-alt="Abstract 3D network nodes connecting representing bot logic" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuC1-9E7Re2IZJ4AWDnjyLrZELjA8ni95O6lWIBTv3fYOzRjTpVheZ4-P2yYVTbnzVQRCLnFlsG52ff2qncGsx0r7GlEGuMxbjYhHHiGeVI3u3NUvEbdpF99rWaG8T7ObinAdmUt8R80BnsNWLVD89BlqfHwuhmzEuLcj9LrnVgMHKOdmw2Y3MZ0SWZAVQbY6SfqGlm5s53NZ-JK9dKpAqn53vTErjD5IiNh3QuZuqbhxkRkPOvi4KAGXhGDq7Sfa4P9OfUJGLxpYgLV');"></div>
                <div class="relative z-20 flex flex-col items-center">
                    <div class="w-24 h-24 bg-gradient-to-br from-discord to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-discord/20 mb-6 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                        <span class="material-symbols-outlined text-5xl text-white">hub</span>
                    </div>
                    <h2 class="text-3xl font-bold text-white mb-2">Visual Logic Builder</h2>
                    <p class="text-gray-400 text-sm">Configure your bot behaviors using our intuitive node-based system.</p>
                </div>
            </div>
            <div class="text-left w-full space-y-4">
                <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                    <div class="p-2 rounded-lg bg-green-500/10 text-green-400">
                        <span class="material-symbols-outlined">check_circle</span>
                    </div>
                    <div>
                        <h3 class="font-bold text-white text-sm">No Code Required</h3>
                        <p class="text-xs text-gray-400">Drag and drop verbs to create actions.</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                    <div class="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <span class="material-symbols-outlined">rocket_launch</span>
                    </div>
                    <div>
                        <h3 class="font-bold text-white text-sm">Instant Deployment</h3>
                        <p class="text-xs text-gray-400">Push changes to your server in seconds.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Side - Form -->
    <div class="w-full lg:w-1/2 flex flex-col h-screen overflow-y-auto bg-login-bg">
        <div class="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-12 lg:px-24">
            <div class="w-full max-w-[420px] space-y-8">
                <div class="text-center sm:text-left">
                    <h1 class="text-login-text tracking-tight text-[32px] font-bold leading-tight pb-2">
                        Welcome Back
                    </h1>
                    <p class="text-login-muted text-base font-normal leading-normal">
                        Manage your community with ease.
                    </p>
                </div>
                <div>
                    <button class="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-discord hover:bg-discord-hover transition-colors text-white gap-3 text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-discord/20">
                        <span class="material-symbols-outlined" style="font-size: 24px;">sports_esports</span>
                        <span>Continue with Discord</span>
                    </button>
                </div>
                <div class="relative flex items-center justify-center w-full">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-login-border"></div>
                    </div>
                    <div class="relative bg-login-bg px-4">
                        <span class="text-sm text-login-muted font-medium">or</span>
                    </div>
                </div>
                <form class="space-y-5" onsubmit={(e) => e.preventDefault()}>
                    <div class="space-y-2">
                        <label class="text-sm font-semibold text-gray-200" for="email">
                            Email Address
                        </label>
                        <div class="relative group">
                            <input class="w-full h-12 px-4 rounded-xl bg-login-surface border border-login-border text-white focus:outline-none focus:ring-2 focus:ring-discord focus:border-transparent transition-all placeholder:text-gray-600 group-hover:border-gray-600" id="email" placeholder="name@example.com" type="email"/>
                            <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-focus-within:text-discord transition-colors" style="font-size: 20px;">mail</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-sm font-semibold text-gray-200" for="password">
                                Password
                            </label>
                            <a class="text-sm font-semibold text-discord hover:text-discord-hover hover:underline decoration-2 underline-offset-2 transition-colors" href="#">
                                Forgot Password?
                            </a>
                        </div>
                        <div class="relative group/input">
                            <input class="w-full h-12 px-4 pr-12 rounded-xl bg-login-surface border border-login-border text-white focus:outline-none focus:ring-2 focus:ring-discord focus:border-transparent transition-all placeholder:text-gray-600 group-hover:border-gray-600" id="password" placeholder="Enter your password" type="password"/>
                            <button class="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-gray-500 hover:text-white transition-colors" type="button">
                                <span class="material-symbols-outlined" style="font-size: 20px;">visibility</span>
                            </button>
                        </div>
                    </div>
                    <button class="flex w-full cursor-pointer items-center justify-center rounded-xl h-12 px-5 bg-white text-black hover:bg-gray-200 transition-colors text-base font-bold leading-normal tracking-[0.015em] shadow-md shadow-white/5" type="submit">
                        Login with Email
                    </button>
                </form>
                <p class="text-center text-sm text-login-muted">
                    Don't have an account? 
                    <a class="text-discord font-bold hover:underline decoration-2 underline-offset-2 ml-1" href="#">
                        Register with Discord
                    </a>
                </p>
            </div>
        </div>
        <div class="lg:hidden w-full h-1 bg-gradient-to-r from-discord to-indigo-600"></div>
    </div>
</div>
