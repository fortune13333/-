import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Fix: Import 'process' to provide the correct types for process.cwd().
import process from 'process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use process.cwd() directly. It's globally available in the Node.js environment
  // where the Vite config runs, and `require()` is not supported in an ESM context.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Expose environment variables to the client
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_ANALYSIS_API_URL': JSON.stringify(env.VITE_ANALYSIS_API_URL),
      'process.env.VITE_COMMAND_GENERATION_API_URL': JSON.stringify(env.VITE_COMMAND_GENERATION_API_URL),
      'process.env.VITE_CONFIG_CHECK_API_URL': JSON.stringify(env.VITE_CONFIG_CHECK_API_URL),
    },
    resolve: {
      alias: {
        // FIX: Use `process.cwd()` instead of `__dirname` to resolve path in an ES module context.
        '@': path.resolve(process.cwd(), './src'),
      },
    },
  };
});