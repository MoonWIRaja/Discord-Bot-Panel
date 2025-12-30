import { authClient } from "./auth";

const API_Base = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

type Bot = {
    id: string;
    name: string;
    token: string;
    status: 'online' | 'offline' | 'error';
    config: any;
    avatar?: string;
    clientId?: string;
};

type Flow = {
    id: string;
    name: string;
    triggerType: string;
    published: boolean;
    updated_at: string;
};

type Collaborator = {
    id: string;
    role: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
};

type UserSearchResult = {
    id: string;
    name: string;
    email: string;
    image: string | null;
};

export const api = {
    // Generic HTTP methods for dynamic routes
    async get(path: string): Promise<any> {
        const res = await fetch(`${API_Base}${path.startsWith('/api') ? path : '/api' + path}`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`GET ${path} failed`);
        return await res.json();
    },

    async post(path: string, body?: any): Promise<any> {
        const res = await fetch(`${API_Base}${path.startsWith('/api') ? path : '/api' + path}`, {
            method: 'POST',
            headers: { ...await this.getAuthHeaders(), 'Content-Type': 'application/json' },
            credentials: 'include',
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) throw new Error(`POST ${path} failed`);
        return await res.json();
    },

    async put(path: string, body?: any): Promise<any> {
        const res = await fetch(`${API_Base}${path.startsWith('/api') ? path : '/api' + path}`, {
            method: 'PUT',
            headers: { ...await this.getAuthHeaders(), 'Content-Type': 'application/json' },
            credentials: 'include',
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) throw new Error(`PUT ${path} failed`);
        return await res.json();
    },

    async delete(path: string): Promise<any> {
        const res = await fetch(`${API_Base}${path.startsWith('/api') ? path : '/api' + path}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`DELETE ${path} failed`);
        return await res.json();
    },

    async getBots() {
        const res = await fetch(`${API_Base}/api/bots`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch bots');
        return await res.json() as Bot[];
    },

    async getBot(id: string) {
        const res = await fetch(`${API_Base}/api/bots/${id}`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch bot');
        return await res.json() as Bot;
    },

    async validateToken(token: string) {
        const res = await fetch(`${API_Base}/api/bots/validate`, {
             method: 'POST',
             headers: await this.getAuthHeaders(),
             body: JSON.stringify({ token }),
             credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid Token');
        return data as { id: string; username: string; discriminator: string; avatar: string | null };
    },

    async createBot(token: string) {
        const res = await fetch(`${API_Base}/api/bots`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ token }),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create bot');
        return data as Bot;
    },

    async updateBot(id: string, name: string) {
        const res = await fetch(`${API_Base}/api/bots/${id}`, {
            method: 'PATCH',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ name }),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update bot');
        return data;
    },

    async deleteBot(id: string) {
         const res = await fetch(`${API_Base}/api/bots/${id}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete bot');
    },

    // Bot control methods
    async getBotStatus(botId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/status`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to get bot status');
        return await res.json() as { status: 'online' | 'offline' | 'error' };
    },

    async startBot(botId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/start`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to start bot');
        return data;
    },

    async stopBot(botId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/stop`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to stop bot');
        return data;
    },

    async restartBot(botId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/restart`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to restart bot');
        return data;
    },

    // Collaborator methods
    async getCollaborators(botId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/collaborators`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch collaborators');
        return await res.json() as Collaborator[];
    },

    async addCollaborator(botId: string, userId: string, role: 'editor' | 'viewer' = 'editor') {
        const res = await fetch(`${API_Base}/api/bots/${botId}/collaborators`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ userId, role }),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add collaborator');
        return data;
    },

    async removeCollaborator(botId: string, collaboratorId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/collaborators/${collaboratorId}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to remove collaborator');
    },

    async searchUsers(query: string) {
        const res = await fetch(`${API_Base}/api/bots/users/search?q=${encodeURIComponent(query)}`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to search users');
        return await res.json() as UserSearchResult[];
    },

    async getFlows(botId: string) {
        const res = await fetch(`${API_Base}/api/flows/${botId}`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch flows');
        return await res.json() as Flow[];
    },

    async saveFlow(flowData: any) {
        const res = await fetch(`${API_Base}/api/flows`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(flowData),
            credentials: 'include'
        });
         const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save flow');
        return data;
    },

    async deleteFlows(botId: string) {
        const res = await fetch(`${API_Base}/api/flows/bot/${botId}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete flows');
        return await res.json();
    },

    async createFlow(botId: string, flowData: { name: string; triggerType: string; nodes: string; edges: string }) {
        const res = await fetch(`${API_Base}/api/flows`, {
            method: 'POST',
            headers: { ...await this.getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId, ...flowData }),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create flow');
        return data;
    },

    async deleteFlow(botId: string, flowId: string) {
        const res = await fetch(`${API_Base}/api/flows/${flowId}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete flow');
        return await res.json();
    },

    async updateFlow(botId: string, flowId: string, data: { name?: string }) {
        const res = await fetch(`${API_Base}/api/flows/${flowId}`, {
            method: 'PUT',
            headers: { ...await this.getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to update flow');
        return result;
    },

    async getDashboardStats() {
        const bots = await this.getBots();
        return {
            totalBots: bots.length,
            onlineBots: bots.filter(b => b.status === 'online').length,
             events: 0 
        };
    },

    // Template methods
    async getTemplates() {
        const res = await fetch(`${API_Base}/api/templates`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch templates');
        return await res.json();
    },

    async importTemplate(templateId: string, botId: string) {
        const res = await fetch(`${API_Base}/api/templates/${templateId}/import/${botId}`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to import template');
        return data;
    },

    async uploadTemplate(templateData: {
        name: string;
        description: string;
        category: string;
        icon: string;
        color: string;
        nodes: string;
        edges: string;
        triggerType: string;
    }) {
        const res = await fetch(`${API_Base}/api/templates`, {
            method: 'POST',
            headers: { ...await this.getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData),
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload template');
        return data;
    },

    async getAuthHeaders() {
        return {
            'Content-Type': 'application/json'
        };
    },

    // Token Usage methods
    async getTokenUsageSummary(botId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/token-usage/summary`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to get token usage summary');
        return await res.json();
    },

    async getTokenUsageLogs(botId: string, limit: number = 100) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/token-usage/logs?limit=${limit}`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to get token usage logs');
        return await res.json();
    },

    async getTokenLimits(botId: string) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/token-limits`, {
            headers: await this.getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to get token limits');
        return await res.json();
    },

    async updateTokenLimits(botId: string, providerId: string, limits: {
        dailyLimit?: number;
        weeklyLimit?: number;
        monthlyLimit?: number;
        autoResetDaily?: boolean;
        autoResetWeekly?: boolean;
        autoResetMonthly?: boolean;
        allowAdminBypass?: boolean;
        notifyOwnerOnLimit?: boolean;
        isEnabled?: boolean;
    }) {
        const res = await fetch(`${API_Base}/api/bots/${botId}/token-limits/${providerId}`, {
            method: 'PUT',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(limits),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to update token limits');
        return await res.json();
    },

    async resetTokenUsage(botId: string, providerId: string, period: 'daily' | 'weekly' | 'monthly' | 'all' = 'all') {
        const res = await fetch(`${API_Base}/api/bots/${botId}/token-limits/${providerId}/reset`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ period }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to reset token usage');
        return await res.json();
    }
}
