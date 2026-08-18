/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			fontFamily: {
				display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
			colors: {
				cream: { 50: '#fffdfa', 100: '#faf6f1', 200: '#f3ebe3' },
				cocoa: { 400: '#9a7b6f', 600: '#73574d', 700: '#60483f', 800: '#4c3932', 900: '#382b27', 950: '#251d1a' },
				clay: { 100: '#f1dfd7', 200: '#e5c8bb', 400: '#c38f7b', 500: '#ac7561', 600: '#965d49' },
				sand: { 100: '#f5efe9', 200: '#e9ddd2', 300: '#d8c7ba' },
				danger: '#b42318',
				nude: {
					50: '#fffaf5',
					100: '#fff1e6',
					200: '#fee9d3',
					300: '#fcd5b6',
					400: '#f2c39b',
					500: '#e8b37f',
					600: '#cf9062',
					700: '#b36f4d',
					800: '#8f5239',
					900: '#6f3f2b',
				},
				warm: {
					50: '#f0fdfa',
					100: '#ccfbf1',
					200: '#99f6e4',
					300: '#5eead4',
					400: '#2dd4bf',
					500: '#14b8a6',
					600: '#0d9488',
					700: '#0f766e',
					800: '#115e59',
					900: '#134e4a',
				},
			},
			boxShadow: { soft: '0 18px 55px rgba(56, 43, 39, 0.09)' },
		},
	},
	plugins: [],
}
