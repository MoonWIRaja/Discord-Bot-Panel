import { authClient } from "./auth";

const API_Base = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4000';

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

    async getAuthHeaders() {
        return {
            'Content-Type': 'application/json'
        };
    }
}
