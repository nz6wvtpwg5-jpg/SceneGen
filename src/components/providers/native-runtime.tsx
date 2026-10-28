'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';

export function NativeRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.dataset.nativeApp = Capacitor.getPlatform();
    void StatusBar.setStyle({ style: Style.Light });
    void StatusBar.setBackgroundColor({ color: '#11140f' });
    void StatusBar.setOverlaysWebView({ overlay: false });

    const openExternalLink = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a') : null;
      if (!(target instanceof HTMLAnchorElement)) return;

      const url = new URL(target.href, window.location.href);
      const external = url.origin !== window.location.origin;
      if (!external) {
        if (target.target === '_blank') {
          event.preventDefault();
          window.location.assign(url.toString());
        }
        return;
      }
      if (!['http:', 'https:'].includes(url.protocol)) return;

      event.preventDefault();
      void Browser.open({ url: url.toString(), presentationStyle: 'popover' });
    };

    document.addEventListener('click', openExternalLink);
    return () => document.removeEventListener('click', openExternalLink);
  }, []);

  return null;
}
