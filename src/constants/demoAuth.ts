/** Local demo sign-in (no backend). Use only for UI testing. */
export const DEMO_USERNAME = 'admin';
export const DEMO_PASSWORD = 'pass1234';
/** Opaque token — not a real JWT; satisfies “has session” checks. */
export const DEMO_ACCESS_TOKEN = 'morpheus-demo-access-token';

export function isDemoCredentials(login: string, password: string): boolean {
  return login.trim().toLowerCase() === DEMO_USERNAME.toLowerCase() && password === DEMO_PASSWORD;
}
