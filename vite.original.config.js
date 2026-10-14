import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    base: './',
    plugins: [vue()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    build: {
        outDir: 'dist-original',
        assetsInlineLimit: Infinity,
        cssCodeSplit: false,
        rollupOptions: {
            input: fileURLToPath(new URL('./original.html', import.meta.url)),
            output: { format: 'iife', inlineDynamicImports: true }
        }
    }
});
