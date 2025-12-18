import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, path.resolve(process.cwd(), '../../'), '');
	return {
		plugins: [sveltekit()],
		server: {
			port: parseInt(env.WEB_PORT) || 5173
		},
		envDir: '../../'
	};
});
