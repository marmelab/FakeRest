/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_MOCK: 'msw' | 'fetch-mock';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
