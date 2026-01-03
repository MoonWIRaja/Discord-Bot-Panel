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
    import AIProviderNode from '$lib/components/flow/AIProviderNode.svelte';
    import CustomEdge from '$lib/components/flow/CustomEdge.svelte';
    import RemoteCursors from '$lib/components/flow/RemoteCursors.svelte';
    import EdgeActionsOverlay from '$lib/components/flow/EdgeActionsOverlay.svelte';
    
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
    let flowName = $state('');
    let allFlows = $state<any[]>([]);
    let currentFlowIndex = $state(0);
    let saving = $state(false);
    let lastSaved = $state<Date | null>(null);
    let hasChanges = $state(false);
    let isLoaded = $state(false);
    let showNodePalette = $state(false); // Mobile toggle for node palette
    let showProperties = $state(false); // Mobile toggle for properties panel

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

    // Edge action overlay state
    let hoveredEdge = $state<{ edgeId: string; centerX: number; centerY: number } | null>(null);
    let showEdgeDropdown = $state(false);
    let showEdgeConfirm = $state(false);
    let keepOverlayOpen = $state(false);

    // Templates state
    let availableTemplates = $state<any[]>([]);
    let importingTemplate = $state<string | null>(null);

    // Drag state
    let draggedNodeDef = $state<any>(null);

    // Flow management modals
    let showAddFlowModal = $state(false);
    let showRenameFlowModal = $state(false);
    let showDeleteFlowConfirm = $state(false);
    let showFlowDropdown = $state(false);
    let newFlowName = $state('');

    // SvelteFlow state - start with empty canvas
    let nodes = $state<Node[]>([]);
    let edges = $state<Edge[]>([]);

    // AI Fetch Models state (per-node: stored in node.data.fetchedModels)
    let loadingFetchModels = $state(false);

    // Fetch models from provider API and store in node data
    async function fetchProviderModels(nodeId: string, provider: string, apiKey: string, endpoint?: string) {
        if (!apiKey) {
            showToast('Please enter API key first', 'error');
            return;
        }
        if (provider === 'azure' && !endpoint) {
            showToast('Please enter Azure endpoint first', 'error');
            return;
        }
        
        loadingFetchModels = true;
        
        try {
            const data = await api.post('/bots/ai/fetch-models', { provider, apiKey, endpoint, validate: true });
            if (data.models && data.models.length > 0) {
                // Store in node data for persistence
                updateNodeDataById(nodeId, 'fetchedModels', data.models);
                const validatedMsg = data.validated ? ` (${data.count}/${data.total} validated)` : '';
                showToast(`✅ Found ${data.models.length} working model(s)${validatedMsg}`, 'success');
                hasChanges = true;
            } else if (data.manualEntry) {
                // Provider doesn't support model listing - show info message
                showToast(data.message || 'Enter your model name manually below', 'success');
                // Set a flag so user knows to enter manually
                updateNodeDataById(nodeId, 'manualModelEntry', true);
            } else {
                showToast(data.message || 'No models found', 'error');
            }
        } catch (e: any) {
            console.error('[FetchModels] Error:', e);
            showToast(e.message || 'Failed to fetch models', 'error');
        }
        loadingFetchModels = false;
    }

    // Deploy/validate a custom model
    let loadingDeployModel = $state(false);
    async function deployCustomModel(nodeId: string, provider: string, apiKey: string, endpoint: string | undefined, modelName: string) {
        if (!modelName) {
            showToast('Please enter a model name first', 'error');
            return;
        }
        if (!apiKey) {
            showToast('Please enter API key first', 'error');
            return;
        }
        
        loadingDeployModel = true;
        
        try {
            const data = await api.post('/bots/ai/deploy-model', { provider, apiKey, endpoint, modelName });
            
            if (data.success && data.model) {
                // Add the deployed model to fetchedModels
                const currentModels = nodes.find(n => n.id === nodeId)?.data?.fetchedModels || [];
                const newModels = [...(currentModels as any[]), data.model];
                updateNodeDataById(nodeId, 'fetchedModels', newModels);
                
                // Also set model for each detected mode
                if (data.modes?.includes('chat')) updateNodeDataById(nodeId, 'modelChat', modelName);
                if (data.modes?.includes('code')) updateNodeDataById(nodeId, 'modelCode', modelName);
                if (data.modes?.includes('vision')) updateNodeDataById(nodeId, 'modelVision', modelName);
                if (data.modes?.includes('image')) updateNodeDataById(nodeId, 'modelImage', modelName);
                
                showToast(data.message || `✅ Model deployed!`, 'success');
                hasChanges = true;
            } else {
                showToast(data.error || 'Failed to deploy model', 'error');
            }
        } catch (e: any) {
            console.error('[DeployModel] Error:', e);
            showToast(e.message || 'Failed to deploy model', 'error');
        }
        loadingDeployModel = false;
    }

    // Delete a custom model from fetchedModels
    function deleteCustomModel(nodeId: string, modelName: string) {
        if (!modelName) {
            showToast('Please enter a model name to delete', 'error');
            return;
        }
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) {
            showToast('Node not found', 'error');
            return;
        }
        
        const currentModels = (node.data?.fetchedModels || []) as any[];
        const modelExists = currentModels.some(m => m.id === modelName);
        
        if (!modelExists) {
            showToast(`Model "${modelName}" not found in list`, 'error');
            return;
        }
        
        // Remove the model from fetchedModels
        const newModels = currentModels.filter(m => m.id !== modelName);
        updateNodeDataById(nodeId, 'fetchedModels', newModels);
        
        // Clear the custom model input
        updateNodeDataById(nodeId, 'customModel', '');
        
        // Clear mode-specific models if they match
        if (node.data?.modelChat === modelName) updateNodeDataById(nodeId, 'modelChat', '');
        if (node.data?.modelCode === modelName) updateNodeDataById(nodeId, 'modelCode', '');
        if (node.data?.modelVision === modelName) updateNodeDataById(nodeId, 'modelVision', '');
        if (node.data?.modelImage === modelName) updateNodeDataById(nodeId, 'modelImage', '');
        
        showToast(`✅ Model "${modelName}" deleted!`, 'success');
        hasChanges = true;
    }

    // Update node data by node ID
    function updateNodeDataById(nodeId: string, key: string, value: any) {
        nodes = nodes.map(n => {
            if (n.id === nodeId) {
                return { ...n, data: { ...n.data, [key]: value } };
            }
            return n;
        });
    }

    const nodeTypes: NodeTypes = {
        trigger: TriggerNode,
        action: ActionNode,
        code: CustomCodeNode,
        aiProvider: AIProviderNode
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
            { type: 'action', label: 'Remove Role', icon: 'person_remove', color: '#ef4444' }
        ],
        logic: [
            { type: 'action', label: 'Delay', icon: 'schedule', color: '#64748b' },
            { type: 'code', label: 'Custom Code', icon: 'code', color: '#f59e0b' }
        ],
        ai: [
            { type: 'aiProvider', label: 'AI Provider', icon: 'smart_toy', color: '#8b5cf6' }
        ]
    };

    async function loadFlow() {
        if (!id) return;
        try {
            const bot = await api.getBot(id);
            botName = bot.name;
            
            const flowsData = await api.getFlows(id);
            
            // Handle empty flows - keep default nodes
            if (!flowsData || !Array.isArray(flowsData) || flowsData.length === 0) {
                console.log('[loadFlow] No flows found, using default');
                flowName = 'New Flow';
                isLoaded = true;
                return;
            }
            
            // Store all flows for flow selector
            allFlows = flowsData;
            
            // Load first flow by default
            loadFlowByIndex(0);
            
        } catch (e) {
            console.error("Failed to load flow data", e);
        }
        isLoaded = true;
    }

    // Load a specific flow by index
    function loadFlowByIndex(index: number) {
        if (index < 0 || index >= allFlows.length) return;
        
        currentFlowIndex = index;
        const flow = allFlows[index] as any;
        
        try {
            flowName = flow.name || `Flow ${index + 1}`;
            const flowNodes = typeof flow.nodes === 'string' ? JSON.parse(flow.nodes) : (flow.nodes || []);
            const flowEdges = typeof flow.edges === 'string' ? JSON.parse(flow.edges) : (flow.edges || []);
            
            if (Array.isArray(flowNodes)) {
                nodes = flowNodes;
            } else {
                nodes = [];
            }
            
            if (Array.isArray(flowEdges)) {
                edges = flowEdges;
            } else {
                edges = [];
            }
            
            console.log('[loadFlowByIndex] Loaded flow:', flowName, 'Nodes:', nodes.length, 'Edges:', edges.length);
        } catch (e) {
            console.warn("Could not parse flow, using empty canvas", e);
            nodes = [];
            edges = [];
        }
        
        hasChanges = false;
    }

    // Add new flow
    async function addNewFlow() {
        if (!newFlowName.trim()) {
            showToast('Please enter a flow name', 'error');
            return;
        }
        
        try {
            const newFlow = await api.saveFlow({
                botId: id,
                name: newFlowName.trim(),
                triggerType: 'message_create',
                nodes: JSON.stringify([]),
                edges: JSON.stringify([]),
                published: true
            });
            
            // Reload flows
            const flowsData = await api.getFlows(id!);
            allFlows = flowsData;
            
            // Switch to new flow
            loadFlowByIndex(allFlows.length - 1);
            
            showToast(`Flow "${newFlowName}" created!`, 'success');
            showAddFlowModal = false;
            newFlowName = '';
        } catch (e: any) {
            showToast(e.message || 'Failed to create flow', 'error');
        }
    }

    // Rename current flow
    async function renameCurrentFlow() {
        if (!newFlowName.trim()) {
            showToast('Please enter a flow name', 'error');
            return;
        }
        
        const currentFlow = allFlows[currentFlowIndex];
        if (!currentFlow) return;
        
        try {
            await api.saveFlow({
                botId: id,
                id: currentFlow.id,
                name: newFlowName.trim(),
                triggerType: currentFlow.triggerType || 'message_create',
                nodes: currentFlow.nodes,
                edges: currentFlow.edges,
                published: currentFlow.published ?? true
            });
            
            // Update local state
            allFlows[currentFlowIndex].name = newFlowName.trim();
            flowName = newFlowName.trim();
            
            showToast(`Flow renamed to "${newFlowName}"`, 'success');
            showRenameFlowModal = false;
            newFlowName = '';
        } catch (e: any) {
            showToast(e.message || 'Failed to rename flow', 'error');
        }
    }

    // Delete current flow
    async function deleteCurrentFlow() {
        const currentFlow = allFlows[currentFlowIndex];
        if (!currentFlow) return;
        
        // Check if flow has an ID (saved to database)
        if (!currentFlow.id) {
            showToast('This flow has not been saved yet', 'error');
            showDeleteFlowConfirm = false;
            return;
        }
        
        try {
            await api.deleteFlow(id!, currentFlow.id);
            
            // Reload flows
            const flowsData = await api.getFlows(id!);
            allFlows = flowsData;
            
            // Switch to first flow or empty
            if (allFlows.length > 0) {
                loadFlowByIndex(0);
            } else {
                flowName = 'New Flow';
                nodes = [];
                edges = [];
            }
            
            showToast('Flow deleted', 'success');
            showDeleteFlowConfirm = false;
        } catch (e: any) {
            showToast(e.message || 'Failed to delete flow', 'error');
        }
    }

    // Load available templates
    async function loadTemplates() {
        try {
            availableTemplates = await api.getTemplates();
        } catch (e) {
            console.error("Failed to load templates", e);
        }
    }

    // Import template directly into current bot as new flow
    async function importTemplateToBot(templateId: string) {
        if (!id || importingTemplate) return;
        importingTemplate = templateId;
        try {
            await api.importTemplate(templateId, id);
            // Reload flows to show the imported template
            const flowsData = await api.getFlows(id);
            allFlows = flowsData;
            
            // Switch to the last flow (newly imported)
            if (allFlows.length > 0) {
                loadFlowByIndex(allFlows.length - 1);
            }
            
            showToast('Template imported as new flow!', 'success');
        } catch (e) {
            console.error("Failed to import template", e);
            showToast('Failed to import template', 'error');
        } finally {
            importingTemplate = null;
        }
    }

    // Load on init - only in browser
    if (browser) {
        loadFlow();
        loadTemplates();
    }

    function promptSave() {
        showSaveConfirm = true;
    }

    async function confirmSave() {
        showSaveConfirm = false;
        if (!id) return;
        saving = true;
        try {
            // Get current flow ID if editing existing flow
            const currentFlow = allFlows[currentFlowIndex];
            const currentFlowId = currentFlow?.id;
            
            // If we have an existing flow, update it instead of deleting all
            if (currentFlowId) {
                await api.saveFlow({
                    botId: id,
                    flowId: currentFlowId,
                    name: flowName || `${botName} Flow`,
                    triggerType: 'message_create',
                    nodes: JSON.stringify(nodes),
                    edges: JSON.stringify(edges),
                    published: true
                });
            } else {
                // No existing flow - create new one
                await api.saveFlow({
                    botId: id,
                    name: flowName || `${botName} Flow`,
                    triggerType: 'message_create',
                    nodes: JSON.stringify(nodes),
                    edges: JSON.stringify(edges),
                    published: true
                });
            }
            
            // Reload flows to keep state in sync with database
            const flowsData = await api.getFlows(id);
            allFlows = flowsData;
            
            // Update currentFlowIndex if needed
            if (allFlows.length > 0 && currentFlowIndex >= allFlows.length) {
                currentFlowIndex = allFlows.length - 1;
            }
            
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

    function exportFlow() {
        const flowData = {
            name: `${botName} Flow`,
            nodes: nodes,
            edges: edges,
            exportedAt: new Date().toISOString()
        };
        const jsonStr = JSON.stringify(flowData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${botName.replace(/\s+/g, '_')}_flow.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Flow exported successfully!', 'success');
    }

    // Handle edge connection - SvelteFlow automatically adds the edge to the bound edges array
    // We just need to broadcast to collaborators and mark changes
    function handleConnect(params: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) {
        hasChanges = true;
        // Broadcast to collaborators - find the just-added edge
        const addedEdge = edges.find(e => e.source === params.source && e.target === params.target);
        if (addedEdge) {
            emitEdgeConnect(addedEdge);
        }
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
        // Use concat instead of spread to avoid RangeError
        const currentNodes = Array.isArray(nodes) ? nodes : [];
        nodes = currentNodes.concat([newNode]);
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
        
        // Use concat instead of spread to avoid RangeError
        const currentNodes = Array.isArray(nodes) ? nodes : [];
        nodes = currentNodes.concat([newNode]);
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
    function handleEdgeHover(e: CustomEvent<{ edgeId: string; hovering: boolean; centerX: number; centerY: number }>) {
        if (e.detail.hovering) {
            hoveredEdge = { 
                edgeId: e.detail.edgeId, 
                centerX: e.detail.centerX, 
                centerY: e.detail.centerY 
            };
        } else if (!showEdgeDropdown && !showEdgeConfirm && !keepOverlayOpen) {
            hoveredEdge = null;
        }
    }

    function doEdgeDelete() {
        console.log('[doEdgeDelete] Called! hoveredEdge:', hoveredEdge);
        if (!hoveredEdge) {
            console.log('[doEdgeDelete] hoveredEdge is null, returning');
            return;
        }
        const targetId = hoveredEdge.edgeId;
        console.log('[doEdgeDelete] Deleting edge, targetId:', targetId);
        console.log('[doEdgeDelete] Current edges:', edges.map(e => e.id));
        
        // Filter out edges matching the ID (handling xy-edge__ prefix variations)
        edges = edges.filter(edge => {
            const matches = edge.id === targetId || 
                           edge.id === `xy-edge__${targetId}` ||
                           `xy-edge__${edge.id}` === targetId ||
                           edge.id.includes(targetId) ||
                           targetId.includes(edge.id);
            if (matches) console.log('[doEdgeDelete] Removing edge:', edge.id);
            return !matches;
        });
        hasChanges = true;
        
        hoveredEdge = null;
        showEdgeConfirm = false;
        showEdgeDropdown = false;
        keepOverlayOpen = false;
    }

    function doEdgeInsertNode(nodeType: string, nodeLabel: string, nodeIcon: string, nodeColor: string) {
        if (!hoveredEdge) return;
        
        const edge = edges.find(e => e.id === hoveredEdge!.edgeId);
        if (!edge) return;

        // Create new node
        const newNodeId = crypto.randomUUID();
        const newNode: Node = {
            id: newNodeId,
            type: nodeType,
            position: { x: hoveredEdge.centerX - 60, y: hoveredEdge.centerY - 32 },
            data: { label: nodeLabel, icon: nodeIcon, color: nodeColor }
        };

        // Add new node
        nodes = [...nodes, newNode];

        // Replace edge with two new edges
        edges = edges.filter(e => e.id !== hoveredEdge!.edgeId);
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
        
        hoveredEdge = null;
        showEdgeDropdown = false;
    }

    // Node options for edge insert
    const edgeInsertNodes = [
        { label: 'Send Reply', type: 'action', icon: 'reply', color: '#3b82f6' },
        { label: 'Send DM', type: 'action', icon: 'mail', color: '#ec4899' },
        { label: 'Add Role', type: 'action', icon: 'admin_panel_settings', color: '#10b981' },
        { label: 'Remove Role', type: 'action', icon: 'person_remove', color: '#ef4444' },
        { label: 'Ban User', type: 'action', icon: 'block', color: '#dc2626' },
        { label: 'Kick User', type: 'action', icon: 'logout', color: '#f97316' },
        { label: 'Delay', type: 'action', icon: 'schedule', color: '#64748b' },
        { label: 'Custom Code', type: 'code', icon: 'code', color: '#f59e0b' }
    ];

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

        // Edge hover event listener
        window.addEventListener('edge-hover', handleEdgeHover as EventListener);
    });

    onDestroy(() => {
        if (!browser) return;
        if (canvasRef) {
            canvasRef.removeEventListener('mousemove', handleMouseMove as EventListener);
        }
        window.removeEventListener('edge-hover', handleEdgeHover as EventListener);
    });
</script>

<svelte:window onclick={handleWindowClick} />

<div class="h-screen flex flex-col bg-dark-base">
    <!-- Header -->
    <header class="h-14 bg-dark-surface border-b border-dark-border flex items-center justify-between px-2 sm:px-4 shrink-0">
        <div class="flex items-center gap-1 sm:gap-3 min-w-0">
            <button onclick={goBack} class="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0">
                <span class="material-symbols-outlined text-[20px] sm:text-[24px]">arrow_back</span>
            </button>
            <div class="h-6 w-px bg-dark-border hidden sm:block"></div>
            <h1 class="text-white font-bold text-sm sm:text-lg flex items-center gap-1 sm:gap-2 min-w-0">
                <span class="hidden md:inline truncate max-w-[100px]">{botName}</span>
                <span class="text-gray-500 hidden md:inline">/</span>
                <!-- Custom Flow Dropdown -->
                <div class="relative">
                    <button 
                        onclick={() => showFlowDropdown = !showFlowDropdown}
                        class="flex items-center gap-1 sm:gap-2 bg-dark-base border border-dark-border rounded px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-dark-surface transition-colors cursor-pointer max-w-[120px] sm:max-w-none"
                    >
                        <span class="truncate">{flowName || 'New Flow'}</span>
                        <span class="material-symbols-outlined text-[14px] sm:text-[16px] text-gray-400 shrink-0">expand_more</span>
                    </button>
                    
                    {#if showFlowDropdown}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div 
                            class="fixed inset-0 z-40" 
                            onclick={() => showFlowDropdown = false}
                        ></div>
                        
                        <!-- Dropdown Menu -->
                        <div class="absolute top-full left-0 mt-1 w-64 bg-dark-surface border border-dark-border rounded-lg shadow-2xl z-50 overflow-hidden">
                            <!-- Flow List -->
                            <div class="max-h-60 overflow-y-auto">
                                {#each allFlows as flow, idx}
                                    <div class="flex items-center gap-2 px-3 py-2 hover:bg-white/5 group {idx === currentFlowIndex ? 'bg-primary/10 border-l-2 border-primary' : ''}">
                                        <!-- Flow Name (clickable) -->
                                        <button 
                                            onclick={() => { loadFlowByIndex(idx); showFlowDropdown = false; }}
                                            class="flex-1 text-left text-sm text-white truncate"
                                        >
                                            {flow.name || `Flow ${idx + 1}`}
                                        </button>
                                        
                                        <!-- Inline Actions -->
                                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onclick={(e) => { e.stopPropagation(); currentFlowIndex = idx; flowName = flow.name || `Flow ${idx + 1}`; newFlowName = flowName; showFlowDropdown = false; showRenameFlowModal = true; }}
                                                class="p-1 hover:bg-blue-500/20 rounded text-blue-400 hover:text-blue-300"
                                                title="Rename"
                                            >
                                                <span class="material-symbols-outlined text-[14px]">edit</span>
                                            </button>
                                            <button 
                                                onclick={(e) => { e.stopPropagation(); currentFlowIndex = idx; flowName = flow.name || `Flow ${idx + 1}`; showFlowDropdown = false; showDeleteFlowConfirm = true; }}
                                                class="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
                                                title="Delete"
                                            >
                                                <span class="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                            
                            <!-- Add Flow Button (at bottom) -->
                            <div class="border-t border-dark-border">
                                <button 
                                    onclick={() => { newFlowName = ''; showFlowDropdown = false; showAddFlowModal = true; }}
                                    class="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-green-400 hover:bg-green-500/10 transition-colors"
                                >
                                    <span class="material-symbols-outlined text-[18px]">add_circle</span>
                                    Add New Flow
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            </h1>
            {#if hasChanges}
                <span class="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Unsaved changes</span>
            {/if}
        </div>
        <div class="flex items-center gap-1.5 sm:gap-3">
            <!-- Remote Users Avatars - hidden on mobile -->
            {#if remoteUsers.length > 0}
                <div class="hidden sm:flex items-center gap-1 mr-2">
                    {#each remoteUsers as remote}
                        <div 
                            class="size-7 sm:size-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
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
                <div class="h-6 w-px bg-dark-border hidden sm:block"></div>
            {/if}
            
            {#if lastSaved}
                <span class="text-xs text-gray-500 hidden sm:inline">Saved {lastSaved.toLocaleTimeString()}</span>
            {/if}
            <button onclick={promptSave} disabled={saving} class="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors" title="Save Flow">
                {#if saving}
                    <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {:else}
                    <span class="material-symbols-outlined text-[18px]">save</span>
                {/if}
                <span class="hidden sm:inline">Save Flow</span>
            </button>
            <button onclick={exportFlow} class="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm transition-colors" title="Export">
                <span class="material-symbols-outlined text-[18px]">download</span>
                <span class="hidden sm:inline">Export</span>
            </button>
            <a href="/bots/{id}/panel" class="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors" title="Panel">
                <span class="material-symbols-outlined text-[18px]">terminal</span>
                <span class="hidden sm:inline">Panel</span>
            </a>
        </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden relative">
        <!-- Mobile toggle button for node palette -->
        <button 
            onclick={() => showNodePalette = !showNodePalette}
            class="md:hidden fixed bottom-4 left-4 z-50 size-12 rounded-full bg-primary shadow-lg flex items-center justify-center text-white"
            aria-label="Toggle nodes"
        >
            <span class="material-symbols-outlined text-[24px]">{showNodePalette ? 'close' : 'widgets'}</span>
        </button>

        <!-- Mobile backdrop -->
        {#if showNodePalette}
            <button 
                onclick={() => showNodePalette = false}
                class="md:hidden fixed inset-0 bg-black/50 z-30"
                aria-label="Close palette"
            ></button>
        {/if}

        <!-- Sidebar - Node Palette -->
        <aside class="
            w-56 bg-dark-surface border-r border-dark-border overflow-y-auto shrink-0 z-40
            fixed md:relative h-full
            transform md:transform-none transition-transform duration-300
            {showNodePalette ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ">
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

                <!-- AI -->
                <div>
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">AI</h3>
                    <div class="space-y-1">
                        {#each nodeDefinitions.ai as def}
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

                <!-- Templates -->
                <div>
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Templates</h3>
                    <div class="space-y-1.5">
                        {#each availableTemplates as template}
                            <button 
                                type="button"
                                onclick={() => importTemplateToBot(template.id)}
                                disabled={importingTemplate === template.id}
                                class="w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
                            >
                                <div class="size-8 rounded-lg flex items-center justify-center shrink-0" style="background: {template.color}20;">
                                    <span class="material-symbols-outlined text-[18px]" style="color: {template.color};">{template.icon}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <span class="font-medium text-xs line-clamp-1">{template.name}</span>
                                </div>
                                {#if importingTemplate === template.id}
                                    <div class="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                {:else}
                                    <span class="material-symbols-outlined text-[14px] text-gray-500">add_circle</span>
                                {/if}
                            </button>
                        {:else}
                            <p class="text-xs text-gray-500 px-2">Loading templates...</p>
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
            {#if isLoaded}
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
                {#if nodes && nodes.length > 0}
                <MiniMap 
                    class="!bg-dark-surface !border !border-dark-border !rounded-lg"
                    nodeColor="#6366f1"
                    maskColor="rgba(0,0,0,0.8)"
                />
                {/if}
                
                {#if nodes.length > 0}
                <!-- Remote Cursors - uses position from activity -->
                <RemoteCursors activities={remoteActivities} />
                
                <!-- Edge Actions Overlay - uses flowToScreenPosition for proper positioning -->
                <EdgeActionsOverlay 
                    {hoveredEdge}
                    showDropdown={showEdgeDropdown}
                    showConfirm={showEdgeConfirm}
                    onDelete={doEdgeDelete}
                    onInsertNode={doEdgeInsertNode}
                    onToggleDropdown={() => { showEdgeDropdown = !showEdgeDropdown; showEdgeConfirm = false; }}
                    onShowConfirm={() => { showEdgeConfirm = true; showEdgeDropdown = false; }}
                    onCancel={() => showEdgeConfirm = false}
                    onClose={() => { hoveredEdge = null; showEdgeDropdown = false; showEdgeConfirm = false; keepOverlayOpen = false; }}
                    onKeepOpen={() => { keepOverlayOpen = true; }}
                />
                {/if}
            </SvelteFlow>
            {:else}
            <div class="flex-1 flex items-center justify-center">
                <div class="text-center">
                    <div class="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                    <p class="text-gray-400">Loading flow...</p>
                </div>
            </div>
            {/if}
        </div>

        <!-- Mobile toggle button for properties panel -->
        <button 
            onclick={() => showProperties = !showProperties}
            class="md:hidden fixed bottom-4 right-4 z-50 size-12 rounded-full bg-amber-500 shadow-lg flex items-center justify-center text-white"
            aria-label="Toggle properties"
        >
            <span class="material-symbols-outlined text-[24px]">{showProperties ? 'close' : 'tune'}</span>
        </button>

        <!-- Mobile backdrop for properties -->
        {#if showProperties}
            <button 
                onclick={() => showProperties = false}
                class="md:hidden fixed inset-0 bg-black/50 z-30"
                aria-label="Close properties"
            ></button>
        {/if}

        <!-- Properties Panel -->
        <aside class="
            w-72 bg-dark-surface border-l border-dark-border p-4 shrink-0 overflow-y-auto z-40
            fixed md:relative h-full right-0 top-0
            transform md:transform-none transition-transform duration-300
            {showProperties ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-white font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">tune</span>
                    Properties
                </h3>
                <button onclick={() => showProperties = false} class="md:hidden p-1 hover:bg-white/5 rounded text-gray-400">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
            
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
                                    {#each (selectedNode.data.reactions as Array<{emoji: string; code: string}> || []) as reaction, i}
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
                                                    const reactions = [...(selectedNode?.data.reactions as Array<{emoji: string; code: string}> || [])];
                                                    reactions.splice(i, 1);
                                                    updateNodeData('reactions', reactions as unknown as string);
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
                                                    const reactions = [...(selectedNode?.data.reactions as Array<{id: string; emoji: string; code: string}> || [])];
                                                    // Parse emoji code or use as-is
                                                    const emoji = value.match(/^:(\w+):$/) ? value : value;
                                                    reactions.push({ 
                                                        id: crypto.randomUUID(),
                                                        code: value,
                                                        emoji: emoji.replace(/:/g, '')
                                                    });
                                                    updateNodeData('reactions', reactions as unknown as string);
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
                                                const reactions = [...(selectedNode?.data.reactions as Array<{id: string; emoji: string; code: string}> || [])];
                                            const emoji = value.match(/^:(\w+):$/) ? value : value;
                                            reactions.push({ 
                                                id: crypto.randomUUID(),
                                                code: value,
                                                emoji: emoji.replace(/:/g, '')
                                            });
                                            updateNodeData('reactions', reactions as unknown as string);
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
                                        checked={(selectedNode.data.useSpecificChannel as boolean) || false}
                                        onchange={(e) => updateNodeData('useSpecificChannel', String(e.currentTarget.checked))}
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

                    <!-- AI Provider Node Options -->
                    {#if selectedNode.type === 'aiProvider'}
                        <div class="space-y-3">
                            <div>
                                <label for="ai-provider-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Provider</label>
                                <select 
                                    id="ai-provider-select"
                                    value={selectedNode.data.provider || 'gemini'}
                                    onchange={(e) => updateNodeData('provider', e.currentTarget.value)}
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                                >
                                    <option value="gemini">🌟 Gemini</option>
                                    <option value="openai">🤖 OpenAI</option>
                                    <option value="azure">☁️ Azure AI</option>
                                    <option value="claude">🎭 Claude</option>
                                    <option value="groq">⚡ Groq</option>
                                    <option value="mistral">🌀 Mistral AI</option>
                                    <option value="cohere">🔷 Cohere</option>
                                    <option value="perplexity">🔮 Perplexity</option>
                                    <option value="deepseek">🔍 DeepSeek</option>
                                    <option value="xai">🚀 xAI (Grok)</option>
                                    <option value="together">🤝 Together AI</option>
                                    <option value="fireworks">🎆 Fireworks</option>
                                    <option value="replicate">🔁 Replicate</option>
                                    <option value="ai21">📚 AI21 Labs</option>
                                    <option value="huggingface">🤗 HuggingFace</option>
                                    <option value="ollama">🦙 Ollama (Local)</option>
                                    <option value="zanai">🧠 Z.AI (智谱)</option>
                                    <option value="openrouter">🌐 OpenRouter</option>
                                </select>
                            </div>
                            {#if selectedNode.data.provider === 'ollama'}
                                <!-- Ollama uses host URL, not API key -->
                                <div>
                                    <label for="ai-ollama-host" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ollama Host</label>
                                    <input 
                                        id="ai-ollama-host"
                                        type="text"
                                        value={selectedNode.data.ollamaHost || 'http://localhost:11434'}
                                        oninput={(e) => updateNodeData('ollamaHost', e.currentTarget.value)}
                                        placeholder="http://localhost:11434"
                                        class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                    <p class="text-xs text-gray-500 mt-1">🦙 Ollama runs locally, no API key needed</p>
                                </div>
                            {:else}
                                <div>
                                    <label for="ai-provider-apikey" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">API Key</label>
                                    <input 
                                        id="ai-provider-apikey"
                                        type="password"
                                        value={selectedNode.data.apiKey || ''}
                                        oninput={(e) => updateNodeData('apiKey', e.currentTarget.value)}
                                        placeholder="Enter API key"
                                        class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm font-mono"
                                    />
                                </div>
                            {/if}
                            {#if selectedNode.data.provider === 'azure'}
                                <div>
                                    <label for="ai-azure-endpoint" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Azure Endpoint</label>
                                    <input 
                                        id="ai-azure-endpoint"
                                        type="text"
                                        value={selectedNode.data.azureEndpoint || ''}
                                        oninput={(e) => updateNodeData('azureEndpoint', e.currentTarget.value)}
                                        placeholder="https://your-resource.openai.azure.com"
                                        class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                            {/if}
                            <button
                                onclick={() => fetchProviderModels(
                                    selectedNode?.id || '',
                                    String(selectedNode?.data.provider || 'gemini'),
                                    String(selectedNode?.data.apiKey || ''),
                                    String(selectedNode?.data.azureEndpoint || '')
                                )}
                                disabled={loadingFetchModels || !selectedNode?.data.apiKey}
                                class="w-full py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                            >
                                {#if loadingFetchModels}
                                    <span class="animate-spin">⏳</span> Fetching...
                                {:else}
                                    <span class="material-symbols-outlined text-[18px]">sync</span>
                                    Fetch Available Models
                                {/if}
                            </button>
                            
                            <!-- Custom Model Entry -->
                            <div class="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-amber-400">✏️</span>
                                    <span class="text-xs font-bold text-amber-400 uppercase">Custom Model</span>
                                    <span class="text-[10px] text-amber-400/60 ml-auto">For APIs without model listing</span>
                                </div>
                                <input 
                                    type="text"
                                    value={selectedNode?.data?.customModel || ''}
                                    oninput={(e) => updateNodeData('customModel', e.currentTarget.value)}
                                    placeholder="e.g., claude-opus-4-5"
                                    class="w-full bg-dark-base border border-amber-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-400 focus:outline-none"
                                />
                                <button
                                    onclick={() => deployCustomModel(
                                        selectedNode?.id || '',
                                        String(selectedNode?.data.provider || 'azure'),
                                        String(selectedNode?.data.apiKey || ''),
                                        String(selectedNode?.data.azureEndpoint || ''),
                                        String(selectedNode?.data.customModel || '')
                                    )}
                                    disabled={loadingDeployModel || !selectedNode?.data?.customModel || !selectedNode?.data?.apiKey}
                                    class="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                                >
                                    {#if loadingDeployModel}
                                        <span class="animate-spin">⏳</span> Validating...
                                    {:else}
                                        <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
                                        Deploy Model
                                    {/if}
                                </button>
                                {#if selectedNode?.data?.customModel && ((selectedNode?.data?.fetchedModels || []) as any[]).some((m: any) => m.id === selectedNode?.data?.customModel)}
                                    <div class="text-[10px] text-green-400/80 flex items-center gap-1">
                                        <span>✓</span> Model "{selectedNode.data.customModel}" deployed and ready!
                                    </div>
                                {/if}
                                
                                <!-- Delete Model Button -->
                                <button
                                    onclick={() => deleteCustomModel(
                                        selectedNode?.id || '',
                                        String(selectedNode?.data?.customModel || '')
                                    )}
                                    disabled={!selectedNode?.data?.customModel || !((selectedNode?.data?.fetchedModels || []) as any[]).some((m: any) => m.id === selectedNode?.data?.customModel)}
                                    class="w-full py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    <span class="material-symbols-outlined text-[18px]">delete</span>
                                    Delete Model
                                </button>
                            </div>
                            
                            {#if ((selectedNode?.data?.fetchedModels || []) as any[]).length > 0}
                                <!-- Header -->
                                <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2 border border-green-500/30">
                                    <span class="text-green-400">✅</span>
                                    <span class="text-sm font-bold text-green-400">{((selectedNode?.data?.fetchedModels || []) as any[]).length} Models</span>
                                    <span class="text-xs text-green-400/60 ml-auto px-2 py-0.5 bg-green-500/20 rounded">{String(selectedNode?.data?.provider || '').toUpperCase()}</span>
                                </div>
                                
                                <!-- Mode Cards -->
                                <div class="grid gap-2 mt-2">
                                    
                                    <!-- Chat Models -->
                                    {#if ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('chat')).length > 0}
                                        <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg overflow-hidden">
                                            <div class="px-3 py-2 bg-blue-500/10 flex items-center gap-2 border-b border-blue-500/20">
                                                <span>💬</span>
                                                <span class="text-xs font-bold text-blue-400">CHAT</span>
                                                <span class="text-[10px] text-blue-400/60 ml-auto bg-blue-500/20 px-1.5 py-0.5 rounded-full">{((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('chat')).length}</span>
                                            </div>
                                            <div class="p-2 space-y-1">
                                                {#each ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('chat')) as model}
                                                    <div class="text-[11px] text-gray-300 bg-dark-base/50 rounded px-2 py-1 truncate" title={model.id}>{model.name}</div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    {#if ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('code')).length > 0}
                                        <div class="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/30 rounded-lg overflow-hidden">
                                            <div class="px-3 py-2 bg-amber-500/10 flex items-center gap-2 border-b border-amber-500/20">
                                                <span>💻</span>
                                                <span class="text-xs font-bold text-amber-400">CODE</span>
                                                <span class="text-[10px] text-amber-400/60 ml-auto bg-amber-500/20 px-1.5 py-0.5 rounded-full">{((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('code')).length}</span>
                                            </div>
                                            <div class="p-2 space-y-1">
                                                {#each ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('code')) as model}
                                                    <div class="text-[11px] text-gray-300 bg-dark-base/50 rounded px-2 py-1 truncate" title={model.id}>{model.name}</div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    {#if ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('vision')).length > 0}
                                        <div class="bg-gradient-to-br from-cyan-500/10 to-teal-600/5 border border-cyan-500/30 rounded-lg overflow-hidden">
                                            <div class="px-3 py-2 bg-cyan-500/10 flex items-center gap-2 border-b border-cyan-500/20">
                                                <span>👁️</span>
                                                <span class="text-xs font-bold text-cyan-400">VISION</span>
                                                <span class="text-[10px] text-cyan-400/60 ml-auto bg-cyan-500/20 px-1.5 py-0.5 rounded-full">{((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('vision')).length}</span>
                                            </div>
                                            <div class="p-2 space-y-1">
                                                {#each ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('vision')) as model}
                                                    <div class="text-[11px] text-gray-300 bg-dark-base/50 rounded px-2 py-1 truncate" title={model.id}>{model.name}</div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    {#if ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('image')).length > 0}
                                        <div class="bg-gradient-to-br from-pink-500/10 to-rose-600/5 border border-pink-500/30 rounded-lg overflow-hidden">
                                            <div class="px-3 py-2 bg-pink-500/10 flex items-center gap-2 border-b border-pink-500/20">
                                                <span>🎨</span>
                                                <span class="text-xs font-bold text-pink-400">IMAGE</span>
                                                <span class="text-[10px] text-pink-400/60 ml-auto bg-pink-500/20 px-1.5 py-0.5 rounded-full">{((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('image')).length}</span>
                                            </div>
                                            <div class="p-2 space-y-1">
                                                {#each ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('image')) as model}
                                                    <div class="text-[11px] text-gray-300 bg-dark-base/50 rounded px-2 py-1 truncate" title={model.id}>{model.name}</div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    {#if ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('audio')).length > 0}
                                        <div class="bg-gradient-to-br from-purple-500/10 to-violet-600/5 border border-purple-500/30 rounded-lg overflow-hidden">
                                            <div class="px-3 py-2 bg-purple-500/10 flex items-center gap-2 border-b border-purple-500/20">
                                                <span>🎵</span>
                                                <span class="text-xs font-bold text-purple-400">AUDIO</span>
                                                <span class="text-[10px] text-purple-400/60 ml-auto bg-purple-500/20 px-1.5 py-0.5 rounded-full">{((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('audio')).length}</span>
                                            </div>
                                            <div class="p-2 space-y-1">
                                                {#each ((selectedNode?.data?.fetchedModels || []) as any[]).filter((m: any) => m.modes?.includes('audio')) as model}
                                                    <div class="text-[11px] text-gray-300 bg-dark-base/50 rounded px-2 py-1 truncate" title={model.id}>{model.name}</div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <!-- AI Mode Node Options -->
                    {#if selectedNode.type === 'aiMode'}
                        <div class="space-y-3">
                            <div>
                                <label for="ai-mode-provider" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Provider</label>
                                <select 
                                    id="ai-mode-provider"
                                    value={selectedNode.data.provider || 'gemini'}
                                    onchange={(e) => updateNodeData('provider', e.currentTarget.value)}
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                                >
                                    <option value="gemini">🌟 Gemini</option>
                                    <option value="openai">🤖 OpenAI</option>
                                    <option value="azure">☁️ Azure AI</option>
                                    <option value="claude">🎭 Claude</option>
                                    <option value="groq">⚡ Groq</option>
                                    <option value="mistral">🌀 Mistral AI</option>
                                    <option value="cohere">🔷 Cohere</option>
                                    <option value="perplexity">🔮 Perplexity</option>
                                    <option value="deepseek">🔍 DeepSeek</option>
                                    <option value="xai">🚀 xAI (Grok)</option>
                                    <option value="together">🤝 Together AI</option>
                                    <option value="fireworks">🎆 Fireworks</option>
                                    <option value="replicate">🔁 Replicate</option>
                                    <option value="ai21">📚 AI21 Labs</option>
                                    <option value="huggingface">🤗 HuggingFace</option>
                                    <option value="ollama">🦙 Ollama (Local)</option>
                                    <option value="zanai">🧠 Z.AI (智谱)</option>
                                    <option value="openrouter">🌐 OpenRouter</option>
                                </select>
                            </div>
                            {#if selectedNode.data.provider === 'ollama'}
                                <!-- Ollama uses host URL, not API key -->
                                <div>
                                    <label for="ai-mode-ollama-host" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ollama Host</label>
                                    <input 
                                        id="ai-mode-ollama-host"
                                        type="text"
                                        value={selectedNode.data.ollamaHost || 'http://localhost:11434'}
                                        oninput={(e) => updateNodeData('ollamaHost', e.currentTarget.value)}
                                        placeholder="http://localhost:11434"
                                        class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                    <p class="text-xs text-gray-500 mt-1">🦙 Ollama runs locally, no API key needed</p>
                                </div>
                            {:else}
                                <div>
                                    <label for="ai-mode-apikey" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">API Key</label>
                                    <input 
                                        id="ai-mode-apikey"
                                        type="password"
                                        value={selectedNode.data.apiKey || ''}
                                        oninput={(e) => updateNodeData('apiKey', e.currentTarget.value)}
                                        placeholder="Enter API key"
                                        class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm font-mono"
                                    />
                                </div>
                            {/if}
                            <div>
                                <label for="ai-mode-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mode</label>
                                <select 
                                    id="ai-mode-select"
                                    value={selectedNode.data.mode || 'chat'}
                                    onchange={(e) => updateNodeData('mode', e.currentTarget.value)}
                                    class="w-full bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                                >
                                    <option value="chat">💬 Chat</option>
                                    <option value="code">💻 Code</option>
                                    <option value="image">🎨 Image</option>
                                </select>
                            </div>
                            <button
                                onclick={() => fetchProviderModels(selectedNode?.id || '', String(selectedNode?.data.provider || 'gemini'), String(selectedNode?.data.apiKey || ''), '')}
                                disabled={loadingFetchModels || !selectedNode?.data.apiKey}
                                class="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg disabled:opacity-50"
                            >
                                {loadingFetchModels ? '⏳ Loading...' : '🚀 Deploy Model'}
                            </button>
                            {#if ((selectedNode?.data?.fetchedModels || []) as any[]).length > 0}
                                <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                                    <p class="text-xs text-green-400">✅ Model ready: {((selectedNode?.data?.fetchedModels || []) as any[])[0]?.name}</p>
                                </div>
                            {/if}
                        </div>
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


<!-- Add Flow Modal -->
{#if showAddFlowModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-dark-surface border border-dark-border rounded-xl p-6 w-96 shadow-2xl">
            <h3 class="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-green-400">add_circle</span>
                Add New Flow
            </h3>
            <input 
                type="text"
                bind:value={newFlowName}
                placeholder="Flow name..."
                class="w-full bg-dark-base border border-dark-border rounded-lg px-4 py-2 text-white mb-4"
            />
            <div class="flex gap-2 justify-end">
                <button onclick={() => showAddFlowModal = false} class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm">
                    Cancel
                </button>
                <button onclick={addNewFlow} class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold">
                    Create Flow
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Rename Flow Modal -->
{#if showRenameFlowModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-dark-surface border border-dark-border rounded-xl p-6 w-96 shadow-2xl">
            <h3 class="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-400">edit</span>
                Rename Flow
            </h3>
            <input 
                type="text"
                bind:value={newFlowName}
                placeholder="New flow name..."
                class="w-full bg-dark-base border border-dark-border rounded-lg px-4 py-2 text-white mb-4"
            />
            <div class="flex gap-2 justify-end">
                <button onclick={() => showRenameFlowModal = false} class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm">
                    Cancel
                </button>
                <button onclick={renameCurrentFlow} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold">
                    Rename
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Delete Flow Confirmation -->
{#if showDeleteFlowConfirm}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-dark-surface border border-dark-border rounded-xl p-6 w-96 shadow-2xl">
            <h3 class="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-red-400">delete</span>
                Delete Flow
            </h3>
            <p class="text-gray-400 mb-4">
                Are you sure you want to delete "<span class="text-white font-bold">{flowName}</span>"? This action cannot be undone.
            </p>
            <div class="flex gap-2 justify-end">
                <button onclick={() => showDeleteFlowConfirm = false} class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm">
                    Cancel
                </button>
                <button onclick={deleteCurrentFlow} class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">
                    Delete
                </button>
            </div>
        </div>
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
