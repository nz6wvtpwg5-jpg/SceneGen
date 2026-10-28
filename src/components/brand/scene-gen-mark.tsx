import { cn } from '@/lib/utils';

export function SceneGenMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#ff5a36] text-white', className)} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 14h7.5L29 24h7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 34h7.5L29 24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="14" r="3" fill="currentColor" />
        <circle cx="12" cy="34" r="3" fill="currentColor" />
        <circle cx="36" cy="24" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}

export function SceneGenWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <SceneGenMark className={compact ? 'h-9 w-9' : undefined} />
      <span className="leading-none">
        <span className="block text-[15px] font-black uppercase tracking-[0.12em] text-[#f6f1e7]">SceneGen</span>
        {!compact && <span className="mt-1.5 block text-[8px] font-semibold uppercase tracking-[0.3em] text-white/40">Live operations</span>}
      </span>
    </span>
  );
}
