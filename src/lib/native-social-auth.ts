import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type NativeSocialProvider = "google" | "apple";
export type VerifiedNativeIdentity = {
  provider: NativeSocialProvider;
  providerAccountId: string;
  email: string;
  name: string | null;
  image: string | null;
};

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

function requiredAudiences(provider: NativeSocialProvider) {
  const values = provider === "google"
    ? [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID]
    : [process.env.APPLE_IOS_CLIENT_ID || "io.scenegen.app"];
  const audiences = values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (!audiences.length) throw new Error(`${provider} native sign-in is not configured`);
  return audiences;
}

function verifiedEmail(payload: JWTPayload) {
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const verified = payload.email_verified === true || payload.email_verified === "true";
  if (!email || !verified) throw new Error("The identity provider did not return a verified email address");
  return email;
}

export async function verifyNativeIdentity(provider: NativeSocialProvider, idToken: string, suppliedName?: string | null): Promise<VerifiedNativeIdentity> {
  if (!idToken || idToken.length > 16000) throw new Error("Invalid identity token");
  const audience = requiredAudiences(provider);
  const { payload } = provider === "google"
    ? await jwtVerify(idToken, googleKeys, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience })
    : await jwtVerify(idToken, appleKeys, { issuer: "https://appleid.apple.com", audience });
  if (!payload.sub) throw new Error("Identity token has no subject");
  const tokenName = typeof payload.name === "string" ? payload.name.trim() : "";
  const name = (suppliedName || tokenName).trim().slice(0, 100) || null;
  const image = provider === "google" && typeof payload.picture === "string" ? payload.picture : null;
  return { provider, providerAccountId: payload.sub, email: verifiedEmail(payload), name, image };
}
