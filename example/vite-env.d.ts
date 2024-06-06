/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_MOCK: 'msw' | 'fetch-mock' | 'sinon';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
