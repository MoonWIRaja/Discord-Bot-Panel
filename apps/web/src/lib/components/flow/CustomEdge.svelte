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

    let isHovered = $state(false);

    const edgePath = $derived.by(() => {
        // Guard against undefined positions
        if (sourceX == null || sourceY == null || targetX == null || targetY == null) {
            return '';
        }
        try {
            const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
            return path || '';
        } catch {
            return '';
        }
    });

    const centerX = $derived((sourceX ?? 0) + ((targetX ?? 0) - (sourceX ?? 0)) / 2);
    const centerY = $derived((sourceY ?? 0) + ((targetY ?? 0) - (sourceY ?? 0)) / 2);

    function emitHover(hovering: boolean) {
        if (!browser) return;
        isHovered = hovering;
        window.dispatchEvent(new CustomEvent('edge-hover', { 
            detail: { 
                edgeId: id, 
                hovering, 
                centerX, 
                centerY,
                sourceX,
                sourceY,
                targetX,
                targetY
            } 
        }));
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<g 
    onmouseenter={() => emitHover(true)}
    onmouseleave={() => emitHover(false)}
>
    <!-- Wide invisible path for easy hover -->
    <path d={edgePath} fill="none" stroke="transparent" stroke-width="40" style="cursor:pointer" />
    
    <!-- Visible edge -->
    <BaseEdge path={edgePath} {markerEnd} style={isHovered ? 'stroke:#818cf8;stroke-width:3px' : style} />
</g>
