/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NISSE_RUNTIME_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
