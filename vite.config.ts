import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],test:{testTimeout:30000,environment:'node',include:['tests/**/*.test.ts']}});
