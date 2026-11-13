// NEXT_PUBLIC_ values are public and inlined at build time. Never put secrets here.
// Used by the Axios client. Preview pages do not call the backend.
export const publicEnv = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
} as const;
