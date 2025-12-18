import { createAuthClient } from "better-auth/svelte";

const apiUrl = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4000';

export const authClient = createAuthClient({
    baseURL: apiUrl
});

export const { signIn, signOut, useSession } = authClient;
