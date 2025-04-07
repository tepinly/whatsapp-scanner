import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	build: {
		outDir: 'dist',
		rollupOptions: {
			input: {
				background: './src/background.ts',
				content: './src/content.ts',
				main: './src/main.tsx',
				App: './src/App.tsx',
				styles: './src/styles.css',
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js',
				assetFileNames: '[name].[ext]',
			},
		},
	},
	plugins: [tailwindcss()],
})
