"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Artist = { id: string; name: string; alias?: string | null };
type Context = { application: string; scope: string; artists: Artist[] };

function OAuthAuthorizeContent() {
  const search = useSearchParams();
  const query = useMemo(() => search.toString(), [search]);
  const request = useMemo(() => Object.fromEntries(new URLSearchParams(query)), [query]);
  const [context, setContext] = useState<Context | null>(null);
  const [artistId, setArtistId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/oauth/scenegen/context?${query}`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json() }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (!ok) setMessage(body.error === "server_error" ? "The Droptune connection is not configured yet." : "This connection request is invalid or has expired.");
        else {
          setContext(body);
          if (body.artists.length === 1) setArtistId(body.artists[0].id);
        }
      })
      .catch(() => active && setMessage("SceneGen could not load this connection request."))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [query]);

  async function approve() {
    if (!artistId) return setMessage("Choose the artist you want to connect.");
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/oauth/scenegen/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, entityId: artistId }),
      });
      const body = await response.json();
      if (!response.ok || !body.redirect) throw new Error(body.error || "Approval failed");
      window.location.assign(body.redirect);
    } catch { setMessage("The connection could not be approved. Please try again."); setBusy(false); }
  }

  function cancel() {
    const redirectUri = request.redirect_uri;
    if (!redirectUri) return window.location.assign("/dashboard");
    try {
      const redirect = new URL(redirectUri);
      redirect.searchParams.set("error", "access_denied");
      if (request.state) redirect.searchParams.set("state", request.state);
      window.location.assign(redirect.toString());
    } catch { window.location.assign("/dashboard"); }
  }

  return <main className="mobile-safe-top mobile-safe-bottom min-h-[100dvh] bg-[#f2ede3] px-5 py-10 text-[#151713] sm:px-8">
    <div className="mx-auto max-w-2xl">
      <div className="inline-flex rounded-2xl bg-[#11140f] px-4 py-3 text-sm font-black tracking-[0.12em] text-[#f7f2e8]">SCENEGEN</div>
      <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-[#fffaf2] shadow-xl shadow-black/5">
        <header className="border-b border-black/10 bg-[#11140f] p-7 text-[#f7f2e8] sm:p-9">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#c8f135]">Secure connection</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">Connect SceneGen to Droptune</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Choose which artist may share its public show calendar.</p>
        </header>
        <div className="space-y-7 p-7 sm:p-9">
          {busy && !context ? <p>Checking the connection request...</p> : message && !context ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">{message}</p> : context ? <>
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#696d64]">Choose an artist</p><div className="mt-3 grid gap-3">{context.artists.map((artist) => <button key={artist.id} type="button" onClick={() => setArtistId(artist.id)} className={`flex min-h-16 items-center justify-between rounded-2xl border p-4 text-left transition ${artistId === artist.id ? "border-[#e54525] bg-[#fff0e9]" : "border-black/10 bg-white"}`}><span><strong className="block">{artist.name}</strong>{artist.alias && <small className="text-[#696d64]">{artist.alias}</small>}</span>{artistId === artist.id && <Check className="h-5 w-5 text-[#e54525]" />}</button>)}</div>{!context.artists.length && <p className="mt-3 text-sm text-[#696d64]">You need to own or administer an artist workspace before it can be connected.</p>}</div>
            <div className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-[#e54525]"/><div><strong>Droptune will be able to read</strong><p className="mt-1 text-sm leading-6 text-[#696d64]">Upcoming show dates, public times, venues, locations, festival names and show status for the selected artist.</p></div></div><div className="mt-4 flex gap-3 border-t border-black/10 pt-4"><ShieldCheck className="mt-0.5 h-5 w-5 text-[#4f6b28]"/><div><strong>Private operations stay private</strong><p className="mt-1 text-sm leading-6 text-[#696d64]">Fees, contacts, notes, travel, hotels, day sheets, documents and financial information are never shared.</p></div></div></div>
            {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={cancel} disabled={busy}>Cancel</Button><Button type="button" onClick={() => void approve()} disabled={busy || !artistId}>Connect artist <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </> : null}
        </div>
      </section>
    </div>
  </main>;
}

export default function OAuthAuthorizePage() {
  return <Suspense fallback={<main className="min-h-[100dvh] bg-[#f2ede3] p-10">Loading secure connection...</main>}><OAuthAuthorizeContent /></Suspense>;
}
