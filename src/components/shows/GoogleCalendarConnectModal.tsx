"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { SceneGenMark } from "@/components/brand/scene-gen-mark";

interface GoogleCalendarConnectModalProps { onClose: () => void; }

const permissions = [
  "View calendar events used for your schedule",
  "Create and update events when show details change",
  "Remove an event when you explicitly unsync it",
];

export default function GoogleCalendarConnectModal({ onClose }: GoogleCalendarConnectModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    if (Capacitor.isNativePlatform()) {
      toast.error("Google Calendar connection is not available in the iPhone app yet. Connect it from the SceneGen website.");
      return;
    }
    setIsConnecting(true);
    try {
      window.location.assign("/api/calendar/connect");
    } catch (error) {
      console.error("Failed to initiate Google Calendar connection:", error);
      toast.error("Google Calendar could not be opened. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    sessionStorage.setItem("google-calendar-prompt-dismissed", "true");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#080a09]/80 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && handleClose()}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="calendar-connect-title" className="relative grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-black/10 bg-[#f2eee4] text-[#161815] shadow-[0_32px_100px_rgba(0,0,0,0.55)] md:grid-cols-[0.82fr_1.18fr]">
        <button type="button" onClick={handleClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white/70 text-[#252822] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5a36]" aria-label="Close calendar connection">
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden bg-[#10130f] p-8 text-[#f7f2e8] md:min-h-[560px] md:p-10">
          <div className="absolute -right-24 top-16 h-64 w-64 rounded-full border border-[#ff5a36]/25" />
          <div className="absolute -right-10 top-28 h-40 w-40 rounded-full border border-[#c8f135]/20" />
          <div className="absolute bottom-0 left-0 h-40 w-full bg-[linear-gradient(135deg,transparent_45%,rgba(255,90,54,0.12)_45%,rgba(255,90,54,0.12)_46%,transparent_46%)]" />
          <div className="relative flex items-center gap-3">
            <SceneGenMark className="h-11 w-11" />
            <div><p className="text-sm font-black uppercase tracking-[0.16em]">SceneGen</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-text-muted">Schedule connection</p></div>
          </div>
          <div className="relative mt-16 md:mt-0">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c8f135]"><span className="h-1.5 w-1.5 rounded-full bg-[#c8f135] shadow-[0_0_12px_#c8f135]" />Your calendar, in context</p>
            <p className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-5xl">Put every date where the work happens.</p>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/55">Keep confirmed shows and calendar events aligned without giving SceneGen access to the rest of your Google account.</p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-7 sm:p-10 md:p-12">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ff5a36]/20 bg-[#ff5a36]/10 text-[#e24425]"><CalendarDays className="h-6 w-6" /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#e24425]">Optional connection</p>
          <h2 id="calendar-connect-title" className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Connect Google Calendar</h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#64685f]">Google will ask you to choose an account and approve calendar-event access. You stay in control and can disconnect later.</p>

          <div className="my-8 border-y border-black/10 py-6">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#777b72]">SceneGen will be able to</p>
            <ul className="space-y-3">
              {permissions.map((permission) => (
                <li key={permission} className="flex items-start gap-3 text-sm font-medium text-[#292c27]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#dfe9bd] text-[#42520e]"><Check className="h-3 w-3" strokeWidth={3} /></span>{permission}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-8 flex items-start gap-3 rounded-2xl bg-[#e7e2d7] p-4 text-xs leading-5 text-[#595d55]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#272b25]" />
            <p><strong className="text-[#272b25]">No Gmail, Drive or Google Contacts access.</strong> This connection is separate from the Google account you use to sign in to SceneGen.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleConnect} disabled={isConnecting} className="group inline-flex min-h-12 flex-1 items-center justify-center gap-3 rounded-full bg-[#ff5a36] px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(255,90,54,0.24)] transition hover:bg-[#ef4927] focus:outline-none focus:ring-2 focus:ring-[#ff5a36] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}{isConnecting ? "Opening Google…" : "Continue to Google"}
            </button>
            <button type="button" onClick={handleClose} className="min-h-12 rounded-full border border-black/15 px-6 text-sm font-bold text-[#292c27] transition hover:border-black/30 hover:bg-white/600 focus:outline-none focus:ring-2 focus:ring-[#ff5a36]">Not now</button>
          </div>
        </div>
      </section>
    </div>
  );
}
