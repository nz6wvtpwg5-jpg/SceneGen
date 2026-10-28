"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResetState = "idle" | "submitting" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const [state, setState] = useState<ResetState>("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [collaborator, setCollaborator] = useState(false);
  const hasValidTokenShape = /^[A-Za-z0-9_-]{32,128}$/.test(token);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    setCollaborator(params.get("audience") === "collaborator");
    setTokenLoaded(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current || state === "success") return;

    if (!hasValidTokenShape) {
      setState("error");
      setMessage("This reset link is incomplete. Please request a new one.");
      return;
    }

    submissionInFlight.current = true;
    setState("submitting");
    setMessage("");
    const password = String(new FormData(event.currentTarget).get("password") || "");

    try {
      const response = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setState("error");
        setMessage(data.error || "We could not update your password. Please try again.");
        return;
      }

      setState("success");
      setMessage(data.message || "Password updated. You can now sign in.");
      window.setTimeout(() => router.replace(collaborator ? "/collaborator-access" : "/login?passwordReset=1"), 900);
    } catch {
      setState("error");
      setMessage("SceneGen could not be reached. Your link has not been used; please try again.");
    } finally {
      submissionInFlight.current = false;
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-bg-primary p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-black/10 p-6">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={!tokenLoaded || !hasValidTokenShape || state === "submitting" || state === "success"}
          placeholder="At least 12 characters"
        />
        {message && (
          <p role={state === "error" ? "alert" : "status"} aria-live="polite">
            {message}
          </p>
        )}
        <Button
          className="w-full"
          type="submit"
          disabled={!tokenLoaded || !hasValidTokenShape || state === "submitting" || state === "success"}
        >
          {state === "submitting" ? "Updating password…" : state === "success" ? "Password updated" : "Update password"}
        </Button>
        {tokenLoaded && !hasValidTokenShape && (
          <Link className="block text-center underline" href={collaborator ? "/forgot-password?audience=collaborator" : "/forgot-password"}>Request a new reset link</Link>
        )}
        <Link className="block text-center underline" href={collaborator ? "/collaborator-access" : "/login"}>Back to sign in</Link>
      </form>
    </main>
  );
}
