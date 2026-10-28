'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
};

type ConfirmDialog = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmDialog | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOptions(null);
    resolve?.(confirmed);
  }, []);

  const confirm = useCallback<ConfirmDialog>((nextOptions) => {
    resolver.current?.(false);
    return new Promise((resolve) => {
      resolver.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(options)} onOpenChange={(open) => { if (!open) finish(false); }}>
        <DialogContent className="max-w-md" onEscapeKeyDown={() => finish(false)}>
          <DialogHeader>
            {options?.tone === 'destructive' && <AlertTriangle className="mb-2 h-7 w-7 text-[#c43d27]" aria-hidden="true" />}
            <DialogTitle>{options?.title}</DialogTitle>
            <DialogDescription>{options?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <button type="button" onClick={() => finish(false)} className="min-h-11 rounded-md border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[#ff5a36]/50">
              {options?.cancelLabel || 'Cancel'}
            </button>
            <button type="button" onClick={() => finish(true)} className={`min-h-11 rounded-md px-5 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${options?.tone === 'destructive' ? 'bg-[#c43d27] hover:bg-[#a83220] focus:ring-[#c43d27]/50' : 'bg-[#151713] hover:bg-black focus:ring-black/40'}`}>
              {options?.confirmLabel || 'Confirm'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  return confirm;
}
