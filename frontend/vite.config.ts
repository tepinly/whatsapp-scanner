import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		outDir: 'dist',
		rollupOptions: {
			input: {
				background: './src/background.ts',
				content: './src/content.ts',
			},
			output: {
				entryFileNames: 'assets/[name].js',
				chunkFileNames: 'assets/[name].js',
				assetFileNames: 'assets/[name].[ext]',
			},
		},
	},
	plugins: [],
})
