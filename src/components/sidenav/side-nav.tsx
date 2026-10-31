'use client';

import Link from 'next/link';
import { NavItems } from '@/app/config';
import SidebarEntities from './SidebarEntities';

const sectionFor = (href: string) => {
  if (['/dashboard', '/shows', '/show-proposals', '/tours', '/touring'].includes(href)) return 'Plan';
  if (['/contacts', '/messages', '/notifications'].includes(href)) return 'Network';
  return 'Business';
};

export default function SideNav() {
  const navItems = NavItems();
  const topItems = navItems.filter((item) => item.position === 'top');
  const bottomItems = navItems.filter((item) => item.position === 'bottom');
  let previousSection = '';

  return (
    <aside className="hidden h-full w-[264px] shrink-0 flex-col overflow-y-auto border-r border-[#ded8cc] bg-[#e8e2d7] text-[#1b1a17] sm:flex">
      <div className="border-b border-[#d2ccbf] p-4">
        <SidebarEntities />
      </div>

      <nav className="flex-1 px-3 py-5">
        {topItems.map((item) => {
          const section = sectionFor(item.href);
          const showSection = section !== previousSection;
          previousSection = section;
          const count = item.badgeExpanded ?? item.badge;
          return (
            <div key={item.href}>
              {showSection && <p className="mb-2 mt-5 px-3 text-[9px] font-black uppercase tracking-[0.24em] text-[#7f786d] first:mt-0">{section}</p>}
              <Link href={item.href} className={`mb-1 flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[13px] font-bold transition ${item.active ? 'bg-[#171612] text-[#f7f2e8] shadow-[0_8px_20px_rgba(23,22,18,.13)]' : 'text-[#544f47] hover:bg-[#dcd5c8] hover:text-[#171612]'}`}>
                <span className={item.active ? 'text-[#ff6a43]' : 'text-[#7b756b]'}>{item.icon}</span>
                <span className="flex-1">{item.name}</span>
                {count !== undefined && Boolean(count) && <span className={`rounded-full px-2 py-0.5 text-[9px] ${item.active ? 'bg-white/10 text-white/65' : 'bg-[#d6cfc2] text-[#675f55]'}`}>{count}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[#d2ccbf] p-3">
        {bottomItems.map((item) => (
          <Link key={item.href} href={item.href} className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[13px] font-bold transition ${item.active ? 'bg-[#171612] text-white' : 'text-[#544f47] hover:bg-[#dcd5c8] hover:text-[#171612]'}`}>
            <span className={item.active ? 'text-[#ff6a43]' : 'text-[#7b756b]'}>{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
        <div className="mt-3 flex items-center gap-2 px-3 pb-1 pt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#918a7f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4eb879]" /> All systems online
        </div>
      </div>
    </aside>
  );
}
