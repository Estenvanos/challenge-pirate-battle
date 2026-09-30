/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  /** "true" só no servidor dos testes: instala window.__GAME_TEST__. */
  readonly VITE_GAME_TEST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
