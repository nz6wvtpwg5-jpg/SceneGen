import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

async function call<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getBackendUrl()}/internal/auth/${path}`, {
    method: "POST",
    headers: getBackendHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Authentication service returned ${response.status}`);
  return response.json() as Promise<T>;
}

export type AuthUser = { id: string; email: string; name: string | null; image: string | null; passwordHash?: string | null; emailVerifiedAt?: string | null };
export async function authenticatePassword(email: string, password: string, ip: string) {
  const result = await call<{ user: AuthUser | null }>("login", { email, password, ip }); return result.user;
}
export async function authenticateCollaboratorPassword(email: string, password: string, ip: string) {
  const result = await call<{ user: AuthUser | null }>('collaborator-password-login', { email, password, ip });
  return result.user;
}
export async function resolvePasswordAccess(email: string, password: string, ip: string) {
  return call<{ valid: boolean; member: boolean; collaborator: boolean }>('password-access-options', { email, password, ip });
}
export async function createPasswordUser(input: { email: string; name: string; password: string }) {
  const result = await call<{ userId?: string }>("register", input); return result.userId;
}
export async function upsertSocialUser(input: { provider: "google" | "apple"; providerAccountId: string; email: string; name?: string | null; image?: string | null }) {
  return call<AuthUser>("social", input);
}
export async function upsertGoogleUser(input: { providerAccountId: string; email: string; name?: string | null; image?: string | null }) {
  return upsertSocialUser({ provider: "google", ...input });
}
export async function authenticateDaySheetInvitation(token: string) {
  const result = await call<{ user: AuthUser | null }>('day-sheet-invitation', { token });
  return result.user;
}
export async function findActiveCollaboratorByEmail(email: string) {
  const result = await call<{ user: AuthUser | null }>('active-day-sheet-collaborator', { email });
  return result.user;
}
export async function authenticateCollaboratorLogin(token: string) {
  const result = await call<{ user: AuthUser | null }>('collaborator-login', { token });
  return result.user;
}
export async function authenticateBookingAgentActivation(token: string) {
  const result = await call<{ user: AuthUser | null }>('consume-booking-agent-activation', { token });
  return result.user;
}
export async function findUserByEmail(email: string) {
  const result = await call<{ user: AuthUser | null }>("find", { email }); return result.user;
}
export async function issueToken(userId: string, purpose: "verify_email" | "reset_password" | "collaborator_login" | "registration_status" | "booking_agent_activation", minutes: number) {
  const result = await call<{ token: string }>("issue-token", { userId, purpose, minutes }); return result.token;
}
export async function registrationStatus(token: string) {
  return call<{ status: "pending" | "verified" | "unavailable"; email?: string }>("registration-status", { token });
}
export async function consumeToken(token: string, purpose: "verify_email" | "reset_password" | "collaborator_login") {
  const result = await call<{ userId?: string }>("consume-token", { token, purpose }); return result.userId;
}
export async function verifyEmail(userId: string) { await call("verify-email", { userId }); }
export async function updatePassword(userId: string, password: string) { await call("update-password", { userId, password }); }
export async function setInitialPassword(userId: string, password: string) {
  return call<{ created: boolean }>('set-initial-password', { userId, password });
}
export async function resetPasswordWithToken(token: string, password: string) {
  return call<{ updated: boolean }>("reset-password", { token, password });
}
export async function checkAuthRateLimit(namespace: string, key: string, maxAttempts: number, windowSeconds: number) {
  return (await call<{ allowed: boolean }>('rate-limit', { namespace, key, maxAttempts, windowSeconds })).allowed;
}
