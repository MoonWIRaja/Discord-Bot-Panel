<script lang="ts">
    import { browser } from '$app/environment';
    import { useSvelteFlow } from '@xyflow/svelte';
    
    interface ActivityData {
        user: { name: string; color: string };
        type: string;
        nodeId?: string;
        nodePosition?: { x: number; y: number };
        sidebarItem?: string;
    }
    
    let { activities = new Map() }: { 
        activities: Map<string, ActivityData>;
    } = $props();
    
    // Node dimensions (standard)
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 70;
    
    // Get SvelteFlow instance for coordinate conversion (only in browser)
    const flow = browser ? useSvelteFlow() : null;
    
    // Convert flow position to screen position for display
    function toScreen(pos: { x: number; y: number }): { x: number; y: number } {
        if (flow && browser) {
            return flow.flowToScreenPosition(pos);
        }
        return pos;
    }
    
    // Get center in screen coordinates
    function getCenterScreen(flowPos: { x: number; y: number }): { x: number; y: number } {
        const centerFlow = {
            x: flowPos.x + NODE_WIDTH / 2,
            y: flowPos.y + NODE_HEIGHT / 2
        };
        return toScreen(centerFlow);
    }
    
    // Get top-left in screen coordinates
    function getTopLeftScreen(flowPos: { x: number; y: number }): { x: number; y: number } {
        return toScreen(flowPos);
    }
    
    // Get node dimensions in screen scale
    function getScreenDimensions(): { width: number; height: number } {
        if (flow && browser) {
            const viewport = flow.getViewport();
            return {
                width: NODE_WIDTH * viewport.zoom,
                height: NODE_HEIGHT * viewport.zoom
            };
        }
        return { width: NODE_WIDTH, height: NODE_HEIGHT };
    }
</script>

<!-- 
    Activity-based cursor display
    Converts flow coordinates to screen coordinates for proper display
-->
{#if browser && activities && activities.size > 0}
    {#each Array.from(activities.entries()) as [socketId, activity]}
        {#if activity.type === 'dragging-node' && activity.nodePosition}
            {@const screenCenter = getCenterScreen(activity.nodePosition)}
            {@const screenTopLeft = getTopLeftScreen(activity.nodePosition)}
            {@const dims = getScreenDimensions()}
            
            <!-- Cursor at CENTER of where remote user is dragging -->
            <div 
                class="fixed pointer-events-none z-[9999]"
                style="left: {screenCenter.x}px; top: {screenCenter.y}px; transform: translate(-50%, -50%);"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));">
                    <path d="M5 3L19 12L11 12L7 20L5 3Z" fill="{activity.user.color}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                <div 
                    class="absolute top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[11px] font-bold text-white whitespace-nowrap shadow-xl"
                    style="background: {activity.user.color};"
                >
                    {activity.user.name}
                </div>
            </div>
            
            <!-- Drag indicator ring around node -->
            <div 
                class="fixed pointer-events-none z-40 rounded-xl"
                style="left: {screenTopLeft.x - 3}px; top: {screenTopLeft.y - 3}px; width: {dims.width + 6}px; height: {dims.height + 6}px; border: 2px dashed {activity.user.color}; background: {activity.user.color}15;"
            ></div>
            
        {:else if activity.type === 'selecting-node' && activity.nodePosition}
            {@const screenCenter = getCenterScreen(activity.nodePosition)}
            {@const screenTopLeft = getTopLeftScreen(activity.nodePosition)}
            {@const dims = getScreenDimensions()}
            
            <!-- Selection glow ring -->
            <div 
                class="fixed pointer-events-none z-40 rounded-xl animate-pulse"
                style="left: {screenTopLeft.x - 4}px; top: {screenTopLeft.y - 4}px; width: {dims.width + 8}px; height: {dims.height + 8}px; border: 3px solid {activity.user.color}; box-shadow: 0 0 20px {activity.user.color}70;"
            ></div>
            
            <!-- Cursor at CENTER of selected node -->
            <div 
                class="fixed pointer-events-none z-[9999]"
                style="left: {screenCenter.x}px; top: {screenCenter.y}px; transform: translate(-50%, -50%);"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));">
                    <path d="M5 3L19 12L11 12L7 20L5 3Z" fill="{activity.user.color}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                <div 
                    class="absolute top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[11px] font-bold text-white whitespace-nowrap shadow-xl"
                    style="background: {activity.user.color};"
                >
                    {activity.user.name}
                </div>
            </div>
            
        {:else if activity.type === 'dragging-sidebar-item' && activity.sidebarItem}
            <!-- Sidebar drag indicator - fixed position near sidebar -->
            <div 
                class="fixed pointer-events-none z-[9999]"
                style="left: 280px; top: 120px;"
            >
                <div 
                    class="px-3 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 shadow-2xl animate-bounce"
                    style="background: linear-gradient(135deg, {activity.user.color}, {activity.user.color}cc);"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M5 3L19 12L11 12L7 20L5 3Z" fill="white"/>
                    </svg>
                    <span>{activity.user.name}</span>
                    <span class="bg-white/30 px-2 py-1 rounded-lg font-bold">{activity.sidebarItem}</span>
                </div>
            </div>
        {/if}
    {/each}
{/if}
