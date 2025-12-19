<script lang="ts">
    import { browser } from '$app/environment';
    import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/svelte';

    let { 
        id,
        sourceX, 
        sourceY, 
        targetX, 
        targetY, 
        sourcePosition, 
        targetPosition,
        style,
        markerEnd
    }: EdgeProps = $props();

    let showActions = $state(false);
    let showDropdown = $state(false);
    let showConfirm = $state(false);

    const edgePath = $derived.by(() => {
        const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
        return path;
    });

    const cx = $derived((sourceX + targetX) / 2);
    const cy = $derived((sourceY + targetY) / 2);

    const nodes = [
        { label: 'Send Reply', type: 'action', icon: 'reply', color: '#3b82f6' },
        { label: 'Send DM', type: 'action', icon: 'mail', color: '#ec4899' },
        { label: 'Add Role', type: 'action', icon: 'admin_panel_settings', color: '#10b981' },
        { label: 'Remove Role', type: 'action', icon: 'person_remove', color: '#ef4444' },
        { label: 'Ban User', type: 'action', icon: 'block', color: '#dc2626' },
        { label: 'Kick User', type: 'action', icon: 'logout', color: '#f97316' },
        { label: 'Delay', type: 'action', icon: 'schedule', color: '#64748b' },
        { label: 'Custom Code', type: 'code', icon: 'code', color: '#f59e0b' }
    ];

    function confirmDelete() {
        if (!browser) return;
        window.dispatchEvent(new CustomEvent('edge-delete', { detail: { edgeId: id } }));
        showConfirm = false;
        showActions = false;
    }

    function addNode(n: typeof nodes[0]) {
        if (!browser) return;
        window.dispatchEvent(new CustomEvent('edge-insert-node', { 
            detail: { edgeId: id, nodeType: n.type, nodeLabel: n.label, nodeIcon: n.icon, nodeColor: n.color, position: { x: cx, y: cy } }
        }));
        showDropdown = false;
        showActions = false;
    }

    function keepOpen() {
        showActions = true;
    }

    function tryClose() {
        if (!showDropdown && !showConfirm) {
            showActions = false;
        }
    }
</script>

<!-- Edge line -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<g onmouseenter={keepOpen} onmouseleave={tryClose}>
    <path d={edgePath} fill="none" stroke="transparent" stroke-width="40" style="cursor:pointer" />
    <BaseEdge path={edgePath} {markerEnd} style={showActions ? 'stroke:#818cf8;stroke-width:3px' : style} />
</g>

<!-- UI Controls -->
{#if showActions && browser}
    <foreignObject x={cx - 120} y={cy - 30} width="240" height="500" style="overflow:visible">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="edge-ui" onmouseenter={keepOpen} onmouseleave={tryClose}>
            
            <!-- Main buttons -->
            {#if !showConfirm}
                <div class="btn-row">
                    <button class="btn btn-del" onclick={() => { showConfirm = true; showDropdown = false; }}>
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    <button class="btn btn-add" onclick={() => { showDropdown = !showDropdown; showConfirm = false; }}>
                        <span class="material-symbols-outlined">{showDropdown ? 'close' : 'add'}</span>
                    </button>
                </div>
            {/if}

            <!-- Delete Confirmation -->
            {#if showConfirm}
                <div class="confirm-box">
                    <p>Delete this connection?</p>
                    <div class="confirm-btns">
                        <button class="confirm-yes" onclick={confirmDelete}>Yes, Delete</button>
                        <button class="confirm-no" onclick={() => showConfirm = false}>Cancel</button>
                    </div>
                </div>
            {/if}

            <!-- Node Dropdown -->
            {#if showDropdown}
                <div class="dropdown">
                    <div class="dropdown-title">Insert Node</div>
                    {#each nodes as n}
                        <button class="dropdown-item" onclick={() => addNode(n)}>
                            <span class="item-icon" style="background:{n.color}30">
                                <span class="material-symbols-outlined" style="color:{n.color}">{n.icon}</span>
                            </span>
                            <span>{n.label}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </foreignObject>
{/if}

<style>
    .edge-ui {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .btn-row {
        display: flex;
        gap: 10px;
        background: #18181b;
        padding: 10px 14px;
        border-radius: 14px;
        border: 1px solid #3f3f46;
        box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    }
    
    .btn {
        width: 46px;
        height: 46px;
        border: none;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        font-size: 22px;
        transition: all 0.15s;
    }
    
    .btn:hover { transform: scale(1.08); }
    .btn:active { transform: scale(0.95); }
    
    .btn-del { background: #ef4444; }
    .btn-del:hover { background: #f87171; }
    
    .btn-add { background: #6366f1; }
    .btn-add:hover { background: #818cf8; }
    
    .confirm-box {
        background: #18181b;
        padding: 16px 20px;
        border-radius: 14px;
        border: 1px solid #3f3f46;
        box-shadow: 0 8px 30px rgba(0,0,0,0.6);
        text-align: center;
    }
    
    .confirm-box p {
        margin: 0 0 12px 0;
        color: #e4e4e7;
        font-size: 14px;
        font-weight: 500;
    }
    
    .confirm-btns {
        display: flex;
        gap: 8px;
    }
    
    .confirm-yes, .confirm-no {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
    }
    
    .confirm-yes {
        background: #ef4444;
        color: white;
    }
    
    .confirm-yes:hover { background: #dc2626; }
    
    .confirm-no {
        background: #3f3f46;
        color: #e4e4e7;
    }
    
    .confirm-no:hover { background: #52525b; }
    
    .dropdown {
        margin-top: 10px;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.6);
        width: 200px;
    }
    
    .dropdown-title {
        padding: 10px 14px;
        background: #27272a;
        font-size: 11px;
        font-weight: 700;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #3f3f46;
    }
    
    .dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 14px;
        background: transparent;
        border: none;
        color: #e4e4e7;
        font-size: 13px;
        cursor: pointer;
        text-align: left;
        transition: background 0.1s;
    }
    
    .dropdown-item:hover {
        background: rgba(255,255,255,0.08);
    }
    
    .item-icon {
        width: 30px;
        height: 30px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    
    .item-icon .material-symbols-outlined {
        font-size: 17px;
    }
</style>
