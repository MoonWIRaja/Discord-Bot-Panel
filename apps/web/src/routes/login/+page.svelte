<script lang="ts">
    import { signIn } from '$lib/auth';
    
    let isLoading = false;
    let error = '';
    
    const webUrl = import.meta.env.VITE_PUBLIC_WEB_URL || 'http://localhost:5173';
    
    async function handleDiscordLogin() {
        isLoading = true;
        error = '';
        try {
            await signIn.social({
                provider: 'discord',
                callbackURL: `${webUrl}/dashboard`
            });
        } catch (e) {
            console.error('Login error:', e);
            error = 'Failed to login with Discord';
            isLoading = false;
        }
    }
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
                {#if error}
                    <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                        {error}
                    </div>
                {/if}
                <div>
                    <button 
                        onclick={handleDiscordLogin}
                        disabled={isLoading}
                        class="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-discord hover:bg-discord-hover transition-colors text-white gap-3 text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-discord/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        <span>Continue with Discord</span>
                    </button>
                </div>
                <p class="text-center text-sm text-login-muted mt-6">
                    Sign in with your Discord account to manage your bots.
                </p>
            </div>
        </div>
        <div class="lg:hidden w-full h-1 bg-gradient-to-r from-discord to-indigo-600"></div>
    </div>
</div>
