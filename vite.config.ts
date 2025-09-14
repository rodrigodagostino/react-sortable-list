import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), cssInjectedByJsPlugin(), dts({ tsconfigPath: './tsconfig.app.json' })],
	build: {
		lib: {
			entry: ['src/lib/index.ts'],
			name: 'SortableList',
		},
		rollupOptions: {
			external: ['react', 'react-dom'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
				},
			},
		},
	},
	css: {
		modules: {
			generateScopedName: '[local]_[hash:base64:5]',
		},
	},
});
