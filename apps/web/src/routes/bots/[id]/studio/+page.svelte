<script lang="ts">
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { onMount, onDestroy } from 'svelte';
    import { api } from '$lib/api';
    import { goto } from '$app/navigation';
    import { useSession } from '$lib/auth';
    import {
        SvelteFlow,
        Controls,
        Background,
        MiniMap,
        type Node,
        type Edge,
        type NodeTypes,
        type EdgeTypes
    } from '@xyflow/svelte';
    import '@xyflow/svelte/dist/style.css';
    
    import TriggerNode from '$lib/components/flow/TriggerNode.svelte';
    import ActionNode from '$lib/components/flow/ActionNode.svelte';
    import CustomCodeNode from '$lib/components/flow/CustomCodeNode.svelte';
    import CustomEdge from '$lib/components/flow/CustomEdge.svelte';
    import RemoteCursors from '$lib/components/flow/RemoteCursors.svelte';
    
    // Socket.io for real-time collaboration  
    import { 
        connectToStudio, 
        disconnectFromStudio, 
        getSocket,
        emitCursorMove,
        emitNodeMove,
        emitNodeSelect,
        emitNodesChange,
        emitEdgeConnect,
        emitNodeDelete,
        emitUserActivity,
        type RemoteUser,
        type CursorPosition,
        type UserActivity
    } from '$lib/socket';

    let id = $derived($page.params.id);
    let botName = $state('Loading...');
    let saving = $state(false);
    let lastSaved = $state<Date | null>(null);
    let hasChanges = $state(false);

    // Auth session
    const session = useSession();

    // Collaboration state
    let remoteUsers = $state<RemoteUser[]>([]);
    let remoteCursors = $state<Map<string, { user: any; position: CursorPosition }>>(new Map());
    let remoteSelections = $state<Map<string, string>>(new Map()); // socketId -> nodeId
    let remoteActivities = $state<Map<string, { user: any; type: string; nodeId?: string; nodePosition?: { x: number; y: number }; sidebarItem?: string }>>(new Map());

    // Toast notification state
    let toast = $state<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

    function showToast(message: string, type: 'success' | 'error' = 'success') {
        toast = { show: true, message, type };
        setTimeout(() => {
            toast = { ...toast, show: false };
        }, 3000);
    }

    // Selected node for properties panel
    let selectedNode = $state<Node | null>(null);
    
    // Context menu state
    let showContextMenu = $state(false);
    let contextMenuPos = $state({ x: 0, y: 0 });
    let contextMenuNode = $state<Node | null>(null);

    // Save confirmation popup
    let showSaveConfirm = $state(false);

    // Drag state
    let draggedNodeDef = $state<any>(null);

    // SvelteFlow state
    let nodes = $state<Node[]>([
        {
            id: '1',
            type: 'trigger',
            position: { x: 100, y: 200 },
            data: { label: 'Message Created', icon: 'chat', color: '#22c55e' }
        }
    ]);
    let edges = $state<Edge[]>([]);

    const nodeTypes: NodeTypes = {
        trigger: TriggerNode,
        action: ActionNode,
        code: CustomCodeNode
    };

    // Edge types for custom edge rendering
    const edgeTypes: EdgeTypes = {
        default: CustomEdge
    };

    // Node definitions for sidebar
    const nodeDefinitions = {
        triggers: [
            { type: 'trigger', label: 'Message Command', icon: 'chat', color: '#22c55e', eventType: 'messageCreate' },
            { type: 'trigger', label: 'Slash Command', icon: 'terminal', color: '#8b5cf6', eventType: 'interactionCreate' },
            { type: 'trigger', label: 'Reaction', icon: 'add_reaction', color: '#f59e0b', eventType: 'messageReactionAdd' },
            { type: 'trigger', label: 'Member Join', icon: 'person_add', color: '#3b82f6', eventType: 'guildMemberAdd' }
        ],
        actions: [
            { type: 'action', label: 'Send Reply', icon: 'reply', color: '#3b82f6' },
            { type: 'action', label: 'Send DM', icon: 'mail', color: '#ec4899' },
            { type: 'action', label: 'Add Role', icon: 'admin_panel_settings', color: '#10b981' },
            { type: 'action', label: 'Remove Role', icon: 'person_remove', color: '#ef4444' },
            { type: 'action', label: 'Ban User', icon: 'block', color: '#dc2626' },
            { type: 'action', label: 'Kick User', icon: 'logout', color: '#f97316' }
        ],
        logic: [
            { type: 'action', label: 'Delay', icon: 'schedule', color: '#64748b' },
            { type: 'code', label: 'Custom Code', icon: 'code', color: '#f59e0b' }
        ]
    };

    async function loadFlow() {
        if (!id) return;
        try {
            const bot = await api.getBot(id);
            botName = bot.name;
            
            const flows = await api.getFlows(id);
            if (flows.length > 0 && flows[0]) {
                try {
                    const nodeData = flows[0] as any;
                    const savedNodes = JSON.parse(nodeData.nodes || '[]');
                    const savedEdges = JSON.parse(nodeData.edges || '[]');
                    if (savedNodes.length > 0) {
                        nodes = savedNodes;
                        edges = savedEdges;
                    }
                } catch (e) {
                    console.warn("Could not parse saved flow, using default");
                }
            }
        } catch (e) {
            console.error("Failed to load flow data", e);
        }
    }

    function promptSave() {
        showSaveConfirm = true;
    }

    async function confirmSave() {
        showSaveConfirm = false;
        if (!id) return;
        saving = true;
        try {
            await api.saveFlow({
                botId: id,
                name: `${botName} Flow`,
                triggerType: 'message_create',
                nodes: JSON.stringify(nodes),
                edges: JSON.stringify(edges),
                published: true
            });
            lastSaved = new Date();
            hasChanges = false;
            showToast('Flow saved successfully!', 'success');
        } catch (e: any) {
            console.error("Failed to save flow", e);
            showToast(e.message || 'Failed to save flow', 'error');
        } finally {
            saving = false;
        }
    }

    function cancelSave() {
        showSaveConfirm = false;
    }

    // Handle edge connection
    function handleConnect(params: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) {
        const newEdge: Edge = {
            id: `e${params.source}-${params.target}`,
            source: params.source,
            target: params.target,
            animated: true,
            style: 'stroke: #6366f1; stroke-width: 2px;'
        };
        edges = [...edges, newEdge];
        hasChanges = true;
        // Broadcast to collaborators
        emitEdgeConnect(newEdge);
    }

    // Handle node drag end to mark changes
    function handleNodeDragStop(event: any) {
        hasChanges = true;
        console.log('[Studio] Node drag stop event:', event);
        // Broadcast node position to collaborators
        if (event.nodes && event.nodes.length > 0) {
            const node = event.nodes[0];
            console.log('[Studio] Emitting node move:', node.id, node.position);
            emitNodeMove(node.id, node.position);
        } else if (event.node) {
            // Alternative event structure
            console.log('[Studio] Emitting node move (alt):', event.node.id, event.node.position);
            emitNodeMove(event.node.id, event.node.position);
        }
    }

    // Handle node click - show properties
    function handleNodeClick(params: { node: Node; event: MouseEvent | TouchEvent }) {
        const node = nodes.find(n => n.id === params.node.id);
        if (node) {
            selectedNode = node;
            // Broadcast selection to collaborators
            emitNodeSelect(node.id);
            // Emit activity - user is selecting this node
            emitUserActivity({
                type: 'selecting-node',
                nodeId: node.id,
                nodePosition: node.position
            });
        }
        showContextMenu = false;
    }

    // Handle right-click on node
    function handleNodeContextMenu(params: { node: Node; event: MouseEvent }) {
        params.event.preventDefault();
        const node = nodes.find(n => n.id === params.node.id);
        if (node) {
            contextMenuNode = node;
            contextMenuPos = { x: params.event.clientX, y: params.event.clientY };
            showContextMenu = true;
        }
    }

    // Handle pane click - deselect
    function handlePaneClick() {
        selectedNode = null;
        showContextMenu = false;
        // Emit idle activity - user deselected
        emitUserActivity({ type: 'idle' });
    }

    // Context menu actions
    function duplicateNode() {
        if (!contextMenuNode) return;
        const newNode: Node = {
            id: crypto.randomUUID(),
            type: contextMenuNode.type,
            position: { x: contextMenuNode.position.x + 50, y: contextMenuNode.position.y + 50 },
            data: { ...contextMenuNode.data }
        };
        nodes = [...nodes, newNode];
        hasChanges = true;
        showContextMenu = false;
    }

    function deleteNode() {
        if (!contextMenuNode) return;
        const nodeId = contextMenuNode.id;
        nodes = nodes.filter(n => n.id !== nodeId);
        edges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        if (selectedNode?.id === nodeId) {
            selectedNode = null;
        }
        hasChanges = true;
        showContextMenu = false;
        // Broadcast deletion to collaborators
        emitNodeDelete(nodeId);
    }

    function editNode() {
        if (!contextMenuNode) return;
        selectedNode = contextMenuNode;
        showContextMenu = false;
    }

    // Drag and drop handlers
    function handleDragStart(e: DragEvent, def: any) {
        draggedNodeDef = def;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/json', JSON.stringify(def));
        }
        // Emit activity - user is dragging from sidebar
        emitUserActivity({
            type: 'dragging-sidebar-item',
            sidebarItem: def.label
        });
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        if (!draggedNodeDef) return;
        
        const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const position = {
            x: e.clientX - canvasRect.left - 90,
            y: e.clientY - canvasRect.top - 30
        };
        
        const newNode: Node = {
            id: crypto.randomUUID(),
            type: draggedNodeDef.type,
            position,
            data: { 
                label: draggedNodeDef.label, 
                icon: draggedNodeDef.icon, 
                color: draggedNodeDef.color,
                eventType: draggedNodeDef.eventType // Auto-set event type for triggers
            }
        };
        nodes = [...nodes, newNode];
        hasChanges = true;
        draggedNodeDef = null;
        
        // Broadcast new node to collaborators
        emitNodesChange(nodes, edges);
    }

    // Throttle helper for live drag
    let lastDragEmit = 0;
    const DRAG_THROTTLE_MS = 50; // Emit every 50ms max

    // Handle node drag (live updates during drag)
    function handleNodeDrag(event: any) {
        const now = Date.now();
        if (now - lastDragEmit < DRAG_THROTTLE_MS) return;
        lastDragEmit = now;
        
        if (event.nodes && event.nodes.length > 0) {
            const node = event.nodes[0];
            emitNodeMove(node.id, node.position);
            // Emit activity - user is dragging this node
            emitUserActivity({
                type: 'dragging-node',
                nodeId: node.id,
                nodePosition: node.position
            });
        } else if (event.node) {
            emitNodeMove(event.node.id, event.node.position);
            emitUserActivity({
                type: 'dragging-node',
                nodeId: event.node.id,
                nodePosition: event.node.position
            });
        }
    }

    // Update node data from properties panel
    function updateNodeData(key: string, value: string) {
        if (!selectedNode) return;
        nodes = nodes.map(n => {
            if (n.id === selectedNode!.id) {
                return { ...n, data: { ...n.data, [key]: value } };
            }
            return n;
        });
        selectedNode = { ...selectedNode, data: { ...selectedNode.data, [key]: value } };
        hasChanges = true;
    }

    function goBack() {
        goto('/bots');
    }

    // Close context menu on click outside
    function handleWindowClick() {
        showContextMenu = false;
    }

    // Setup socket connection for real-time collaboration
    async function setupCollaboration() {
        console.log('[Collab] Setting up collaboration...');
        
        // Wait for session to be ready (max 3 seconds)
        let attempts = 0;
        while ((!$session.data?.user) && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        const user = $session.data?.user;
        if (!user) {
            console.warn('[Collab] No user session after waiting');
            return;
        }
        if (!id) {
            console.warn('[Collab] No bot ID');
            return;
        }

        console.log('[Collab] Connecting as:', user.name);

        const socket = connectToStudio(id, {
            id: user.id,
            name: user.name,
            image: user.image || undefined
        });

        if (!socket) return;

        // Listen for room users
        socket.on('room-users', (users: any[]) => {
            remoteUsers = users.filter(u => u.socketId !== socket.id);
            showToast(`${remoteUsers.length + 1} users in studio`, 'success');
        });

        // User joined
        socket.on('user-joined', (data: { socketId: string; user: any }) => {
            remoteUsers = [...remoteUsers, data];
            showToast(`${data.user.name} joined`, 'success');
        });

        // User left
        socket.on('user-left', (data: { socketId: string }) => {
            remoteUsers = remoteUsers.filter(u => u.socketId !== data.socketId);
            remoteCursors.delete(data.socketId);
            remoteSelections.delete(data.socketId);
            remoteCursors = new Map(remoteCursors);
            remoteSelections = new Map(remoteSelections);
        });

        // Cursor updates
        socket.on('cursor-update', (data: { socketId: string; user: any; position: CursorPosition }) => {
            remoteCursors.set(data.socketId, { user: data.user, position: data.position });
            remoteCursors = new Map(remoteCursors);
        });

        // Node moved by remote user
        socket.on('node-moved', (data: { socketId: string; user: any; nodeId: string; position: { x: number; y: number } }) => {
            nodes = nodes.map(n => {
                if (n.id === data.nodeId) {
                    return { ...n, position: data.position };
                }
                return n;
            });
            // Force edges to re-render by creating new array reference
            edges = [...edges];
        });

        // Node selected by remote user
        socket.on('node-selected', (data: { socketId: string; user: any; nodeId: string | null }) => {
            if (data.nodeId) {
                remoteSelections.set(data.socketId, data.nodeId);
            } else {
                remoteSelections.delete(data.socketId);
            }
            remoteSelections = new Map(remoteSelections);
        });

        // NOTE: nodes-changed listener disabled to prevent overwriting local state
        // This was causing nodes to revert when dragged
        // socket.on('nodes-changed', (data: { socketId: string; nodes: any[]; edges: any[] }) => {
        //     nodes = data.nodes;
        //     edges = data.edges;
        // });

        // Edge connected by remote user
        socket.on('edge-connected', (data: { socketId: string; edge: any }) => {
            edges = [...edges, data.edge];
        });

        // Node deleted by remote user
        socket.on('node-deleted', (data: { socketId: string; nodeId: string }) => {
            nodes = nodes.filter(n => n.id !== data.nodeId);
            edges = edges.filter(e => e.source !== data.nodeId && e.target !== data.nodeId);
        });

        // User activity update - track what other users are doing
        socket.on('user-activity-update', (data: { 
            socketId: string; 
            user: any; 
            type: string; 
            nodeId?: string; 
            nodePosition?: { x: number; y: number };
            sidebarItem?: string;
        }) => {
            remoteActivities.set(data.socketId, {
                user: data.user,
                type: data.type,
                nodeId: data.nodeId,
                nodePosition: data.nodePosition,
                sidebarItem: data.sidebarItem
            });
            remoteActivities = new Map(remoteActivities);
        });
    }

    // Track mouse movement for cursor sharing - using percentage coordinates
    let lastCursorTime = 0;
    let canvasRef: HTMLElement | null = null;
    
    function handleMouseMove(e: MouseEvent) {
        const now = Date.now();
        if (now - lastCursorTime < 30) return; // Throttle 30ms
        lastCursorTime = now;

        if (!canvasRef) {
            canvasRef = document.querySelector('.svelte-flow');
        }
        if (!canvasRef) return;
        
        const rect = canvasRef.getBoundingClientRect();
        // Send position as percentage of canvas size for cross-screen compatibility
        emitCursorMove({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        });
    }

    // Edge action handlers
    function handleEdgeDelete(e: CustomEvent<{ edgeId: string }>) {
        edges = edges.filter(edge => edge.id !== e.detail.edgeId);
        hasChanges = true;
    }

    function handleEdgeInsertNode(e: CustomEvent<{ 
        edgeId: string; 
        nodeType: string;
        nodeLabel: string;
        nodeIcon: string;
        nodeColor: string;
        position: { x: number; y: number };
    }>) {
        const { edgeId, nodeType, nodeLabel, nodeIcon, nodeColor, position } = e.detail;
        
        // Find the edge to replace
        const edge = edges.find(e => e.id === edgeId);
        if (!edge) return;

        // Create new node
        const newNodeId = crypto.randomUUID();
        const newNode: Node = {
            id: newNodeId,
            type: nodeType,
            position: { x: position.x - 60, y: position.y - 32 }, // Center the node
            data: { label: nodeLabel, icon: nodeIcon, color: nodeColor }
        };

        // Add new node
        nodes = [...nodes, newNode];

        // Replace edge with two new edges
        edges = edges.filter(e => e.id !== edgeId);
        const edge1: Edge = {
            id: crypto.randomUUID(),
            source: edge.source,
            sourceHandle: edge.sourceHandle,
            target: newNodeId
        };
        const edge2: Edge = {
            id: crypto.randomUUID(),
            source: newNodeId,
            target: edge.target,
            targetHandle: edge.targetHandle
        };
        edges = [...edges, edge1, edge2];
        
        hasChanges = true;
    }

    onMount(() => {
        loadFlow();
        setupCollaboration();
        
        // Enable cursor tracking after a short delay
        setTimeout(() => {
            canvasRef = document.querySelector('.svelte-flow');
            if (canvasRef) {
                canvasRef.addEventListener('mousemove', handleMouseMove as EventListener);
            }
        }, 500);

        // Edge action event listeners (using window to match CustomEdge)
        window.addEventListener('edge-delete', handleEdgeDelete as EventListener);
        window.addEventListener('edge-insert-node', handleEdgeInsertNode as EventListener);
    });

    onDestroy(() => {
        if (!browser) return;
        if (canvasRef) {
            canvasRef.removeEventListener('mousemove', handleMouseMove as EventListener);
        }
        window.removeEventListener('edge-delete', handleEdgeDelete as EventListener);
        window.removeEventListener('edge-insert-node', handleEdgeInsertNode as EventListener);
    });
</script>

<svelte:window onclick={handleWindowClick} />

<div class="h-screen flex flex-col bg-dark-base">
    <!-- Header -->
    <header class="h-14 bg-dark-surface border-b border-dark-border flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center gap-3">
            <button onclick={goBack} class="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="h-6 w-px bg-dark-border"></div>
            <h1 class="text-white font-bold text-lg">{botName} Flow</h1>
            {#if hasChanges}
                <span class="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Unsaved changes</span>
            {/if}
        </div>
        <div class="flex items-center gap-3">
            <!-- Remote Users Avatars -->
            {#if remoteUsers.length > 0}
                <div class="flex items-center gap-1 mr-2">
                    {#each remoteUsers as remote}
                        <div 
                            class="size-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                            style="border-color: {remote.user.color}; background: {remote.user.color}20;"
                            title="{remote.user.name}"
                        >
                            {#if remote.user.image}
                                <img src={remote.user.image} alt={remote.user.name} class="size-full rounded-full object-cover" />
                            {:else}
                                {remote.user.name.charAt(0).toUpperCase()}
                            {/if}
                        </div>
                    {/each}
                    <span class="text-xs text-gray-500 ml-1">{remoteUsers.length + 1} online</span>
                </div>
                <div class="h-6 w-px bg-dark-border"></div>
            {/if}
            
            {#if lastSaved}
                <span class="text-xs text-gray-500">Saved {lastSaved.toLocaleTimeString()}</span>
            {/if}
            <button onclick={promptSave} disabled={saving} class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors">
                {#if saving}
                    <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {:else}
                    <span class="material-symbols-outlined text-[18px]">save</span>
                {/if}
                Save Flow
            </button>
            <a href="/bots/{id}/panel" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors">
                <span class="material-symbols-outlined text-[18px]">terminal</span>
                Panel
            </a>
        </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar - Node Palette -->
        <aside class="w-56 bg-dark-surface border-r border-dark-border overflow-y-auto shrink-0">
            <div class="p-4 space-y-6">
                <p class="text-xs text-gray-500 italic">Drag nodes to canvas</p>
                
                <!-- Triggers -->
                <div>
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Triggers</h3>
                    <div class="space-y-1">
                        {#each nodeDefinitions.triggers as def}
                            <button 
                                type="button"
                                draggable="true"
                                ondragstart={(e) => handleDragStart(e, def)}
                                class="w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
                            >
                                <div class="size-8 rounded-lg flex items-center justify-center" style="background: {def.color}20;">
                                    <span class="material-symbols-outlined text-[18px]" style="color: {def.color};">{def.icon}</span>
                                </div>
                                <span class="font-medium">{def.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Actions -->
                <div>
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Actions</h3>
                    <div class="space-y-1">
                        {#each nodeDefinitions.actions as def}
                            <button 
                                type="button"
                                draggable="true"
                                ondragstart={(e) => handleDragStart(e, def)}
                                class="w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
                            >
                                <div class="size-8 rounded-lg flex items-center justify-center" style="background: {def.color}20;">
                                    <span class="material-symbols-outlined text-[18px]" style="color: {def.color};">{def.icon}</span>
                                </div>
                                <span class="font-medium">{def.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Logic -->
                <div>
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Logic</h3>
                    <div class="space-y-1">
                        {#each nodeDefinitions.logic as def}
                            <button 
                                type="button"
                                draggable="true"
                                ondragstart={(e) => handleDragStart(e, def)}
                                class="w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
                            >
                                <div class="size-8 rounded-lg flex items-center justify-center" style="background: {def.color}20;">
                                    <span class="material-symbols-outlined text-[18px]" style="color: {def.color};">{def.icon}</span>
                                </div>
                                <span class="font-medium">{def.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            </div>
        </aside>

        <!-- Flow Canvas -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            class="flex-1 relative" 
            ondragover={handleDragOver}
            ondrop={handleDrop}
            role="application"
            aria-label="Flow canvas"
        >
            <SvelteFlow
                bind:nodes
                bind:edges
                {nodeTypes}
                {edgeTypes}
                fitView
                defaultEdgeOptions={{
                    animated: true,
                    style: 'stroke: #6366f1; stroke-width: 2px;'
                }}
                class="bg-dark-base"
                onnodeclick={handleNodeClick}
                onnodecontextmenu={handleNodeContextMenu}
                onpaneclick={handlePaneClick}
                onconnect={handleConnect}
                onnodedrag={handleNodeDrag}
                onnodedragstop={handleNodeDragStop}
            >
                <Background bgColor="#0a0a0a" gap={20} />
                <Controls class="!bg-dark-surface !border-dark-border !rounded-lg overflow-hidden" />
                <MiniMap 
                    class="!bg-dark-surface !border !border-dark-border !rounded-lg"
                    nodeColor="#6366f1"
                    maskColor="rgba(0,0,0,0.8)"
                />
                
                <!-- Remote Cursors - uses position from activity -->
                <RemoteCursors activities={remoteActivities} />
            </SvelteFlow>
        </div>

        <!-- Properties Panel -->
        <aside class="w-72 bg-dark-surface border-l border-dark-border p-4 shrink-0 overflow-y-auto">
            <h3 class="text-white font-bold mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">tune</span>
                Properties
            </h3>
            
            {#if selectedNode}
                <div class="space-y-4">
                    <!-- Node Info -->
                    <div class="bg-dark-base rounded-lg p-3 border border-dark-border">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="size-10 rounded-lg flex items-center justify-center" style="background: {selectedNode.data.color}20;">
                                <span class="material-symbols-outlined text-[20px]" style="color: {selectedNode.data.color};">{selectedNode.data.icon}</span>
                            </div>
                            <div>
                                <p class="text-white font-medium">{selectedNode.data.label}</p>
                                <p class="text-xs text-gray-500 capitalize">{selectedNode.type} Node</p>
                            </div>
                        </div>
                    </div>

                    <!-- Label -->
                    <div>
                        <label for="node-label" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Label</label>
                        <input 
                            id="node-label"
                            type="text"
                            value={selectedNode.data.label}
                            oninput={(e) => updateNodeData('label', e.currentTarget.value)}
                            class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>

                    <!-- Custom Code Node Options -->
                    {#if selectedNode.type === 'code'}
                        <div>
                            <label for="code-editor" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Code (Node.js / discord.js)</label>
                            <textarea 
                                id="code-editor"
                                value={String(selectedNode.data.code || '')}
                                oninput={(e) => updateNodeData('code', e.currentTarget.value)}
                                class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-amber-400 text-sm font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none h-32 resize-none"
                                placeholder="// Your Node.js / discord.js code here"
                            ></textarea>
                        </div>
                    {/if}

                    <!-- Trigger specific options - no dropdown since trigger type is determined by node -->
                    {#if selectedNode.type === 'trigger'}

                        <!-- Slash Command Options -->
                        {#if selectedNode.data.eventType === 'interactionCreate'}
                            <div>
                                <label for="command-name" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Command Name</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-500 text-lg">/</span>
                                    <input 
                                        id="command-name"
                                        type="text"
                                        value={selectedNode.data.commandName || ''}
                                        oninput={(e) => updateNodeData('commandName', e.currentTarget.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                        placeholder="test"
                                        class="flex-1 bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Only lowercase letters and numbers allowed</p>
                            </div>
                            <div>
                                <label for="command-desc" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Command Description</label>
                                <input 
                                    id="command-desc"
                                    type="text"
                                    value={selectedNode.data.commandDescription || ''}
                                    oninput={(e) => updateNodeData('commandDescription', e.currentTarget.value)}
                                    placeholder="Describes what this command does"
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                />
                            </div>
                        {:else if selectedNode.data.eventType === 'messageReactionAdd'}
                            <!-- Reaction Trigger Options -->
                            <div>
                                <label for="reaction-message-id" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message ID</label>
                                <input 
                                    id="reaction-message-id"
                                    type="text"
                                    value={selectedNode.data.messageId || ''}
                                    oninput={(e) => updateNodeData('messageId', e.currentTarget.value.replace(/\D/g, ''))}
                                    placeholder="123456789012345678"
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                                />
                                <p class="text-xs text-gray-500 mt-1">Right-click message → Copy Message ID</p>
                            </div>
                            
                            <!-- Reactions List -->
                            <div>
                                <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reactions (Outputs)</span>
                                <div class="space-y-2">
                                    {#each (selectedNode.data.reactions || []) as reaction, i}
                                        <div class="flex items-center gap-2 bg-dark-base border border-dark-border rounded-lg px-3 py-2">
                                            <span class="text-lg">{reaction.emoji}</span>
                                            <input 
                                                type="text"
                                                value={reaction.code}
                                                readonly
                                                class="flex-1 bg-transparent text-gray-400 text-sm font-mono outline-none"
                                            />
                                            <span class="text-[10px] text-primary font-bold px-1.5 py-0.5 bg-primary/20 rounded">OUT {i + 1}</span>
                                            <button 
                                                type="button"
                                                onclick={() => {
                                                    const reactions = [...(selectedNode.data.reactions || [])];
                                                    reactions.splice(i, 1);
                                                    updateNodeData('reactions', reactions);
                                                }}
                                                class="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <span class="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    {/each}
                                </div>
                                
                                <!-- Add Reaction Input -->
                                <div class="mt-3 flex items-center gap-2">
                                    <input 
                                        type="text"
                                        placeholder=":fire: or emoji"
                                        id="new-reaction-input"
                                        class="flex-1 bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                        onkeydown={(e) => {
                                            if (e.key === 'Enter') {
                                                const input = e.currentTarget;
                                                const value = input.value.trim();
                                                if (value) {
                                                    const reactions = [...(selectedNode.data.reactions || [])];
                                                    // Parse emoji code or use as-is
                                                    const emoji = value.match(/^:(\w+):$/) ? value : value;
                                                    reactions.push({ 
                                                        id: crypto.randomUUID(),
                                                        code: value,
                                                        emoji: emoji.replace(/:/g, '')
                                                    });
                                                    updateNodeData('reactions', reactions);
                                                    input.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        type="button"
                                        onclick={() => {
                                            const input = document.getElementById('new-reaction-input') as HTMLInputElement;
                                            const value = input?.value.trim();
                                            if (value) {
                                                const reactions = [...(selectedNode.data.reactions || [])];
                                                const emoji = value.match(/^:(\w+):$/) ? value : value;
                                                reactions.push({ 
                                                    id: crypto.randomUUID(),
                                                    code: value,
                                                    emoji: emoji.replace(/:/g, '')
                                                });
                                                updateNodeData('reactions', reactions);
                                                input.value = '';
                                            }
                                        }}
                                        class="px-3 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium"
                                    >
                                        + Add
                                    </button>
                                </div>
                                <p class="text-xs text-gray-500 mt-2">Each reaction creates an output. Connect to different actions.</p>
                            </div>
                        {:else if selectedNode.data.eventType === 'guildMemberAdd'}
                            <!-- Member Join Trigger - No extra options needed -->
                            <div class="text-center py-4 text-gray-500">
                                <span class="material-symbols-outlined text-[32px] mb-2">waving_hand</span>
                                <p class="text-sm">Triggers when a new member joins the server.</p>
                                <p class="text-xs mt-1">No configuration needed.</p>
                            </div>
                        {:else}
                            <!-- Message/Prefix Command Options -->
                            <div>
                                <label for="trigger-filter" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter / Trigger Text</label>
                                <input 
                                    id="trigger-filter"
                                    type="text"
                                    value={selectedNode.data.filter || ''}
                                    oninput={(e) => updateNodeData('filter', e.currentTarget.value)}
                                    placeholder="e.g. !help or starts with !"
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                />
                                <p class="text-xs text-gray-500 mt-1">Use "starts with !" for prefix commands</p>
                            </div>
                        {/if}
                    {/if}

                    <!-- Action specific options -->
                    {#if selectedNode.type === 'action'}
                        {#if selectedNode.data.actionType === 'sendReply' || selectedNode.data.label === 'Send Reply'}
                            <!-- Send Reply Options -->
                            <div>
                                <label for="message-content" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message Content</label>
                                <textarea 
                                    id="message-content"
                                    value={String(selectedNode.data.messageContent || '')}
                                    oninput={(e) => updateNodeData('messageContent', e.currentTarget.value)}
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-20 resize-none"
                                    placeholder="Hello! Welcome to the server."
                                ></textarea>
                                <p class="text-xs text-gray-500 mt-1">Use &#123;user&#125;, &#123;channel&#125;, &#123;server&#125; for variables</p>
                            </div>
                            
                            <!-- Channel-specific reply toggle -->
                            <div class="mt-3">
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={selectedNode.data.useSpecificChannel || false}
                                        onchange={(e) => updateNodeData('useSpecificChannel', e.currentTarget.checked)}
                                        class="w-4 h-4 rounded border-dark-border bg-dark-base text-primary focus:ring-primary"
                                    />
                                    <span class="text-sm text-gray-300">Reply to specific channel</span>
                                </label>
                            </div>
                            
                            {#if selectedNode.data.useSpecificChannel}
                                <div class="mt-2">
                                    <label for="channel-id" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Channel ID</label>
                                    <input 
                                        id="channel-id"
                                        type="text"
                                        value={selectedNode.data.channelId || ''}
                                        oninput={(e) => updateNodeData('channelId', e.currentTarget.value.replace(/\D/g, ''))}
                                        placeholder="123456789012345678"
                                        class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                                    />
                                    <p class="text-xs text-gray-500 mt-1">Right-click channel → Copy Channel ID</p>
                                </div>
                            {:else}
                                <p class="text-xs text-gray-500 mt-2">Bot will reply in the same channel as the trigger.</p>
                            {/if}
                            
                        {:else if selectedNode.data.actionType === 'addRole' || selectedNode.data.label === 'Add Role'}
                            <!-- Add Role Options -->
                            <div>
                                <label for="role-id" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role ID</label>
                                <input 
                                    id="role-id"
                                    type="text"
                                    value={selectedNode.data.roleId || ''}
                                    oninput={(e) => updateNodeData('roleId', e.currentTarget.value.replace(/\D/g, ''))}
                                    placeholder="123456789012345678"
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                                />
                                <p class="text-xs text-gray-500 mt-1">Server Settings → Roles → Right-click → Copy Role ID</p>
                            </div>
                            
                        {:else if selectedNode.data.actionType === 'removeRole' || selectedNode.data.label === 'Remove Role'}
                            <!-- Remove Role Options -->
                            <div>
                                <label for="role-id" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role ID</label>
                                <input 
                                    id="role-id"
                                    type="text"
                                    value={selectedNode.data.roleId || ''}
                                    oninput={(e) => updateNodeData('roleId', e.currentTarget.value.replace(/\D/g, ''))}
                                    placeholder="123456789012345678"
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                                />
                                <p class="text-xs text-gray-500 mt-1">Server Settings → Roles → Right-click → Copy Role ID</p>
                            </div>
                            
                        {:else if selectedNode.data.actionType === 'sendDM' || selectedNode.data.label === 'Send DM'}
                            <!-- Send DM Options -->
                            <div>
                                <label for="dm-content" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">DM Message</label>
                                <textarea 
                                    id="dm-content"
                                    value={String(selectedNode.data.messageContent || '')}
                                    oninput={(e) => updateNodeData('messageContent', e.currentTarget.value)}
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-20 resize-none"
                                    placeholder="Hello! This is a direct message."
                                ></textarea>
                                <p class="text-xs text-gray-500 mt-1">Use &#123;user&#125;, &#123;server&#125; for variables</p>
                            </div>
                            
                        {:else if selectedNode.data.actionType === 'banUser' || selectedNode.data.label === 'Ban User'}
                            <!-- Ban User Options -->
                            <div>
                                <label for="ban-reason" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ban Reason (Optional)</label>
                                <input 
                                    id="ban-reason"
                                    type="text"
                                    value={selectedNode.data.reason || ''}
                                    oninput={(e) => updateNodeData('reason', e.currentTarget.value)}
                                    placeholder="Violation of rules"
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                />
                            </div>
                            <div class="mt-3">
                                <label for="delete-days" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delete Message Days</label>
                                <select 
                                    id="delete-days"
                                    value={selectedNode.data.deleteMessageDays || '0'}
                                    onchange={(e) => updateNodeData('deleteMessageDays', e.currentTarget.value)}
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                >
                                    <option value="0">Don't delete messages</option>
                                    <option value="1">Last 24 hours</option>
                                    <option value="7">Last 7 days</option>
                                </select>
                            </div>
                            
                        {:else if selectedNode.data.actionType === 'kickUser' || selectedNode.data.label === 'Kick User'}
                            <!-- Kick User Options -->
                            <div>
                                <label for="kick-reason" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kick Reason (Optional)</label>
                                <input 
                                    id="kick-reason"
                                    type="text"
                                    value={selectedNode.data.reason || ''}
                                    oninput={(e) => updateNodeData('reason', e.currentTarget.value)}
                                    placeholder="Violation of rules"
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                />
                            </div>
                            
                        {:else}
                            <!-- Default/Generic action options -->
                            <div>
                                <label for="message-content" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message Content</label>
                                <textarea 
                                    id="message-content"
                                    value={String(selectedNode.data.messageContent || '')}
                                    oninput={(e) => updateNodeData('messageContent', e.currentTarget.value)}
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-20 resize-none"
                                    placeholder="Configure action..."
                                ></textarea>
                            </div>
                        {/if}
                    {/if}

                    <!-- Delete button -->
                    <button 
                        onclick={() => { contextMenuNode = selectedNode; deleteNode(); }}
                        class="w-full mt-4 py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                        Delete Node
                    </button>
                </div>
            {:else}
                <div class="flex flex-col items-center justify-center py-12 text-center">
                    <div class="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <span class="material-symbols-outlined text-[32px] text-gray-600">touch_app</span>
                    </div>
                    <p class="text-gray-500 text-sm">Click a node to edit its properties</p>
                    <p class="text-gray-600 text-xs mt-2">Right-click for more options</p>
                </div>
            {/if}
        </aside>
    </div>
</div>

<!-- Context Menu -->
{#if showContextMenu}
    <div 
        class="fixed z-50 bg-dark-surface border border-dark-border rounded-lg shadow-xl py-1 min-w-[160px]"
        style="left: {contextMenuPos.x}px; top: {contextMenuPos.y}px;"
    >
        <button onclick={editNode} class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white text-left">
            <span class="material-symbols-outlined text-[18px]">edit</span>
            Edit
        </button>
        <button onclick={duplicateNode} class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white text-left">
            <span class="material-symbols-outlined text-[18px]">content_copy</span>
            Duplicate
        </button>
        <div class="h-px bg-dark-border my-1"></div>
        <button onclick={deleteNode} class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left">
            <span class="material-symbols-outlined text-[18px]">delete</span>
            Delete
        </button>
    </div>
{/if}

<!-- Save Confirmation Modal -->
{#if showSaveConfirm}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={cancelSave} aria-label="Cancel"></button>
        <div class="relative w-full max-w-md bg-dark-surface rounded-xl border border-dark-border shadow-2xl flex flex-col overflow-hidden">
            <div class="p-6 text-center">
                <div class="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <span class="material-symbols-outlined text-[32px]">save</span>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Save Flow?</h3>
                <p class="text-gray-400 text-sm mb-6">This will save all nodes, connections, and configurations to the database.</p>
                
                <div class="flex gap-3 justify-center">
                    <button onclick={cancelSave} class="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-medium transition-colors">
                        Cancel
                    </button>
                    <button onclick={confirmSave} class="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">check</span>
                        Confirm Save
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Toast Notification -->
{#if toast.show}
    <div 
        class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border animate-slideUp {toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}"
    >
        <span class="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
        </span>
        <span class="font-medium text-sm">{toast.message}</span>
        <button onclick={() => toast.show = false} class="ml-2 hover:opacity-70">
            <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
    </div>
{/if}

<style>
    :global(.svelte-flow) {
        --xy-node-border-radius: 12px;
        --xy-background-color: #0a0a0a;
    }
    :global(.svelte-flow__node) {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
    }
    :global(.svelte-flow__node.selected) {
        box-shadow: 0 0 0 2px #6366f1 !important;
        border-radius: 12px;
    }
    :global(.svelte-flow__edge-path) {
        stroke: #6366f1;
        stroke-width: 2px;
    }
    :global(.svelte-flow__controls) {
        background: #1a1a1a !important;
        border-color: #2a2a2a !important;
    }
    :global(.svelte-flow__controls-button) {
        background: #1a1a1a !important;
        border-color: #2a2a2a !important;
        color: #888 !important;
    }
    :global(.svelte-flow__controls-button:hover) {
        background: #2a2a2a !important;
        color: #fff !important;
    }
</style>
