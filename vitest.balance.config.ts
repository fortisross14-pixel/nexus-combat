import {defineConfig} from 'vitest/config';
/** Slow, statistical balance checks: `npm run balance`. Kept out of the regular test run. */
export default defineConfig({test:{testTimeout:900000,environment:'node',include:['tests/balance/**/*.balance.ts']}});
