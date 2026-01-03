<script lang="ts">
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    
    let users = $state<any[]>([]);
    let plans = $state<any[]>([]);
    let loading = $state(true);
    let search = $state('');
    let pagination = $state({ page: 1, limit: 20, total: 0, pages: 0 });
    let selectedUser = $state<any>(null);
    let showEditModal = $state(false);
    
    // Default plans that always exist
    const defaultPlans = [
        { id: 'free', name: 'Free', value: 'free' },
        { id: 'unlimited', name: 'Unlimited (Admin Only)', value: 'unlimited' }
    ];
    
    onMount(async () => {
        await loadUsers();
        await loadPlans();
    });
    
    async function loadUsers() {
        loading = true;
        try {
            const response = await api.get(`/admin/users?page=${pagination.page}&search=${search}`);
            users = response.users;
            pagination = response.pagination;
        } catch (error) {
            console.error('Failed to load users:', error);
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
    
    async function updateUser() {
        if (!selectedUser) return;
        try {
            await api.put(`/admin/users/${selectedUser.id}`, {
                role: selectedUser.role,
                plan: selectedUser.plan
            });
            showEditModal = false;
            await loadUsers();
        } catch (error) {
            console.error('Failed to update user:', error);
        }
    }
    
    async function deleteUser(userId: string) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            await loadUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    }
    
    function editUser(user: any) {
        selectedUser = { ...user };
        showEditModal = true;
    }
    
    function handleSearch() {
        pagination.page = 1;
        loadUsers();
    }
    
    // Get plan display name
    function getPlanName(planValue: string): string {
        if (planValue === 'free') return 'Free';
        if (planValue === 'unlimited') return 'Unlimited';
        const found = plans.find(p => p.id === planValue || p.name.toLowerCase() === planValue);
        return found?.name || planValue;
    }
</script>

<div class="flex flex-col gap-4 sm:gap-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 class="text-xl sm:text-2xl font-bold text-white">User Management</h1>
            <p class="text-gray-500 text-sm sm:text-base">Manage all user accounts and permissions</p>
        </div>
        <div class="flex items-center gap-2 sm:gap-3">
            <div class="relative flex-1 sm:flex-initial">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px] sm:text-[20px]">search</span>
                <input 
                    type="text" 
                    bind:value={search}
                    onkeydown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search users..." 
                    class="w-full sm:w-auto pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
            </div>
            <button onclick={handleSearch} class="px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm shrink-0">
                Search
            </button>
        </div>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
        <div class="bg-dark-card rounded-xl border border-dark-border p-4">
            <p class="text-gray-500 text-sm">Total Users</p>
            <p class="text-2xl font-bold text-white">{pagination.total}</p>
        </div>
        <div class="bg-dark-card rounded-xl border border-dark-border p-4">
            <p class="text-gray-500 text-sm">Admins</p>
            <p class="text-2xl font-bold text-amber-400">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div class="bg-dark-card rounded-xl border border-dark-border p-4">
            <p class="text-gray-500 text-sm">Pro/Unlimited</p>
            <p class="text-2xl font-bold text-emerald-400">{users.filter(u => u.plan !== 'free').length}</p>
        </div>
    </div>
    
    <!-- Users Table -->
    <div class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div class="overflow-x-auto">
        <table class="w-full min-w-[500px]">
            <thead class="bg-dark-surface border-b border-dark-border">
                <tr>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Joined</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-dark-border">
                {#if loading}
                    <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                            <span class="material-symbols-outlined animate-spin">progress_activity</span>
                            Loading users...
                        </td>
                    </tr>
                {:else if users.length === 0}
                    <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">No users found</td>
                    </tr>
                {:else}
                    {#each users as user}
                        <tr class="hover:bg-white/5">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    {#if user.image}
                                        <img src={user.image} alt="" class="size-10 rounded-full" />
                                    {:else}
                                        <div class="size-10 rounded-full bg-gray-700 flex items-center justify-center">
                                            <span class="text-white font-bold">{user.name?.charAt(0) || '?'}</span>
                                        </div>
                                    {/if}
                                    <div>
                                        <p class="text-white font-medium">{user.name}</p>
                                        <p class="text-gray-500 text-sm">{user.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded text-xs font-bold uppercase {user.role === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}">
                                    {user.role}
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded text-xs font-bold uppercase {
                                    user.plan === 'unlimited' ? 'bg-amber-500/10 text-amber-400' :
                                    user.plan === 'free' ? 'bg-indigo-500/10 text-indigo-400' :
                                    'bg-emerald-500/10 text-emerald-400'
                                }">
                                    {getPlanName(user.plan)}
                                </span>
                            </td>
                            <td class="px-4 sm:px-6 py-3 sm:py-4 text-gray-400 text-sm hidden sm:table-cell">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button onclick={() => editUser(user)} class="p-2 text-gray-400 hover:text-white transition-colors">
                                    <span class="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button onclick={() => deleteUser(user.id)} class="p-2 text-gray-400 hover:text-red-400 transition-colors">
                                    <span class="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
        </div>
        
        <!-- Pagination -->
        {#if pagination.pages > 1}
            <div class="px-6 py-4 border-t border-dark-border flex items-center justify-between">
                <p class="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div class="flex items-center gap-2">
                    <button 
                        onclick={() => { pagination.page--; loadUsers(); }}
                        disabled={pagination.page === 1}
                        class="px-3 py-1 bg-dark-border rounded text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Prev
                    </button>
                    <span class="text-gray-400">Page {pagination.page} of {pagination.pages}</span>
                    <button 
                        onclick={() => { pagination.page++; loadUsers(); }}
                        disabled={pagination.page === pagination.pages}
                        class="px-3 py-1 bg-dark-border rounded text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

<!-- Edit Modal -->
{#if showEditModal && selectedUser}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-dark-card rounded-xl border border-dark-border w-full max-w-md p-6">
            <h2 class="text-xl font-bold text-white mb-4">Edit User</h2>
            
            <div class="space-y-4">
                <div>
                    <label for="edit-role" class="block text-sm font-medium text-gray-400 mb-2">Role</label>
                    <select id="edit-role" bind:value={selectedUser.role} class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div>
                    <label for="edit-plan" class="block text-sm font-medium text-gray-400 mb-2">Plan</label>
                    <select id="edit-plan" bind:value={selectedUser.plan} class="w-full px-4 py-2 bg-dark-base border border-dark-border rounded-lg text-white">
                        <!-- Default Plans -->
                        <optgroup label="Default Plans">
                            <option value="free">Free</option>
                            <option value="unlimited">Unlimited (Admin Only)</option>
                        </optgroup>
                        
                        <!-- Custom Plans from Database -->
                        {#if plans.length > 0}
                            <optgroup label="Subscription Plans">
                                {#each plans as plan}
                                    <option value={plan.name.toLowerCase().replace(/\s+/g, '_')}>{plan.name} - RM{(plan.price / 100).toFixed(2)}/{plan.interval}</option>
                                {/each}
                            </optgroup>
                        {/if}
                    </select>
                    <p class="text-xs text-gray-500 mt-1">
                        {#if selectedUser.plan === 'unlimited'}
                            <span class="text-amber-400">⚡ Unlimited plan is for admin use only</span>
                        {:else if selectedUser.plan === 'free'}
                            Default free tier with basic features
                        {:else}
                            Paid subscription plan
                        {/if}
                    </p>
                </div>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button onclick={() => showEditModal = false} class="flex-1 px-4 py-2 bg-dark-border text-gray-400 rounded-lg hover:text-white transition-colors">
                    Cancel
                </button>
                <button onclick={updateUser} class="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                    Save Changes
                </button>
            </div>
        </div>
    </div>
{/if}
