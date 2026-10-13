import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// Relative asset paths: the same build works on GitHub Pages (served from /<repo-name>/) and on Vercel (served from /).
export default defineConfig({base:'./',plugins:[react()],test:{testTimeout:30000,environment:'node',include:['tests/**/*.test.ts']}});
