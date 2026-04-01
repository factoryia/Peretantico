/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_DETERMINISTIC_REQUESTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
