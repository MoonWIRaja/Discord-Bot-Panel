<script lang="ts">
</script>

<div class="bg-background-light dark:bg-[#111118] min-h-screen flex flex-col font-display overflow-x-hidden text-slate-900 dark:text-white">
    <!-- Navbar -->
    <div class="w-full border-b border-solid border-slate-200 dark:border-bot-border bg-white dark:bg-[#111118]">
        <div class="px-4 md:px-10 py-3 max-w-[1200px] mx-auto w-full">
            <header class="flex items-center justify-between whitespace-nowrap">
                <div class="flex items-center gap-4 text-slate-900 dark:text-white">
                    <div class="size-8 text-bot-primary text-[#1313ec]">
                        <svg class="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor"></path>
                            <path clip-rule="evenodd" d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.739 8 35.7393 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM4.95178 32.7688L21.4543 6.30267C22.6288 4.4191 25.3712 4.41909 26.5457 6.30267L43.0534 32.777C43.0709 32.8052 43.0878 32.8338 43.104 32.8629L41.3563 33.8352C43.104 32.8629 43.1038 32.8626 43.104 32.8629L43.1051 32.865L43.1065 32.8675L43.1101 32.8739L43.1199 32.8918C43.1276 32.906 43.1377 32.9246 43.1497 32.9473C43.1738 32.9925 43.2062 33.0545 43.244 33.1299C43.319 33.2792 43.4196 33.489 43.5217 33.7317C43.6901 34.1321 44 34.9311 44 35.7391C44 37.4427 43.003 38.7775 41.8558 39.7209C40.6947 40.6757 39.1354 41.4464 37.385 42.0552C33.8654 43.2794 29.133 44 24 44C18.867 44 14.1346 43.2794 10.615 42.0552C8.86463 41.4464 7.30529 40.6757 6.14419 39.7209C4.99695 38.7775 3.99999 37.4427 3.99999 35.7391C3.99999 34.8725 4.29264 34.0922 4.49321 33.6393C4.60375 33.3898 4.71348 33.1804 4.79687 33.0311C4.83898 32.9556 4.87547 32.8935 4.9035 32.8471C4.91754 32.8238 4.92954 32.8043 4.93916 32.7889L4.94662 32.777L4.95178 32.7688ZM35.9868 29.004L24 9.77997L12.0131 29.004C12.4661 28.8609 12.9179 28.7342 13.3617 28.6282C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 34.6383 28.6282C35.082 28.7342 35.5339 28.8609 35.9868 29.004Z" fill="currentColor" fill-rule="evenodd"></path>
                        </svg>
                    </div>
                    <h2 class="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">BotPanel</h2>
                </div>
                <div class="hidden md:flex flex-1 justify-end gap-8">
                    <div class="flex items-center gap-9">
                        <a class="text-slate-900 dark:text-white text-sm font-medium leading-normal hover:text-bot-primary transition-colors" href="/#features">Features</a>
                        <a class="text-slate-900 dark:text-white text-sm font-medium leading-normal hover:text-bot-primary transition-colors" href="/pricing">Pricing</a>
                        <a class="text-slate-900 dark:text-white text-sm font-medium leading-normal hover:text-bot-primary transition-colors" href="/docs">Docs</a>
                    </div>
                    <div class="flex gap-2">
                         <a href="/login" class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-bot-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors">
                            <span class="truncate">Get Started</span>
                        </a>
                        <a href="/login" class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-slate-100 dark:bg-bot-surface border border-slate-200 dark:border-bot-border text-slate-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-200 dark:hover:bg-bot-border transition-colors">
                            <span class="truncate">Login</span>
                        </a>
                    </div>
                </div>
                 <div class="md:hidden text-slate-900 dark:text-white cursor-pointer">
                    <span class="material-symbols-outlined">menu</span>
                </div>
            </header>
        </div>
    </div>
    
    <!-- Main Content -->
     <div class="flex flex-col items-center w-full grow bg-white dark:bg-[#111118]">
        <div class="w-full max-w-[1200px] px-4 md:px-10 py-10 flex flex-col items-center">
            <!-- Heading -->
             <div class="text-center max-w-[700px] mb-8">
                <h1 class="text-slate-900 dark:text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em] mb-4">
                    Supercharge your Community
                </h1>
                <p class="text-slate-500 dark:text-[#9d9db9] text-lg font-normal leading-normal">
                    Simple pricing for communities of all sizes. No hidden fees. Start building your bot visually today.
                </p>
            </div>
             <!-- Billing Toggle -->
             <div class="flex items-center justify-center mb-12">
                <div class="flex h-12 bg-slate-100 dark:bg-bot-surface p-1 rounded-xl border border-slate-200 dark:border-bot-border relative">
                    <label class="relative z-10 flex cursor-pointer px-6 items-center justify-center rounded-lg text-sm font-bold transition-all duration-200">
                        <input checked class="peer sr-only" name="billing" type="radio" value="monthly"/>
                        <span class="text-slate-500 dark:text-[#9d9db9] peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:bg-white dark:peer-checked:bg-bot-border/50 py-2 px-4 rounded-lg shadow-sm peer-checked:shadow-none">Monthly</span>
                    </label>
                    <label class="relative z-10 flex cursor-pointer px-6 items-center justify-center rounded-lg text-sm font-bold transition-all duration-200">
                        <input class="peer sr-only" name="billing" type="radio" value="yearly"/>
                        <span class="text-slate-500 dark:text-[#9d9db9] peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:bg-white dark:peer-checked:bg-bot-border/50 py-2 px-4 rounded-lg flex gap-2 items-center shadow-sm peer-checked:shadow-none">
                            Yearly 
                            <span class="text-[10px] uppercase bg-bot-primary/20 text-bot-primary px-2 py-0.5 rounded-full tracking-wider">Save 20%</span>
                        </span>
                    </label>
                </div>
            </div>
             
             <!-- Pricing Cards -->
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-16">
                 <!-- Spark Tier -->
                  <div class="flex flex-col gap-6 rounded-2xl border border-solid border-slate-200 dark:border-bot-border bg-slate-50 dark:bg-bot-surface p-6 md:p-8 hover:border-slate-300 dark:hover:border-[#3b3b54] transition-colors relative group">
                    <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                    <div class="relative z-10 flex flex-col gap-1">
                        <h3 class="text-slate-900 dark:text-white text-xl font-bold leading-tight">Spark</h3>
                        <p class="text-slate-500 dark:text-[#9d9db9] text-sm">Perfect for hobbyists and tests.</p>
                        <p class="flex items-baseline gap-1 text-slate-900 dark:text-white mt-4">
                            <span class="text-4xl font-black tracking-tight">$0</span>
                            <span class="text-slate-500 dark:text-[#9d9db9] text-base font-medium">/mo</span>
                        </p>
                    </div>
                     <div class="relative z-10">
                        <button class="w-full h-12 rounded-xl bg-slate-200 dark:bg-[#282839] text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-300 dark:hover:bg-[#323246] transition-colors">
                            Start Building Free
                        </button>
                    </div>
                     <div class="relative z-10 flex flex-col gap-3 pt-2">
                        <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                            <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                            <span class="text-slate-900 dark:text-white">1 Bot</span>
                        </div>
                        <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                             <span class="text-slate-900 dark:text-white">3 Visual Flows</span>
                        </div>
                         <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                             <span>Community Support</span>
                        </div>
                        <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                             <span>Basic Events</span>
                        </div>
                    </div>
                 </div>

                 <!-- Flux Tier -->
                 <div class="flex flex-col gap-6 rounded-2xl border-2 border-bot-primary bg-white dark:bg-[#161621] p-6 md:p-8 relative shadow-lg z-10 scale-[1.02] md:scale-105">
                     <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-bot-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                         Most Popular
                     </div>
                      <div class="flex flex-col gap-1">
                         <h3 class="text-slate-900 dark:text-white text-xl font-bold leading-tight">Flux</h3>
                         <p class="text-slate-500 dark:text-[#9d9db9] text-sm">For growing communities.</p>
                         <p class="flex items-baseline gap-1 text-slate-900 dark:text-white mt-4">
                             <span class="text-4xl font-black tracking-tight">$9</span>
                             <span class="text-slate-500 dark:text-[#9d9db9] text-base font-medium">/mo</span>
                         </p>
                     </div>
                     <div>
                         <button class="w-full h-12 rounded-xl bg-bot-primary text-white text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20">
                             Upgrade to Pro
                         </button>
                     </div>
                     <div class="flex flex-col gap-3 pt-2">
                         <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-bot-primary text-[20px]">check_circle</span>
                             <span class="text-slate-900 dark:text-white font-medium">5 Bots</span>
                         </div>
                          <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-bot-primary text-[20px]">check_circle</span>
                             <span class="text-slate-900 dark:text-white font-medium">Unlimited Flows</span>
                         </div>
                         <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-bot-primary text-[20px]">check_circle</span>
                             <span class="text-slate-900 dark:text-white font-medium">Priority Support</span>
                         </div>
                         <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-bot-primary text-[20px]">check_circle</span>
                             <span class="text-slate-900 dark:text-white font-medium">Custom Branding</span>
                         </div>
                         <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-bot-primary text-[20px]">check_circle</span>
                             <span class="text-slate-900 dark:text-white font-medium">Advanced "Verbs" Access</span>
                         </div>
                     </div>
                 </div>

                 <!-- Nexus Tier -->
                 <div class="flex flex-col gap-6 rounded-2xl border border-solid border-slate-200 dark:border-bot-border bg-slate-50 dark:bg-bot-surface p-6 md:p-8 hover:border-slate-300 dark:hover:border-[#3b3b54] transition-colors relative group">
                     <div class="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                     <div class="relative z-10 flex flex-col gap-1">
                         <h3 class="text-slate-900 dark:text-white text-xl font-bold leading-tight">Nexus</h3>
                         <p class="text-slate-500 dark:text-[#9d9db9] text-sm">For businesses & large scale.</p>
                         <p class="flex items-baseline gap-1 text-slate-900 dark:text-white mt-4">
                             <span class="text-4xl font-black tracking-tight">$29</span>
                             <span class="text-slate-500 dark:text-[#9d9db9] text-base font-medium">/mo</span>
                         </p>
                     </div>
                     <div class="relative z-10">
                         <button class="w-full h-12 rounded-xl bg-slate-200 dark:bg-[#282839] text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-300 dark:hover:bg-[#323246] transition-colors">
                             Contact Sales
                         </button>
                     </div>
                      <div class="relative z-10 flex flex-col gap-3 pt-2">
                        <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                             <span class="text-slate-900 dark:text-white">Unlimited Bots</span>
                        </div>
                        <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                             <span class="text-slate-900 dark:text-white">Team Seats (5 Members)</span>
                        </div>
                        <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                             <span class="text-slate-900 dark:text-white">Advanced Analytics</span>
                        </div>
                         <div class="flex gap-3 text-slate-500 dark:text-[#9d9db9] text-sm items-center">
                             <span class="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">check</span>
                             <span class="text-slate-900 dark:text-white">99.9% Uptime SLA</span>
                        </div>
                     </div>
                 </div>
             </div>
             
             <!-- FAQ (Simplified) -->
             <div class="w-full max-w-[800px] flex flex-col gap-10">
                 <div class="text-center">
                     <h2 class="text-slate-900 dark:text-white text-3xl font-bold mb-2">Frequently Asked Questions</h2>
                     <p class="text-slate-500 dark:text-[#9d9db9]">Everything you need to know about the product and billing.</p>
                 </div>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                     <div class="flex flex-col gap-3">
                         <h4 class="text-slate-900 dark:text-white font-bold text-lg">Can I change plans later?</h4>
                         <p class="text-slate-500 dark:text-[#9d9db9] text-sm leading-relaxed">Yes, you can upgrade or downgrade your plan at any time from your dashboard. Prorated charges will apply automatically.</p>
                     </div>
                      <div class="flex flex-col gap-3">
                         <h4 class="text-slate-900 dark:text-white font-bold text-lg">What is a "Flow"?</h4>
                         <p class="text-slate-500 dark:text-[#9d9db9] text-sm leading-relaxed">A flow is a single visual command chain (e.g., a "Welcome User" command or a "Moderation" filter). Complex logic counts as one flow.</p>
                     </div>
                 </div>
             </div>
        </div>
     </div>

     <!-- Footer -->
    <footer class="bg-slate-100 dark:bg-[#0b0b12] border-t border-slate-200 dark:border-bot-border py-12 px-4 md:px-10 mt-auto">
        <div class="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <div class="col-span-2 lg:col-span-2 flex flex-col gap-4">
                 <div class="flex items-center gap-2 text-slate-900 dark:text-white">
                    <div class="size-6 text-bot-primary text-[#1313ec]">
                         <svg class="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor"></path>
                        </svg>
                    </div>
                    <span class="text-xl font-bold">BotPanel</span>
                </div>
                 <p class="text-slate-500 dark:text-[#9d9db9] text-sm max-w-[300px]">
                    The visual bot builder for communities of tomorrow. Build, deploy, and manage without writing a single line of code.
                </p>
            </div>
             <div class="flex flex-col gap-4">
                <h4 class="text-slate-900 dark:text-white font-bold">Product</h4>
                <a class="text-slate-500 dark:text-[#9d9db9] hover:text-slate-900 dark:hover:text-white text-sm" href="#">Features</a>
                <a class="text-slate-500 dark:text-[#9d9db9] hover:text-slate-900 dark:hover:text-white text-sm" href="#">Integrations</a>
                <a class="text-slate-500 dark:text-[#9d9db9] hover:text-slate-900 dark:hover:text-white text-sm" href="/pricing">Pricing</a>
            </div>
        </div>
    </footer>
</div>
