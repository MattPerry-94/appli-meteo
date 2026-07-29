/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_METEOFRANCE_API_KEY?: string;
  readonly VITE_METEOFRANCE_BASE_URL?: string;
  readonly VITE_WINDY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
