<script lang="ts">
</script>

<div class="mx-auto max-w-3xl flex flex-col gap-8 pb-32">
     <div class="mb-2">
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">Billing & Subscription</h1>
        <p class="text-gray-500 text-base md:text-lg max-w-2xl">
            Manage your subscription plan and payment methods.
        </p>
    </div>

    <!-- Coming Soon State -->
    <div class="flex flex-col items-center justify-center py-16 text-center bg-dark-card rounded-xl border border-dark-border">
        <div class="size-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-[32px] text-amber-500">construction</span>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">Coming Soon</h2>
        <p class="text-gray-500 max-w-md">
            Billing management is under development. You're currently on the Free plan.
        </p>
    </div>

    <!-- Current Plan -->
    <section class="bg-dark-card rounded-xl border border-dark-border shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-dark-border flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg text-primary">
                <span class="material-symbols-outlined">credit_card</span>
            </div>
            <h2 class="text-lg font-semibold text-white">Current Plan</h2>
        </div>
        <div class="p-6">
            <div class="flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <span class="text-2xl font-bold text-white">Free Plan</span>
                        <span class="px-2 py-0.5 text-xs font-bold bg-green-500/10 text-green-400 rounded">ACTIVE</span>
                    </div>
                    <p class="text-gray-500 text-sm">5 bots, 1,000 flow executions/month</p>
                </div>
                <button disabled class="px-6 py-2.5 bg-dark-border text-gray-500 font-bold text-sm rounded-lg cursor-not-allowed">
                    Upgrade (Coming Soon)
                </button>
            </div>
        </div>
    </section>
</div>
