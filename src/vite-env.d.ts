/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Legacy CRA-style; optional fallback if ever set in env */
  readonly REACT_APP_API_URL?: string;
  /** Set to `false` in `.env.development.local` to require login in dev */
  readonly VITE_SKIP_PROTECTED_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
