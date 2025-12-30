import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, path.resolve(process.cwd(), '../../'), '');

	// Parse allowed hosts from env (comma-separated)
	const allowedHosts = env.VITE_ALLOWED_HOSTS
		? env.VITE_ALLOWED_HOSTS.split(',').map(host => host.trim())
		: ['localhost'];

	const port = parseInt(env.WEB_PORT) || 5173;
	const publicUrl = env.VITE_PUBLIC_WEB_URL || `http://localhost:${port}`;

	return {
		plugins: [
			sveltekit(),
			{
				name: 'custom-server-message',
				configureServer(server) {
					server.httpServer?.once('listening', () => {
						console.log('\n');
						console.log('  ╔════════════════════════════════════════════╗');
						console.log('  ║       🤖 Discord Bot Panel - Web          ║');
						console.log('  ╠════════════════════════════════════════════╣');
						console.log(`  ║  🌐 Public URL: ${publicUrl.padEnd(25)} ║`);
						console.log(`  ║  🖥️  Local:      http://localhost:${port}        ║`);
						console.log('  ╚════════════════════════════════════════════╝');
						console.log('\n');
					});
				}
			}
		],
		server: {
			host: true, // Expose to network for CloudFlare Tunnel
			port: port,
			allowedHosts: allowedHosts
		},
		envDir: '../../',
		define: {
			// Expose PUBLIC_ environment variables to frontend at build time
			// This makes them available as import.meta.env.PUBLIC_API_URL etc
			'import.meta.env.PUBLIC_API_URL': JSON.stringify(env.PUBLIC_API_URL || 'http://localhost:4000'),
			'import.meta.env.PUBLIC_WEB_URL': JSON.stringify(env.PUBLIC_WEB_URL || 'http://localhost:5173'),
		},
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// IGNORE ALL warnings involving @xyflow/system or handleConnectionChange
					// This library has known unused export issues in build
					if (
						(warning.message && warning.message.includes('@xyflow')) ||
						(warning.id && warning.id.includes('@xyflow')) ||
						(warning.message && warning.message.includes('handleConnectionChange'))
					) {
						return;
					}

					// Use default handler for everything else
					warn(warning);
				}
			}
		}
	};
});
