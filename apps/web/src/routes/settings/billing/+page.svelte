<script lang="ts">
    import { useSession } from '$lib/auth';
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    
    const session = useSession();
    
    // Get user plan from session
    let userPlan = $derived(($session.data?.user as any)?.plan || 'free');
    let userRole = $derived(($session.data?.user as any)?.role || 'user');
    let userId = $derived($session.data?.user?.id);
    
    let plans = $state<any[]>([]);
    let transactions = $state<any[]>([]);
    let subscription = $state<any>(null);
    let loading = $state(true);
    let gatewayEnabled = $state(false);
    let upgrading = $state<string | null>(null);
    let supportEmail = $state('');
    let currentPlanPrice = $state(0); // Current plan price for prorated calculation
    
    // Dynamic user limits from API
    let userLimits = $state<any>({
        plan: 'free',
        planEnabled: true,
        planDisplayName: 'Free',
        botLimit: 5,
        flowLimit: 10,
        ownedBotCount: 0,
        botLimitDisplay: '5',
        flowLimitDisplay: '10'
    });
    
    // Plan display info - now uses dynamic values from API
    let planInfo = $derived({
        name: userLimits.planDisplayName || userPlan,
        bots: userLimits.botLimitDisplay,
        flows: userLimits.flowLimitDisplay,
        price: 0,
        color: userPlan === 'unlimited' ? 'bg-amber-500' : userPlan === 'pro' ? 'bg-emerald-500' : 'bg-indigo-500',
        textColor: userPlan === 'unlimited' ? 'text-amber-400' : userPlan === 'pro' ? 'text-emerald-400' : 'text-indigo-400',
        icon: userPlan === 'unlimited' ? 'rocket_launch' : userPlan === 'pro' ? 'star' : 'deployed_code'
    });
    
    onMount(async () => {
        await loadData();
    });
    
    async function loadData() {
        loading = true;
        try {
            // Get user's dynamic plan limits
            try {
                userLimits = await api.get('/bots/user/limits');
            } catch (e) {
                console.error('Failed to load user limits:', e);
            }
            
            // Check if payment gateway is enabled
            const gateway = await api.get('/payments/gateway');
            gatewayEnabled = gateway.enabled;
            
            // Get available plans
            plans = await api.get('/payments/plans');
            
            // Find current plan price
            const currentPlan = plans.find(p => 
                p.name.toLowerCase().replace(/\s+/g, '_') === userPlan || 
                p.id === userPlan
            );
            if (currentPlan) {
                currentPlanPrice = currentPlan.price;
            } else if (userPlan === 'pro') {
                currentPlanPrice = 2000; // Default pro price
            }
            
            // Get support email from settings
            try {
                const settings = await api.get('/admin/settings');
                supportEmail = settings.support_email || '';
            } catch (e) {
                // Non-admin users might not have access
            }
            
            // Get user's subscription and transactions
            if (userId) {
                subscription = await api.get(`/payments/subscription/${userId}`);
                transactions = await api.get(`/payments/history/${userId}`);
            }
        } catch (error) {
            console.error('Failed to load billing data:', error);
        } finally {
            loading = false;
        }
    }
    
    async function upgradePlan(planId: string, proratedAmount: number) {
        if (!userId) return;
        
        upgrading = planId;
        try {
            const result = await api.post('/payments/checkout', { 
                userId, 
                planId,
                prorated: proratedAmount > 0,
                amount: proratedAmount > 0 ? proratedAmount : undefined
            });
            if (result.url) {
                window.location.href = result.url;
            } else if (result.error) {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to start checkout:', error);
            alert('Failed to start checkout. Please try again.');
        } finally {
            upgrading = null;
        }
    }
    
    // Get display name for user's plan
    function getPlanDisplayName(plan: string): string {
        if (plan === 'free') return 'Free';
        if (plan === 'unlimited') return 'Unlimited';
        if (plan === 'pro') return 'Pro';
        const found = plans.find(p => p.name.toLowerCase().replace(/\s+/g, '_') === plan || p.id === plan);
        return found?.name || plan;
    }
    
    // Format limit display - 0 means unlimited
    function formatLimit(limit: number): string {
        return limit === 0 ? '∞' : limit.toString();
    }
    
    // Calculate prorated upgrade price
    function getProratedPrice(newPlanPrice: number): number {
        if (userPlan === 'free' || currentPlanPrice === 0) {
            return newPlanPrice; // Full price if upgrading from free
        }
        const difference = newPlanPrice - currentPlanPrice;
        return difference > 0 ? difference : 0;
    }
    
    // Check if plan is an upgrade (or contact support plan)
    function isUpgrade(plan: any): boolean {
        // Contact support plans are always shown as upgrade options
        if (plan.contactSupport) return true;
        // Plans with higher price than current are upgrades
        return plan.price > currentPlanPrice;
    }
</script>

<div class="mx-auto max-w-4xl flex flex-col gap-8 pb-32">
    <div class="mb-2">
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">Billing & Subscription</h1>
        <p class="text-gray-500 text-base md:text-lg max-w-2xl">
            Manage your subscription plan and view payment history.
        </p>
    </div>

    {#if userRole === 'admin' && userPlan === 'unlimited'}
    <!-- Admin Banner -->
    <div class="flex items-center gap-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
        <div class="size-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <span class="material-symbols-outlined text-[24px] text-amber-500">shield</span>
        </div>
        <div>
            <h2 class="text-lg font-bold text-amber-400">Admin Account</h2>
            <p class="text-gray-400 text-sm">You have full admin access with unlimited plan.</p>
        </div>
    </div>
    {/if}

    <!-- Current Plan -->
    <section class="bg-dark-card rounded-xl border border-dark-border shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-dark-border flex items-center gap-3">
            <div class="p-2 {userLimits.planEnabled ? planInfo.color : 'bg-gray-500'}/10 rounded-lg {userLimits.planEnabled ? planInfo.textColor : 'text-gray-400'}">
                <span class="material-symbols-outlined">{userLimits.planEnabled ? planInfo.icon : 'block'}</span>
            </div>
            <h2 class="text-lg font-semibold text-white">Current Plan</h2>
        </div>
        <div class="p-6">
            {#if userLimits.planEnabled}
                <div class="flex items-center justify-between">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <span class="text-2xl font-bold text-white">{getPlanDisplayName(userPlan)}</span>
                            <span class="px-2 py-0.5 text-xs font-bold bg-green-500/10 text-green-400 rounded">ACTIVE</span>
                            {#if userRole === 'admin'}
                                <span class="px-2 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-400 rounded">ADMIN</span>
                            {/if}
                        </div>
                        <p class="text-gray-500 text-sm">{planInfo.bots} bots, {planInfo.flows} flows per bot</p>
                        {#if currentPlanPrice > 0}
                            <p class="text-gray-400 text-xs mt-1">RM {(currentPlanPrice / 100).toFixed(2)}/month</p>
                        {/if}
                    </div>
                    {#if subscription?.status === 'active'}
                        <div class="text-right">
                            <p class="text-gray-400 text-xs">Next billing</p>
                            <p class="text-white font-medium">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="text-center py-4">
                    <div class="inline-flex items-center gap-2 mb-2">
                        <span class="text-2xl font-bold text-gray-400">No Plan</span>
                        <span class="px-2 py-0.5 text-xs font-bold bg-red-500/10 text-red-400 rounded">INACTIVE</span>
                    </div>
                    <p class="text-gray-500 text-sm mb-4">You don't have an active subscription plan.</p>
                    <p class="text-gray-400 text-xs">Subscribe to a plan below to create and manage your bots.</p>
                </div>
            {/if}
        </div>
    </section>

    <!-- Upgrade Options -->
    {#if userPlan !== 'unlimited'}
        <section>
            <h2 class="text-xl font-bold text-white mb-4">Upgrade Your Plan</h2>
            
            <!-- Prorated Upgrade Info -->
            {#if currentPlanPrice > 0}
                <div class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                    <div class="flex items-center gap-2 text-blue-400 font-bold mb-1">
                        <span class="material-symbols-outlined text-[18px]">info</span>
                        Prorated Upgrade
                    </div>
                    <p class="text-gray-400 text-sm">
                        Upgrading from your current plan? You only pay the <strong class="text-white">price difference</strong> now. 
                        Next month, you'll be charged the full new plan price.
                    </p>
                </div>
            {/if}
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Paid Plans from Database -->
                {#if plans.length > 0}
                    {#each plans.filter(p => isUpgrade(p)) as plan}
                        {@const proratedPrice = getProratedPrice(plan.price)}
                        <div class="bg-dark-card rounded-xl border border-dark-border p-6 relative {plan.contactSupport ? 'border-amber-500/30' : plan.name.toLowerCase().includes('pro') ? 'border-emerald-500/50' : ''}">
                            {#if plan.name.toLowerCase().includes('pro') && !plan.contactSupport}
                                <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span class="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">POPULAR</span>
                                </div>
                            {/if}
                            {#if plan.contactSupport}
                                <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span class="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">CONTACT</span>
                                </div>
                            {/if}
                            
                            <div class="flex items-center gap-3 mb-3">
                                <div class="p-2 {plan.contactSupport ? 'bg-amber-500/10' : 'bg-emerald-500/10'} rounded-lg">
                                    <span class="material-symbols-outlined {plan.contactSupport ? 'text-amber-400' : 'text-emerald-400'}">{plan.contactSupport ? 'support_agent' : 'star'}</span>
                                </div>
                                <h3 class="text-lg font-bold text-white">{plan.name}</h3>
                            </div>
                            <p class="text-gray-500 text-sm mb-4">{plan.description || 'Premium features for growing needs'}</p>
                            
                            <div class="mb-4">
                                {#if plan.contactSupport}
                                    <!-- Contact Support Plan -->
                                    <span class="text-2xl font-bold text-amber-400">Contact Support</span>
                                {:else if proratedPrice < plan.price && currentPlanPrice > 0}
                                    <!-- Prorated Price Display -->
                                    <div class="flex items-baseline gap-2">
                                        <span class="text-3xl font-bold text-emerald-400">RM {(proratedPrice / 100).toFixed(2)}</span>
                                        <span class="text-gray-500 line-through">RM {(plan.price / 100).toFixed(2)}</span>
                                    </div>
                                    <p class="text-xs text-emerald-400 mt-1">Pay difference now • RM {(plan.price / 100).toFixed(2)}/{plan.interval} after</p>
                                {:else}
                                    <span class="text-3xl font-bold text-white">RM {(plan.price / 100).toFixed(2)}</span>
                                    <span class="text-gray-500">/{plan.interval}</span>
                                {/if}
                            </div>
                            
                            <div class="space-y-2 mb-6">
                                <div class="flex items-center gap-2 text-gray-400 text-sm">
                                    <span class="material-symbols-outlined text-[16px] {plan.contactSupport ? 'text-amber-400' : 'text-emerald-400'}">check</span>
                                    {formatLimit(plan.botLimit)} Bots
                                </div>
                                <div class="flex items-center gap-2 text-gray-400 text-sm">
                                    <span class="material-symbols-outlined text-[16px] {plan.contactSupport ? 'text-amber-400' : 'text-emerald-400'}">check</span>
                                    {formatLimit(plan.flowLimit)} Flows per bot
                                </div>
                                <div class="flex items-center gap-2 text-gray-400 text-sm">
                                    <span class="material-symbols-outlined text-[16px] {plan.contactSupport ? 'text-amber-400' : 'text-emerald-400'}">check</span>
                                    Priority Support
                                </div>
                            </div>
                            
                            {#if plan.contactSupport}
                                <a 
                                    href="mailto:{supportEmail || 'support@example.com'}?subject=Plan Upgrade - {plan.name}"
                                    class="block w-full py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors text-center"
                                >
                                    Contact Support
                                </a>
                            {:else if gatewayEnabled}
                                <button 
                                    onclick={() => upgradePlan(plan.id, proratedPrice)} 
                                    disabled={upgrading === plan.id}
                                    class="w-full py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                >
                                    {upgrading === plan.id ? 'Processing...' : `Upgrade for RM ${(proratedPrice / 100).toFixed(2)}`}
                                </button>
                            {:else}
                                <p class="text-center text-gray-500 text-sm">Payment gateway not configured</p>
                            {/if}
                        </div>
                    {/each}
                {:else if !gatewayEnabled}
                    <div class="bg-dark-card rounded-xl border border-dark-border p-6 text-center">
                        <span class="material-symbols-outlined text-[48px] text-gray-600 mb-4">payments</span>
                        <h3 class="text-lg font-bold text-white mb-2">Online Payments</h3>
                        <p class="text-gray-500 text-sm">Payment gateway not configured. Contact admin for upgrades.</p>
                    </div>
                {/if}
                
                <!-- Unlimited Plan - Contact Support -->
                <div class="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl border border-amber-500/30 p-6 relative">
                    <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span class="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">rocket_launch</span>
                            ENTERPRISE
                        </span>
                    </div>
                    
                    <div class="flex items-center gap-3 mb-3 mt-2">
                        <div class="p-2 bg-amber-500/20 rounded-lg">
                            <span class="material-symbols-outlined text-amber-400">rocket_launch</span>
                        </div>
                        <h3 class="text-lg font-bold text-amber-400">Unlimited Plan</h3>
                    </div>
                    <p class="text-gray-400 text-sm mb-4">For power users and enterprise needs</p>
                    
                    <div class="mb-6">
                        <span class="text-3xl font-bold text-white">Custom</span>
                        <span class="text-gray-500"> pricing</span>
                    </div>
                    
                    <div class="space-y-2 mb-6">
                        <div class="flex items-center gap-2 text-gray-300 text-sm">
                            <span class="material-symbols-outlined text-[16px] text-amber-400">all_inclusive</span>
                            Unlimited Bots
                        </div>
                        <div class="flex items-center gap-2 text-gray-300 text-sm">
                            <span class="material-symbols-outlined text-[16px] text-amber-400">all_inclusive</span>
                            Unlimited Flows
                        </div>
                        <div class="flex items-center gap-2 text-gray-300 text-sm">
                            <span class="material-symbols-outlined text-[16px] text-amber-400">support_agent</span>
                            Dedicated Support
                        </div>
                        <div class="flex items-center gap-2 text-gray-300 text-sm">
                            <span class="material-symbols-outlined text-[16px] text-amber-400">verified</span>
                            Custom Features
                        </div>
                    </div>
                    
                    {#if supportEmail}
                        <a 
                            href="mailto:{supportEmail}?subject=Unlimited Plan Inquiry&body=Hi, I'm interested in upgrading to the Unlimited plan. My account email is: {$session.data?.user?.email}"
                            class="w-full py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <span class="material-symbols-outlined text-[20px]">mail</span>
                            Contact Support
                        </a>
                    {:else}
                        <button 
                            onclick={() => alert('Please contact the administrator for Unlimited plan upgrades.')}
                            class="w-full py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <span class="material-symbols-outlined text-[20px]">support_agent</span>
                            Contact Admin
                        </button>
                    {/if}
                </div>
            </div>
            
            <!-- No upgrade plans available -->
            {#if gatewayEnabled && plans.filter(p => isUpgrade(p.price)).length === 0 && !loading}
                <div class="text-center py-4 text-gray-500">
                    <p>You're on the highest paid plan available. Contact support for Unlimited access.</p>
                </div>
            {/if}
        </section>
    {/if}

    <!-- Payment History -->
    {#if transactions.length > 0}
        <section class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
            <div class="px-6 py-5 border-b border-dark-border flex items-center gap-3">
                <div class="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <span class="material-symbols-outlined">receipt_long</span>
                </div>
                <h2 class="text-lg font-semibold text-white">Payment History</h2>
            </div>
            <table class="w-full">
                <thead class="bg-dark-surface border-b border-dark-border">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-dark-border">
                    {#each transactions as tx}
                        <tr class="hover:bg-white/5">
                            <td class="px-6 py-4 text-gray-400 text-sm">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td class="px-6 py-4 text-white">{tx.metadata?.planName || 'Subscription'}</td>
                            <td class="px-6 py-4 text-white font-medium">RM {(tx.amount / 100).toFixed(2)}</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded text-xs font-bold uppercase {
                                    tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                    tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-red-500/10 text-red-400'
                                }">
                                    {tx.status}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </section>
    {/if}
    
    <!-- No Transactions Yet -->
    {#if transactions.length === 0 && !loading && userPlan === 'free'}
        <section class="bg-dark-card rounded-xl border border-dark-border p-8 text-center">
            <span class="material-symbols-outlined text-[48px] text-gray-600 mb-4">receipt_long</span>
            <h3 class="text-lg font-bold text-white mb-2">No Payment History</h3>
            <p class="text-gray-500">Upgrade your plan to see your payment history here.</p>
        </section>
    {/if}
</div>
