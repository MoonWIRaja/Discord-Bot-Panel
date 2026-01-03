import { writable } from 'svelte/store';

// Sidebar open/close state - shared between Header and Sidebar
export const sidebarOpen = writable(false);

// Toggle sidebar
export function toggleSidebar() {
    sidebarOpen.update(v => !v);
}

// Close sidebar
export function closeSidebar() {
    sidebarOpen.set(false);
}

// Open sidebar
export function openSidebar() {
    sidebarOpen.set(true);
}
