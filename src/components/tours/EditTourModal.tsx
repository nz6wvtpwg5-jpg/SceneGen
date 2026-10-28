"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarPlus, Check, CircleDollarSign, FileSpreadsheet, Loader2, Pencil, Plus, X } from "lucide-react";

interface EditTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
  tourId: string;
  tourName: string;
}
interface AddShowModalProps { isOpen: boolean; onClose: () => void; tourId: string; tourName: string; }
interface TourActionProps { eyebrow: string; title: string; description: string; icon: ReactNode; accent?: boolean; onClick: () => void; }

function TourAction({ eyebrow, title, description, icon, accent = false, onClick }: TourActionProps) {
  return (
    <button type="button" onClick={onClick} className={`group flex min-h-40 w-full flex-col justify-between rounded-[22px] border p-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a36] focus-visible:ring-offset-2 sm:p-6 ${accent ? "border-[#ff5a36] bg-[#ff5a36] text-white shadow-[0_14px_34px_rgba(255,90,54,0.22)] hover:-translate-y-0.5 hover:bg-[#ef4d2b]" : "border-black/10 bg-white text-[#151713] shadow-[0_8px_24px_rgba(31,27,20,0.06)] hover:-translate-y-0.5 hover:border-[#ff5a36]/50 hover:shadow-[0_14px_32px_rgba(31,27,20,0.1)]"}`}>
      <div className="flex w-full items-start justify-between gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${accent ? "border-white/25 bg-white/15" : "border-[#ff5a36]/25 bg-[#fff0ea] text-[#ff5a36]"}`}>{icon}</span>
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
      <div className="mt-7">
        <p className={`mb-2 text-[11px] font-bold uppercase tracking-[0.2em] ${accent ? "text-white/70" : "text-[#ff5a36]"}`}>{eyebrow}</p>
        <h3 className="text-xl font-bold tracking-[-0.02em]">{title}</h3>
        <p className={`mt-2 text-sm leading-6 ${accent ? "text-white/80" : "text-[#66695f]"}`}>{description}</p>
      </div>
    </button>
  );
}

function AddShowModal({ isOpen, onClose, tourId, tourName }: AddShowModalProps) {
  const router = useRouter();
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const handleConfirm = () => {
    router.push(`/import?tourId=${tourId}&tourName=${encodeURIComponent(tourName)}&mode=add-single-show`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#151713]/70 p-4 backdrop-blur-[6px]" onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-show-title" className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/30 bg-[#fbf8f1] text-[#151713] shadow-[0_32px_100px_rgba(0,0,0,0.42)]">
        <header className="flex items-start justify-between gap-5 border-b border-black/10 px-6 py-6 sm:px-8">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff5a36]">Schedule</p>
            <h2 id="add-show-title" className="text-2xl font-bold tracking-[-0.03em]">Add one show</h2>
            <p className="mt-2 text-sm text-[#66695f]">Add a new date directly to <strong className="text-[#151713]">{tourName}</strong>.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-black/10 p-2.5 hover:bg-black/5" aria-label="Close modal"><X className="h-5 w-5" /></button>
        </header>
        <div className="px-6 py-6 sm:px-8">
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eff5d6] text-[#779400]"><CalendarPlus className="h-5 w-5" /></span>
              <div><h3 className="font-bold">Ready for the road</h3><p className="mt-1 text-sm leading-6 text-[#66695f]">You’ll add the date, venue, timings and fee next. SceneGen will create the show budget using this tour’s structure.</p></div>
            </div>
          </div>
        </div>
        <footer className="flex flex-col-reverse gap-3 border-t border-black/10 bg-[#f3ede2] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={onClose} className="rounded-full border border-black/15 px-6 py-3 text-sm font-bold hover:bg-white">Back</button>
          <button type="button" onClick={handleConfirm} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,90,54,0.2)] hover:bg-[#ef4d2b]">Add show <ArrowRight className="h-4 w-4" /></button>
        </footer>
      </section>
    </div>
  );
}

export default function EditTourModal({ isOpen, onClose, onRename, tourId, tourName }: EditTourModalProps) {
  const router = useRouter();
  const [showAddShowModal, setShowAddShowModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [draftName, setDraftName] = useState(tourName);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDraftName(tourName);
    setIsRenaming(false);
    setNameError("");
  }, [isOpen, tourName]);

  useEffect(() => {
    if (!isOpen || showAddShowModal || isRenaming) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, isRenaming, onClose, showAddShowModal]);
  if (!isOpen) return null;

  const navigate = (path: string) => { router.push(path); onClose(); };
  const cancelRename = () => {
    setDraftName(tourName);
    setNameError("");
    setIsRenaming(false);
  };
  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName) {
      setNameError("Enter a tour name.");
      return;
    }
    if (nextName === tourName) {
      cancelRename();
      return;
    }
    setIsSavingName(true);
    setNameError("");
    try {
      await onRename(nextName);
      setIsRenaming(false);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "The tour name could not be saved.");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#151713]/70 p-4 backdrop-blur-[6px] sm:p-8" onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-tour-title" className="my-auto w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/30 bg-[#f2ede3] text-[#151713] shadow-[0_32px_100px_rgba(0,0,0,0.48)]">
        <header className="flex items-start justify-between gap-5 border-b border-black/10 px-6 py-6 sm:px-8 sm:py-7">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff5a36]">Tour workspace</p>
            <h2 id="edit-tour-title" className="text-3xl font-bold tracking-[-0.04em]">What would you like to change?</h2>
            <p className="mt-2 text-sm text-[#66695f]">Choose an action for <strong className="text-[#151713]">{tourName}</strong>.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-black/10 bg-white/60 p-2.5 hover:bg-white" aria-label="Close modal"><X className="h-5 w-5" /></button>
        </header>
        <div className="p-5 sm:p-8">
          <div className="mb-5 rounded-[22px] border border-black/10 bg-[#fbf8f1] p-5 shadow-[0_8px_24px_rgba(31,27,20,0.05)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff5a36]">Tour name</p>
                {isRenaming ? (
                  <div>
                    <input
                      autoFocus
                      type="text"
                      value={draftName}
                      onChange={(event) => { setDraftName(event.target.value); setNameError(""); }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveName();
                        if (event.key === "Escape") cancelRename();
                      }}
                      aria-label="Tour name"
                      aria-invalid={Boolean(nameError)}
                      className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-xl font-bold tracking-[-0.02em] outline-none transition focus:border-[#ff5a36] focus:ring-4 focus:ring-[#ff5a36]/10"
                    />
                    {nameError && <p className="mt-2 text-sm font-semibold text-[#c63c23]">{nameError}</p>}
                  </div>
                ) : (
                  <p className="truncate text-2xl font-bold tracking-[-0.03em]">{tourName}</p>
                )}
              </div>
              {isRenaming ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={cancelRename} disabled={isSavingName} className="rounded-full border border-black/15 px-4 py-2.5 text-sm font-bold hover:bg-black/5 disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={() => void saveName()} disabled={isSavingName} className="inline-flex items-center gap-2 rounded-full bg-[#ff5a36] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ef4d2b] disabled:opacity-60">
                    {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {isSavingName ? "Saving" : "Save name"}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setIsRenaming(true)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:border-[#ff5a36]/50 hover:text-[#ff5a36]">
                  <Pencil className="h-4 w-4" /> Rename
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TourAction eyebrow="Bulk schedule" title="Import CSV" description="Add several dates and carry their budgets into this tour." icon={<FileSpreadsheet className="h-5 w-5" />} accent onClick={() => navigate(`/import?tourId=${tourId}&tourName=${encodeURIComponent(tourName)}`)} />
            <TourAction eyebrow="One new date" title="Add a show" description="Enter one show manually, including timings, venue and fee." icon={<Plus className="h-5 w-5" />} onClick={() => setShowAddShowModal(true)} />
            <TourAction eyebrow="Financials" title="Tour budget" description="Review and manage the budget across the whole tour." icon={<CircleDollarSign className="h-5 w-5" />} onClick={() => navigate(`/bookkeeping?tourId=${tourId}&tourName=${encodeURIComponent(tourName)}`)} />
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-black/10 bg-[#e9e2d6] px-6 py-4 sm:px-8">
          <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[#85887f] sm:block">Changes stay within this tour</p>
          <button type="button" onClick={onClose} className="w-full rounded-full border border-black/15 bg-[#fbf8f1] px-6 py-2.5 text-sm font-bold hover:bg-white sm:w-auto">Done</button>
        </footer>
      </section>
      {showAddShowModal && <AddShowModal isOpen={showAddShowModal} onClose={() => setShowAddShowModal(false)} tourId={tourId} tourName={tourName} />}
    </div>
  );
}
