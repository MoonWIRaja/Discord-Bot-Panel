<script lang="ts">
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    
    let settings = $state<Record<string, any>>({});
    let plans = $state<any[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let activeTab = $state('general');
    
    // Payment gateway settings
    let paymentSettings = $state({
        gateway: 'none',
        hitpay_api_key: '',
        hitpay_salt: '',
        stripe_secret_key: '',
        stripe_publishable_key: '',
        alipay_client_id: '',
        alipay_private_key: '',
        webhook_url: ''
    });
    
    // General settings
    let generalSettings = $state({
        site_name: 'BotPanel',
        site_url: '',
        maintenance_mode: false,
        registration_enabled: true,
        default_plan: 'free'
    });
    
    // Email/Support settings
    let emailSettings = $state({
        support_email: '',
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        smtp_from: '',
        smtp_from_name: 'BotPanel Support'
    });
    
    // New plan form
    let showPlanModal = $state(false);
    let editingPlan = $state<any>(null); // Plan being edited (null = create new)
    let planForm = $state({
        name: '',
        description: '',
        priceDisplay: '', // User enters as "10.00"
        currency: 'MYR',
        interval: 'monthly',
        botLimit: 5,
        flowLimit: 10,
        contactSupport: false, // If true, requires contact instead of payment
        features: [] as string[]
    });
    
    // Default plans config (Free and Unlimited)
    let defaultPlans = $state({
        freePlanEnabled: true, // Toggle to enable/disable free plan
        free: { botLimit: 5, flowLimit: 10 },
        unlimited: { botLimit: 0, flowLimit: 0 }
    });
    
    // Helper to parse number and preserve 0
    function parseNumber(val: any, fallback: number): number {
        if (val === undefined || val === null || val === '') return fallback;
        const num = parseInt(String(val), 10);
        return isNaN(num) ? fallback : num;
    }
    
    // Available currencies
    const currencies = [
        { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
        { code: 'THB', symbol: '฿', name: 'Thai Baht' }
    ];
    
    onMount(async () => {
        await loadSettings();
        await loadPlans();
    });
    
    async function loadSettings() {
        loading = true;
        try {
            const response = await api.get('/admin/settings');
            settings = response;
            
            // Populate payment settings
            if (settings.payment_gateway) paymentSettings.gateway = settings.payment_gateway;
            if (settings.hitpay_api_key) paymentSettings.hitpay_api_key = settings.hitpay_api_key;
            if (settings.stripe_secret_key) paymentSettings.stripe_secret_key = settings.stripe_secret_key;
            if (settings.alipay_client_id) paymentSettings.alipay_client_id = settings.alipay_client_id;
            
            // Populate general settings
            if (settings.site_name) generalSettings.site_name = settings.site_name;
            if (settings.site_url) generalSettings.site_url = settings.site_url;
            if (settings.maintenance_mode !== undefined) generalSettings.maintenance_mode = settings.maintenance_mode;
            if (settings.registration_enabled !== undefined) generalSettings.registration_enabled = settings.registration_enabled;
            
            // Populate email settings
            if (settings.support_email) emailSettings.support_email = settings.support_email;
            if (settings.smtp_host) emailSettings.smtp_host = settings.smtp_host;
            if (settings.smtp_port) emailSettings.smtp_port = settings.smtp_port;
            if (settings.smtp_user) emailSettings.smtp_user = settings.smtp_user;
            if (settings.smtp_from) emailSettings.smtp_from = settings.smtp_from;
            if (settings.smtp_from_name) emailSettings.smtp_from_name = settings.smtp_from_name;
            
            // Populate default plan limits (use parseNumber to preserve 0)
            defaultPlans.freePlanEnabled = settings.free_plan_enabled !== 'false';
            defaultPlans.free.botLimit = parseNumber(settings.free_bot_limit, 5);
            defaultPlans.free.flowLimit = parseNumber(settings.free_flow_limit, 10);
            defaultPlans.unlimited.botLimit = parseNumber(settings.unlimited_bot_limit, 0);
            defaultPlans.unlimited.flowLimit = parseNumber(settings.unlimited_flow_limit, 0);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            loading = false;
        }
    }
    
    async function loadPlans() {
        try {
            plans = await api.get('/admin/plans');
        } catch (error) {
            console.error('Failed to load plans:', error);
        }
    }
    
    async function saveGeneralSettings() {
        saving = true;
        try {
            await api.post('/admin/settings/bulk', {
                category: 'general',
                settings: generalSettings
            });
            alert('Settings saved!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            saving = false;
        }
    }
    
    async function savePaymentSettings() {
        saving = true;
        try {
            await api.post('/admin/settings/bulk', {
                category: 'payment',
                settings: {
                    payment_gateway: paymentSettings.gateway,
                    hitpay_api_key: paymentSettings.hitpay_api_key,
                    hitpay_salt: paymentSettings.hitpay_salt,
                    stripe_secret_key: paymentSettings.stripe_secret_key,
                    stripe_publishable_key: paymentSettings.stripe_publishable_key,
                    alipay_client_id: paymentSettings.alipay_client_id,
                    alipay_private_key: paymentSettings.alipay_private_key
                }
            });
            alert('Payment settings saved!');
        } catch (error) {
            console.error('Failed to save payment settings:', error);
            alert('Failed to save payment settings');
        } finally {
            saving = false;
        }
    }
    
    async function saveEmailSettings() {
        saving = true;
        try {
            await api.post('/admin/settings/bulk', {
                category: 'email',
                settings: emailSettings
            });
            alert('Email settings saved!');
        } catch (error) {
            console.error('Failed to save email settings:', error);
            alert('Failed to save email settings');
        } finally {
            saving = false;
        }
    }
    
    async function savePlan() {
        try {
            // Convert display price to cents (e.g., "10.50" -> 1050)
            const priceInCents = Math.round(parseFloat(planForm.priceDisplay || '0') * 100);
            
            const planData = {
                name: planForm.name,
                description: planForm.description,
                price: planForm.contactSupport ? 0 : priceInCents,
                currency: planForm.currency,
                interval: planForm.interval,
                botLimit: planForm.botLimit,
                flowLimit: planForm.flowLimit,
                contactSupport: planForm.contactSupport,
                features: planForm.features
            };
            
            if (editingPlan) {
                // Update existing plan
                await api.put(`/admin/plans/${editingPlan.id}`, planData);
            } else {
                // Create new plan
                await api.post('/admin/plans', planData);
            }
            
            closePlanModal();
            await loadPlans();
        } catch (error) {
            console.error('Failed to save plan:', error);
            alert('Failed to save plan');
        }
    }
    
    function openEditModal(plan: any) {
        editingPlan = plan;
        planForm = {
            name: plan.name,
            description: plan.description || '',
            priceDisplay: plan.price ? (plan.price / 100).toFixed(2) : '',
            currency: plan.currency || 'MYR',
            interval: plan.interval || 'monthly',
            botLimit: plan.botLimit ?? 5,
            flowLimit: plan.flowLimit ?? 10,
            contactSupport: plan.contactSupport || false,
            features: plan.features || []
        };
        showPlanModal = true;
    }
    
    function openCreateModal() {
        editingPlan = null;
        planForm = {
            name: '',
            description: '',
            priceDisplay: '',
            currency: 'MYR',
            interval: 'monthly',
            botLimit: 5,
            flowLimit: 10,
            contactSupport: false,
            features: []
        };
        showPlanModal = true;
    }
    
    function closePlanModal() {
        showPlanModal = false;
        editingPlan = null;
    }
    
    async function saveDefaultPlans() {
        saving = true;
        try {
            await api.post('/admin/settings/bulk', {
                category: 'plans',
                settings: {
                    free_plan_enabled: defaultPlans.freePlanEnabled,
                    free_bot_limit: defaultPlans.free.botLimit,
                    free_flow_limit: defaultPlans.free.flowLimit,
                    unlimited_bot_limit: defaultPlans.unlimited.botLimit,
                    unlimited_flow_limit: defaultPlans.unlimited.flowLimit
                }
            });
            alert('Default plan limits saved!');
        } catch (error) {
            console.error('Failed to save default plans:', error);
            alert('Failed to save');
        } finally {
            saving = false;
        }
    }
    
    async function deletePlan(planId: string) {
        if (!confirm('Delete this plan?')) return;
        try {
            await api.delete(`/admin/plans/${planId}`);
            await loadPlans();
        } catch (error) {
            console.error('Failed to delete plan:', error);
        }
    }
</script>

<div class="flex flex-col gap-6">
    <div>
        <h1 class="text-2xl font-bold text-white">System Settings</h1>
        <p class="text-gray-500">Configure platform settings and payment gateways</p>
    </div>
    
    <!-- Tabs -->
    <div class="flex gap-2 border-b border-dark-border">
        <button 
            onclick={() => activeTab = 'general'} 
            class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'general' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}"
        >
            General
        </button>
        <button 
            onclick={() => activeTab = 'email'} 
            class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'email' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}"
        >
            Email / Support
        </button>
        <button 
            onclick={() => activeTab = 'payment'} 
            class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'payment' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}"
        >
            Payment Gateway
        </button>
        <button 
            onclick={() => activeTab = 'plans'} 
            class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'plans' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}"
        >
            Subscription Plans
        </button>
    </div>
    
    {#if loading}
        <div class="flex items-center justify-center py-12 text-gray-500">
            <span class="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            Loading settings...
        </div>
    {:else}
        <!-- General Settings -->
        {#if activeTab === 'general'}
            <div class="bg-dark-card rounded-xl border border-dark-border p-6 space-y-6">
                <div>
                    <label for="site-name" class="block text-sm font-medium text-gray-400 mb-2">Site Name</label>
                    <input id="site-name" type="text" bind:value={generalSettings.site_name} class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                </div>
                <div>
                    <label for="site-url" class="block text-sm font-medium text-gray-400 mb-2">Site URL</label>
                    <input id="site-url" type="url" bind:value={generalSettings.site_url} placeholder="https://example.com" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                </div>
                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" bind:checked={generalSettings.registration_enabled} class="w-4 h-4" />
                        <span class="text-white">Allow new registrations</span>
                    </label>
                </div>
                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" bind:checked={generalSettings.maintenance_mode} class="w-4 h-4" />
                        <span class="text-white">Maintenance mode</span>
                    </label>
                </div>
                <button onclick={saveGeneralSettings} disabled={saving} class="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        {/if}
        
        <!-- Email/Support Settings -->
        {#if activeTab === 'email'}
            <div class="bg-dark-card rounded-xl border border-dark-border p-6 space-y-6">
                <div class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                    <h3 class="text-blue-400 font-bold mb-2">📧 Email Configuration</h3>
                    <p class="text-gray-400 text-sm">Configure email settings for support and notifications. Users who want Unlimited plan will contact this email.</p>
                </div>
                
                <div>
                    <label for="support-email" class="block text-sm font-medium text-gray-400 mb-2">Support Email</label>
                    <input id="support-email" type="email" bind:value={emailSettings.support_email} placeholder="support@yourdomain.com" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                    <p class="text-xs text-gray-500 mt-1">Users will contact this email for Unlimited plan requests</p>
                </div>
                
                <hr class="border-dark-border" />
                
                <h4 class="text-white font-semibold">SMTP Settings (Optional)</h4>
                <p class="text-gray-500 text-sm mb-4">Configure SMTP to send emails from your platform</p>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="smtp-host" class="block text-sm font-medium text-gray-400 mb-2">SMTP Host</label>
                        <input id="smtp-host" type="text" bind:value={emailSettings.smtp_host} placeholder="smtp.gmail.com" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                    </div>
                    <div>
                        <label for="smtp-port" class="block text-sm font-medium text-gray-400 mb-2">SMTP Port</label>
                        <input id="smtp-port" type="text" bind:value={emailSettings.smtp_port} placeholder="587" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="smtp-user" class="block text-sm font-medium text-gray-400 mb-2">SMTP Username</label>
                        <input id="smtp-user" type="text" bind:value={emailSettings.smtp_user} placeholder="your-email@gmail.com" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                    </div>
                    <div>
                        <label for="smtp-pass" class="block text-sm font-medium text-gray-400 mb-2">SMTP Password</label>
                        <input id="smtp-pass" type="password" bind:value={emailSettings.smtp_pass} placeholder="App password" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="smtp-from" class="block text-sm font-medium text-gray-400 mb-2">From Email</label>
                        <input id="smtp-from" type="email" bind:value={emailSettings.smtp_from} placeholder="noreply@yourdomain.com" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                    </div>
                    <div>
                        <label for="smtp-from-name" class="block text-sm font-medium text-gray-400 mb-2">From Name</label>
                        <input id="smtp-from-name" type="text" bind:value={emailSettings.smtp_from_name} placeholder="BotPanel Support" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                    </div>
                </div>
                
                <button onclick={saveEmailSettings} disabled={saving} class="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
            </div>
        {/if}
        
        <!-- Payment Gateway Settings -->
        {#if activeTab === 'payment'}
            <div class="bg-dark-card rounded-xl border border-dark-border p-6">
                <div class="text-center py-12">
                    <div class="inline-flex items-center justify-center w-20 h-20 bg-amber-500/10 rounded-full mb-6">
                        <span class="material-symbols-outlined text-5xl text-amber-400">payments</span>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-3">Payment Gateway</h2>
                    <p class="text-gray-400 mb-6 max-w-md mx-auto">
                        Payment gateway integration is coming soon! This is an open source project and payment integration can be developed by the community.
                    </p>
                    
                    <div class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg max-w-lg mx-auto mb-6">
                        <h3 class="text-blue-400 font-bold mb-2 flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">code</span>
                            For Developers
                        </h3>
                        <p class="text-gray-400 text-sm">
                            Want to add payment integration? The backend is already prepared with:
                        </p>
                        <ul class="text-left text-gray-400 text-sm mt-3 space-y-1">
                            <li class="flex items-center gap-2">
                                <span class="text-green-400">✓</span> Admin settings storage for API keys
                            </li>
                            <li class="flex items-center gap-2">
                                <span class="text-green-400">✓</span> Subscription plans management
                            </li>
                            <li class="flex items-center gap-2">
                                <span class="text-green-400">✓</span> User plans & limits system
                            </li>
                            <li class="flex items-center gap-2">
                                <span class="text-amber-400">→</span> Payment routes: <code class="bg-dark-base px-1 rounded">apps/api/src/routes/payments.ts</code>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="flex items-center justify-center gap-4">
                        <a 
                            href="https://github.com/MoonWIRaja/Discord-Bot-Panel" 
                            target="_blank" 
                            class="px-6 py-3 bg-white/5 border border-gray-700 text-white rounded-lg hover:bg-white/10 flex items-center gap-2"
                        >
                            <span class="material-symbols-outlined text-[18px]">code</span>
                            View on GitHub
                        </a>
                    </div>
                    
                    <div class="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg max-w-lg mx-auto">
                        <p class="text-amber-400 text-sm flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">lightbulb</span>
                            <span><strong>Tip:</strong> For now, use "Contact Support" plans in Subscription Plans tab</span>
                        </p>
                    </div>
                </div>
            </div>
        {/if}
        
        <!-- Subscription Plans -->
        {#if activeTab === 'plans'}
            <div class="space-y-4">
                <!-- Default Plans Config -->
                <div class="bg-dark-card rounded-xl border border-dark-border p-6 space-y-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-400">tune</span>
                        Default Plans Configuration
                    </h3>
                    <p class="text-gray-400 text-sm">Configure limits for built-in Free and Unlimited plans.</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Free Plan -->
                        <div class="p-4 {defaultPlans.freePlanEnabled ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-gray-500/10 border-gray-500/30'} border rounded-lg transition-colors">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <span class="px-2 py-1 {defaultPlans.freePlanEnabled ? 'bg-indigo-500' : 'bg-gray-500'} text-white rounded text-xs font-bold">FREE</span>
                                    <span class="text-white font-medium">Free Plan</span>
                                </div>
                                <!-- Toggle -->
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" bind:checked={defaultPlans.freePlanEnabled} class="sr-only peer" />
                                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                                </label>
                            </div>
                            {#if defaultPlans.freePlanEnabled}
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="free-bots" class="block text-xs text-gray-400 mb-1">Bot Limit</label>
                                        <input id="free-bots" type="number" bind:value={defaultPlans.free.botLimit} class="w-full px-3 py-2 bg-dark-base border border-dark-border rounded text-white" />
                                    </div>
                                    <div>
                                        <label for="free-flows" class="block text-xs text-gray-400 mb-1">Flow Limit</label>
                                        <input id="free-flows" type="number" bind:value={defaultPlans.free.flowLimit} class="w-full px-3 py-2 bg-dark-base border border-dark-border rounded text-white" />
                                    </div>
                                </div>
                                <p class="text-xs text-indigo-400 mt-2">0 = Unlimited</p>
                            {:else}
                                <p class="text-gray-500 text-sm">Free plan is disabled. New users will have no plan until they subscribe.</p>
                            {/if}
                        </div>
                        
                        <!-- Unlimited Plan -->
                        <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <div class="flex items-center gap-2 mb-4">
                                <span class="px-2 py-1 bg-amber-500 text-white rounded text-xs font-bold">UNLIMITED</span>
                                <span class="text-white font-medium">Unlimited Plan</span>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="unlimited-bots" class="block text-xs text-gray-400 mb-1">Bot Limit</label>
                                    <input id="unlimited-bots" type="number" bind:value={defaultPlans.unlimited.botLimit} class="w-full px-3 py-2 bg-dark-base border border-dark-border rounded text-white" />
                                </div>
                                <div>
                                    <label for="unlimited-flows" class="block text-xs text-gray-400 mb-1">Flow Limit</label>
                                    <input id="unlimited-flows" type="number" bind:value={defaultPlans.unlimited.flowLimit} class="w-full px-3 py-2 bg-dark-base border border-dark-border rounded text-white" />
                                </div>
                            </div>
                            <p class="text-xs text-amber-400 mt-2">0 = Unlimited (recommended)</p>
                        </div>
                    </div>
                    
                    <button onclick={saveDefaultPlans} disabled={saving} class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Default Plan Limits'}
                    </button>
                </div>
                
                <div class="flex justify-between items-center">
                    <h2 class="text-lg font-bold text-white">Custom Subscription Plans</h2>
                    <button onclick={openCreateModal} class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        Add Plan
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {#each plans as plan}
                        <div class="bg-dark-card rounded-xl border border-dark-border p-5 {plan.contactSupport ? 'border-amber-500/30' : ''}">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="text-lg font-bold text-white">{plan.name}</h3>
                                        {#if plan.contactSupport}
                                            <span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold">CONTACT</span>
                                        {/if}
                                    </div>
                                    <p class="text-gray-500 text-sm">{plan.description || 'No description'}</p>
                                </div>
                                <div class="flex gap-1">
                                    <button onclick={() => openEditModal(plan)} class="p-2 text-gray-400 hover:text-amber-400">
                                        <span class="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button onclick={() => deletePlan(plan.id)} class="p-2 text-gray-400 hover:text-red-400">
                                        <span class="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                            <div class="mb-4">
                                {#if plan.contactSupport || plan.price === 0}
                                    <span class="text-2xl font-bold text-amber-400">Contact Support</span>
                                {:else}
                                    {@const symbol = currencies.find(c => c.code === plan.currency)?.symbol || plan.currency}
                                    <span class="text-3xl font-bold text-white">{symbol}{(plan.price / 100).toFixed(2)}</span>
                                    <span class="text-gray-500">/{plan.interval}</span>
                                {/if}
                            </div>
                            <div class="space-y-2 text-sm">
                                <div class="flex items-center gap-2 text-gray-400">
                                    <span class="material-symbols-outlined text-[16px] text-emerald-400">check</span>
                                    {plan.botLimit === 0 ? '∞ Unlimited' : plan.botLimit} Bots
                                </div>
                                <div class="flex items-center gap-2 text-gray-400">
                                    <span class="material-symbols-outlined text-[16px] text-emerald-400">check</span>
                                    {plan.flowLimit === 0 ? '∞ Unlimited' : plan.flowLimit} Flows
                                </div>
                            </div>
                        </div>
                    {/each}
                    
                    {#if plans.length === 0}
                        <div class="col-span-3 text-center py-8 text-gray-500">
                            No custom plans configured. Click "Add Plan" to create one.
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    {/if}
</div>

<!-- Add/Edit Plan Modal -->
{#if showPlanModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-dark-card rounded-xl border border-dark-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-white mb-4">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
            
            <div class="space-y-4">
                <div>
                    <label for="plan-name" class="block text-sm font-medium text-gray-400 mb-2">Plan Name</label>
                    <input id="plan-name" type="text" bind:value={planForm.name} placeholder="e.g., Pro, Enterprise" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                </div>
                <div>
                    <label for="plan-desc" class="block text-sm font-medium text-gray-400 mb-2">Description</label>
                    <input id="plan-desc" type="text" bind:value={planForm.description} placeholder="Best for growing teams" class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                </div>
                
                <!-- Contact Support Toggle -->
                <div class="p-4 bg-dark-base border border-dark-border rounded-lg">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" bind:checked={planForm.contactSupport} class="w-5 h-5 rounded" />
                        <div>
                            <span class="text-white font-medium">Contact Support to Purchase</span>
                            <p class="text-xs text-gray-500">Users must contact support to get this plan (no online payment)</p>
                        </div>
                    </label>
                </div>
                
                <!-- Pricing Section (hidden if contact support) -->
                {#if !planForm.contactSupport}
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="plan-currency" class="block text-sm font-medium text-gray-400 mb-2">Currency</label>
                            <select id="plan-currency" bind:value={planForm.currency} class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white">
                                {#each currencies as curr}
                                    <option value={curr.code}>{curr.code} ({curr.symbol})</option>
                                {/each}
                            </select>
                        </div>
                        <div>
                            <label for="plan-price" class="block text-sm font-medium text-gray-400 mb-2">Price</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {currencies.find(c => c.code === planForm.currency)?.symbol || 'RM'}
                                </span>
                                <input 
                                    id="plan-price" 
                                    type="text" 
                                    bind:value={planForm.priceDisplay} 
                                    placeholder="10.00" 
                                    class="w-full pl-10 pr-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" 
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label for="plan-interval" class="block text-sm font-medium text-gray-400 mb-2">Billing Interval</label>
                        <select id="plan-interval" bind:value={planForm.interval} class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white">
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="lifetime">Lifetime (One-time)</option>
                        </select>
                    </div>
                {:else}
                    <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p class="text-amber-400 text-sm flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">support_agent</span>
                            This plan will show "Contact Support" instead of a price
                        </p>
                    </div>
                {/if}
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="plan-bots" class="block text-sm font-medium text-gray-400 mb-2">Bot Limit</label>
                        <input id="plan-bots" type="number" bind:value={planForm.botLimit} class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                        <p class="text-xs text-gray-500 mt-1">0 = Unlimited</p>
                    </div>
                    <div>
                        <label for="plan-flows" class="block text-sm font-medium text-gray-400 mb-2">Flow Limit</label>
                        <input id="plan-flows" type="number" bind:value={planForm.flowLimit} class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white" />
                        <p class="text-xs text-gray-500 mt-1">0 = Unlimited</p>
                    </div>
                </div>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button onclick={closePlanModal} class="flex-1 px-4 py-2 bg-dark-border text-gray-400 rounded-lg hover:text-white">Cancel</button>
                <button onclick={savePlan} class="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                    {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
            </div>
        </div>
    </div>
{/if}
