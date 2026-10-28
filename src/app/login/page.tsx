"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import Link from "next/link";
import { ArrowRight, Check, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { SceneGenWordmark } from "@/components/brand/scene-gen-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleStarting, setGoogleStarting] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  const [accessChoice, setAccessChoice] = useState<{ email: string; password: string } | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");
  const [nativeAuthReady, setNativeAuthReady] = useState({ apple: false, google: false });
  const nativePlatform = Capacitor.isNativePlatform();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "register") {
      setMode("register");
    }
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (authError) {
      setMessage(authError === "Configuration" || authError === "OAuthCallback" || authError === "CallbackRouteError"
        ? "Google sign-in could not be completed. Please start a fresh sign-in here. Your SceneGen records are unchanged."
        : "Sign-in did not finish. Please try again.");
      window.history.replaceState(null, "", window.location.pathname + (params.get("callbackUrl") ? "?callbackUrl=" + encodeURIComponent(params.get("callbackUrl") || "") : ""));
    }
    const requested = new URLSearchParams(window.location.search).get("callbackUrl") || "";
    if (requested.startsWith("/") && !requested.startsWith("//")) setCallbackUrl(requested);
  }, []);

  useEffect(() => {
    if (!nativePlatform) return;
    const googleIosClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
    const googleWebClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID?.trim() || "io.scenegen.app";
    const googleConfigured = Boolean(googleIosClientId && googleWebClientId);
    void SocialLogin.initialize({
      ...(googleConfigured ? { google: { iOSClientId: googleIosClientId, iOSServerClientId: googleWebClientId, webClientId: googleWebClientId, mode: "online" as const } } : {}),
      apple: { clientId: appleClientId },
    }).then(() => {
      setNativeAuthReady({ apple: true, google: googleConfigured });
      if (!googleConfigured) setMessage("Google sign-in still needs its iOS and Web client IDs. Apple and email sign-in are available.");
    }).catch(() => setMessage("Native sign-in could not be prepared. You can still use email and password."));
  }, [nativePlatform]);

  async function startWebGoogleSignIn() {
    if (googleStarting || busy) return;
    setGoogleStarting(true);
    setMessage("");
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setGoogleStarting(false);
      setMessage("Could not start Google sign-in. Please try again or use email and password.");
    }
  }

  async function nativeSocialSignIn(provider: "google" | "apple") {
    setBusy(true); setMessage("");
    try {
      const response = await SocialLogin.login({ provider, options: { scopes: provider === "apple" ? ["email", "name"] : ["email", "profile"] } });
      const result = response.result as { idToken?: string | null; profile?: { name?: string | null; givenName?: string | null; familyName?: string | null } | null };
      const idToken = result.idToken;
      if (!idToken) throw new Error("The provider did not return an identity token");
      const name = result.profile?.name || [result.profile?.givenName, result.profile?.familyName].filter(Boolean).join(" ");
      const signedIn = await signIn("native-social", { provider, idToken, name, redirect: false });
      if (signedIn?.error) throw new Error("SceneGen could not open a session for this account");
      window.location.assign(callbackUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${provider === "apple" ? "Apple" : "Google"} sign-in failed. Please try again.`);
      setBusy(false);
    }
  }

  const checkVerification = useCallback(async () => {
    try {
      const response = await fetch("/api/account/registration-status", { cache: "no-store" });
      const data = await response.json();
      if (data.status === "verified") {
        setEmailDraft(data.email || emailDraft);
        setWaitingForVerification(false);
        setMode("login");
        setMessage("Email verified. Sign in with the password you created.");
        window.history.replaceState(null, "", "/login");
      } else if (data.status === "unavailable") {
        setWaitingForVerification(false);
        setMode("login");
        setMessage("Verification status is unavailable. Use the email link, then sign in with the password you created.");
      }
    } catch {
      // Keep waiting through transient network errors; focus or manual checks retry.
    }
  }, [emailDraft]);

  useEffect(() => {
    if (!waitingForVerification) return;
    const check = () => { if (document.visibilityState === "visible") void checkVerification(); };
    check();
    const interval = window.setInterval(check, 3000);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", check); };
  }, [checkVerification, waitingForVerification]);

  async function collaboratorSignIn(email: string, password: string) {
    const basePath = "/api/collaborator-auth";
    const csrfResponse = await fetch(`${basePath}/csrf`, { cache: "no-store" });
    const { csrfToken } = await csrfResponse.json();
    if (!csrfResponse.ok || !csrfToken) return false;
    const response = await fetch(`${basePath}/callback/collaborator-credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
      body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${window.location.origin}/external-day-sheets` }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url || new URL(data.url, window.location.origin).searchParams.has("error")) return false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const session = await fetch(`${basePath}/session`, { cache: "no-store" });
      if (session.ok && (await session.json())?.user?.id) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
    return false;
  }

  async function openMemberAccess(credentials: { email: string; password: string }) {
    setBusy(true); setMessage("");
    const result = await signIn("credentials", { ...credentials, redirect: false });
    if (result?.error) setMessage("The email or password is incorrect, or the email has not been verified.");
    else window.location.assign(callbackUrl);
    setBusy(false);
  }

  async function openCollaboratorAccess(credentials: { email: string; password: string }) {
    setBusy(true); setMessage("");
    try {
      if (await collaboratorSignIn(credentials.email, credentials.password)) {
        window.location.assign("/external-day-sheets");
        return;
      }
      setMessage("Your login was accepted, but the day-sheet session could not be opened. Please try again.");
    } catch { setMessage("Sign-in is temporarily unavailable. Please try again."); }
    setBusy(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "register") {
      const response = await fetch("/api/account/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      setMessage(data.message || data.error || "Unable to register.");
      if (response.ok) {
        setEmailDraft(String(values.email || ""));
        setWaitingForVerification(true);
      }
    } else {
      const credentials = { email: String(values.email || "").trim().toLowerCase(), password: String(values.password || "") };
      try {
        const response = await fetch("/api/account/access-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) });
        const access = await response.json();
        if (!response.ok) setMessage(access.error || "Sign-in is temporarily unavailable.");
        else if (!access.valid) setMessage("The email or password is incorrect, or the email has not been verified.");
        else if (access.member && access.collaborator) { setAccessChoice(credentials); setMessage(""); }
        else if (access.collaborator) { await openCollaboratorAccess(credentials); return; }
        else { await openMemberAccess(credentials); return; }
      } catch { setMessage("Sign-in is temporarily unavailable. Please try again."); }
    }
    setBusy(false);
  }

  return (
    <main className="mobile-safe-top mobile-safe-bottom grid min-h-[100dvh] bg-[#f2ede3] lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-[#11140f] p-12 text-[#f7f2e8] lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full border-[70px] border-[#ff5a36]/15" />
        <SceneGenWordmark />
        <div className="relative max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff7756]">The live operations workspace</p>
          <h1 className="mt-6 text-6xl font-black leading-[0.94] tracking-[-0.06em] xl:text-7xl">The whole show.<br />One working record.</h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/55">Dates, people, routes and money kept in agreement for artists, agents and promoters.</p>
        </div>
        <div className="relative grid grid-cols-3 gap-px border border-white/10 bg-white/10">
          {["Plan the run", "Move the team", "Close the numbers"].map((item) => <div key={item} className="flex items-center gap-2 bg-[#11140f] p-4 text-xs font-bold"><Check className="h-4 w-4 text-[#c8f135]" />{item}</div>)}
        </div>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10 lg:p-14">
        <div className="w-full max-w-md">
          <div className="mb-10 inline-flex rounded-2xl bg-[#11140f] p-3 lg:hidden"><SceneGenWordmark /></div>
          <p className="scene-kicker">Secure workspace access</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#151713]">{mode === "login" ? "Welcome back." : "Open your desk."}</h2>
          <p className="mt-3 text-sm leading-6 text-[#696d64]">{mode === "login" ? "Sign in to continue where the work left off." : "Create the account that controls your SceneGen workspaces."}</p>

          {!nativePlatform && <><Button type="button" className="mt-8 w-full" variant="outline" disabled={googleStarting || busy} onClick={() => void startWebGoogleSignIn()}>Continue with Google <ArrowRight className="ml-2 h-4 w-4" /></Button><div className="my-7 flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#8b8e85]"><span className="h-px flex-1 bg-black/10" />or use email<span className="h-px flex-1 bg-black/10" /></div></>}
          {nativePlatform && mode === "login" && <><div className="mt-8 grid gap-3"><Button type="button" className="w-full bg-black text-white hover:bg-black/85" disabled={busy || !nativeAuthReady.apple} onClick={() => void nativeSocialSignIn("apple")}>Sign in with Apple</Button><Button type="button" className="w-full" variant="outline" disabled={busy || !nativeAuthReady.google} onClick={() => void nativeSocialSignIn("google")}>Continue with Google <ArrowRight className="ml-2 h-4 w-4" /></Button></div><div className="my-7 flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#8b8e85]"><span className="h-px flex-1 bg-black/10" />or use email<span className="h-px flex-1 bg-black/10" /></div></>}

          <div className="mb-6 grid grid-cols-2 rounded-full bg-[#e4ddd1] p-1">
            <button type="button" aria-pressed={mode === "login"} className={`min-h-10 rounded-full text-sm font-bold transition ${mode === "login" ? "bg-[#11140f] text-[#f7f2e8]" : "text-[#666a61]"}`} onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button>
            <button type="button" aria-pressed={mode === "register"} className={`min-h-10 rounded-full text-sm font-bold transition ${mode === "register" ? "bg-[#11140f] text-[#f7f2e8]" : "text-[#666a61]"}`} onClick={() => { setMode("register"); setMessage(""); }}>Create account</button>
          </div>

          {accessChoice ? <section className="mt-8 rounded-2xl border border-black/10 bg-[#fffaf2] p-6" aria-live="polite"><p className="scene-kicker">Choose where to continue</p><h3 className="mt-3 text-2xl font-black">You have two SceneGen views.</h3><p className="mt-2 text-sm leading-6 text-[#666a61]">Open your own workspace, or the day sheets another workspace has shared with you.</p>{message && <p role="status" className="mt-4 rounded-xl bg-[#e5ded2] p-3 text-sm text-[#555950]">{message}</p>}<div className="mt-6 grid gap-3"><Button type="button" disabled={busy} onClick={() => void openMemberAccess(accessChoice)}>Open my workspace</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void openCollaboratorAccess(accessChoice)}>Open assigned day sheets</Button><button type="button" className="min-h-11 text-sm font-bold text-[#666a61] underline" onClick={() => { setAccessChoice(null); setMessage(""); }}>Use another account</button></div></section> : waitingForVerification ? <section className="mt-8 rounded-2xl border border-black/10 bg-[#fffaf2] p-6 text-center" aria-live="polite">
            <MailCheck className="mx-auto h-10 w-10 text-[#e54525]" />
            <h3 className="mt-4 text-2xl font-black">Check your email</h3>
            <p className="mt-2 text-sm leading-6 text-[#666a61]">We sent a verification link to <strong className="text-[#151713]">{emailDraft}</strong>. This page will update when you verify it on this phone or another device.</p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-[#666a61]"><RefreshCw className="h-4 w-4 animate-spin" /> Waiting for verification…</div>
            <Button type="button" className="mt-6 w-full" onClick={() => void checkVerification()}>I’ve verified my email</Button>
            <div className="mt-4 flex justify-center gap-4 text-xs font-semibold"><Link className="text-[#666a61] underline" href={`/resend-verification?email=${encodeURIComponent(emailDraft)}`}>Resend email</Link><button type="button" className="text-[#666a61] underline" onClick={() => { setWaitingForVerification(false); setMessage(""); }}>Change email</button></div>
          </section> : <form onSubmit={submit} className="space-y-4">
            {mode === "register" && <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" required minLength={2} /></div>}
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={12} maxLength={128} /></div>
            {message && <p role="status" className="rounded-xl bg-[#e5ded2] p-3 text-sm text-[#555950]">{message}</p>}
            <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
          </form>}
          {!accessChoice && !waitingForVerification && mode === "login" && <div className="mt-5 flex flex-wrap justify-center gap-4 text-center text-xs font-semibold text-[#666a61]"><Link className="hover:text-[#e54525]" href="/forgot-password">Forgot password?</Link><Link className="hover:text-[#e54525]" href="/resend-verification">Resend verification</Link></div>}
          <div className="mt-8 flex items-start gap-2 border-t border-black/10 pt-5 text-xs leading-5 text-[#777b72]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Apple and Google provide a verified identity only. Calendar access is always connected separately.</div>
        </div>
      </section>
    </main>
  );
}
