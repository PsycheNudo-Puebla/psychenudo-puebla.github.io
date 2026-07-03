import { defineConfig } from 'vite';
import { resolve } from 'path';

// Multi-page app: cada HTML es un entry point
const entries: Record<string, string> = {
  index: resolve(__dirname, 'index.html'),
  alumno: resolve(__dirname, 'alumno.html'),
  profesor: resolve(__dirname, 'profesor.html'),
};

export default defineConfig({
  // Base relativa para compatibilidad con GitHub Pages
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: entries,
      output: {
        // Nombres legibles, no solo hashes
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
    // Generar sourcemaps para debugging
    sourcemap: true,
  },
  // Servir archivos estáticos desde ./public (crear si se necesitan assets no procesados)
  publicDir: 'public',
  // Excluir node_modules y dist del watch
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/.venv/**', '**/vendor/**'],
    },
  },
});
