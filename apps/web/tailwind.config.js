import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}"],
	safelist: ["dark"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px"
			}
		},
		extend: {
			colors: {
				border: "hsl(var(--border) / <alpha-value>)",
				input: "hsl(var(--input) / <alpha-value>)",
				ring: "hsl(var(--ring) / <alpha-value>)",
				background: "hsl(var(--background) / <alpha-value>)",
				foreground: "hsl(var(--foreground) / <alpha-value>)",
				primary: {
					DEFAULT: "hsl(var(--primary) / <alpha-value>)",
					foreground: "hsl(var(--primary-foreground) / <alpha-value>)"
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
					foreground: "hsl(var(--secondary-foreground) / <alpha-value>)"
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
					foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
				},
				muted: {
					DEFAULT: "hsl(var(--muted) / <alpha-value>)",
					foreground: "hsl(var(--muted-foreground) / <alpha-value>)"
				},
				accent: {
					DEFAULT: "hsl(var(--accent) / <alpha-value>)",
					foreground: "hsl(var(--accent-foreground) / <alpha-value>)"
				},
				popover: {
					DEFAULT: "hsl(var(--popover) / <alpha-value>)",
					foreground: "hsl(var(--popover-foreground) / <alpha-value>)"
				},
				card: {
					DEFAULT: "hsl(var(--card) / <alpha-value>)",
					foreground: "hsl(var(--card-foreground) / <alpha-value>)"
				},
                // Custom brand colors from reference HTML
                brand: {
                    DEFAULT: "#6366f1", // Indigo
                    hover: "#4f46e5",
                },
                "background-light": "#f7f7f7",
                "background-dark": "#050505",
                "surface-dark": "#121212",
                // Login specific
                "login-bg": "#09090b",
                "login-surface": "#18181b",
                "login-sidebar": "#000000",
                "discord": "#5865F2",
                "discord-hover": "#4752C4",
                "login-border": "#27272a",
                "login-text": "#ffffff",
                "login-muted": "#a1a1aa",
                // Dashboard specific
                "dark-base": "#0B0C0E", 
                "dark-surface": "#131418", 
                "dark-card": "#1A1C21", 
                "dark-border": "#282B33", 
                "main": "#F3F4F6", // text-main
                "muted": "#9CA3AF", // text-muted
                // Bot Studio/Settings specific
                "bot-primary": "#1313ec",
                "bot-primary-hover": "#0f0fb8",
                "bot-bg-light": "#f6f6f8",
                "bot-bg-dark": "#101022",
                "bot-surface": "#1a1d24",
                "bot-surface-lighter": "#242832",
                "bot-border": "#2d313a",
                // Log Colors
                 "log-bg": "#050505",
                 "log-surface": "#121212",
                 "log-highlight": "#1e1e1e",
                 "log-border": "#2a2a2a",
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)"
			},
			fontFamily: {
				sans: [...fontFamily.sans],
                display: ["Plus Jakarta Sans", "sans-serif"],
                body: ["Noto Sans", "sans-serif"]
			}
		}
	},
	plugins: [tailwindcssAnimate]
};

export default config;
