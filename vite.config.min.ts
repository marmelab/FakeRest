/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'FakeRest',
            // the proper extensions will be added
            fileName: 'fakerest.min',
        },
        minify: true,
        sourcemap: true,
        emptyOutDir: false,
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ['lodash'],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    lodash: '_',
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'happy-dom',
    },
});
