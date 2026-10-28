import { BellRing, Check, CircleDollarSign, Files, LockKeyhole, Plane, UserCheck } from 'lucide-react';

const safeguards = [
  { title: 'Permission-aware by design', copy: 'Collaborators see only the tours, countries or shows you assign, and only the fields they are allowed to use.', icon: LockKeyhole },
  { title: 'Changes stay accountable', copy: 'Important updates, acknowledgements and approvals stay attached to the live record instead of disappearing into chat.', icon: UserCheck },
  { title: 'Finance stays controlled', copy: 'Fees and settlements respect financial permissions, while totals in different currencies remain separate.', icon: CircleDollarSign },
];

export function LandingProof() {
  return <>
    <section className="border-b border-black/10 bg-[#e9e2d6] px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff5a36]">From overview to detail</p><h2 className="mt-5 text-4xl font-black leading-[0.95] sm:text-5xl">See what needs attention before it becomes a problem.</h2></div><p className="max-w-2xl text-base leading-8 text-[#62665d] lg:justify-self-end">SceneGen surfaces missing, changed and financially important information around each show, then keeps the supporting detail one click away.</p></div>

        <div className="mt-12 grid overflow-hidden rounded-lg border border-black/10 bg-[#fbf8f1] lg:grid-cols-[1.2fr_0.8fr]" aria-label="SceneGen tour health preview">
          <div className="border-b border-black/10 lg:border-b-0 lg:border-r"><div className="flex flex-col gap-4 border-b border-black/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/45">Tour health</p><h3 className="mt-2 text-2xl font-black">European support tour</h3></div><span className="w-fit rounded-full bg-[#11140f] px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white">16 upcoming dates</span></div>
            <div className="grid divide-y divide-black/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">{[['14', 'Road ready', '#718b08'], ['2', 'Need attention', '#b26a1b'], ['3', 'New updates', '#ff5a36']].map(([value, label, colour]) => <div key={label} className="p-6 sm:p-7"><span aria-hidden="true" className="block h-2 w-2 rounded-full" style={{ backgroundColor: colour }} /><strong className="mt-7 block text-4xl">{value}</strong><span className="mt-2 block text-xs font-bold text-black/45">{label}</span></div>)}</div>
            <div className="divide-y divide-black/10 border-t border-black/10"><div className="flex items-center gap-4 p-5 sm:px-8"><Plane className="h-5 w-5 shrink-0 text-[#ff5a36]" /><div className="min-w-0 flex-1"><h4 className="font-black">Travel confirmation missing</h4><p className="mt-1 text-xs text-black/45">Helsinki, 22 February</p></div><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b26a1b]">Action needed</span></div><div className="flex items-center gap-4 p-5 sm:px-8"><Files className="h-5 w-5 shrink-0 text-[#718b08]" /><div className="min-w-0 flex-1"><h4 className="font-black">Rider acknowledged</h4><p className="mt-1 text-xs text-black/45">Berlin, 25 February</p></div><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#718b08]">Complete</span></div></div>
          </div>
          <div className="grid bg-[#11140f] text-white sm:grid-cols-2 lg:grid-cols-1"><article className="border-b border-white/10 p-7 sm:border-b-0 sm:border-r lg:border-b lg:border-r-0 sm:p-8"><BellRing className="h-5 w-5 text-[#ff8068]" /><p className="mt-10 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Changed since your last visit</p><h3 className="mt-3 text-2xl font-black">Doors moved to 19:00</h3><p className="mt-3 text-sm leading-6 text-white/50">The right people see the update, with a permanent record of who has read it.</p><div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#c8f135]"><Check className="h-4 w-4" />Acknowledged by 4 of 5</div></article><article className="p-7 sm:p-8"><CircleDollarSign className="h-5 w-5 text-[#ff8068]" /><p className="mt-10 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Projected settlement</p><strong className="mt-3 block text-4xl">EUR 39,098</strong><p className="mt-4 text-xs leading-5 text-white/50">Guarantees, deductions and commission stay connected to the shows that created them.</p></article></div>
        </div>
      </div>
    </section>

    <section className="border-b border-black/10 px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl border-x border-black/10 md:grid-cols-3">{safeguards.map(({ title, copy, icon: Icon }) => <article key={title} className="border-b border-r border-black/10 p-7 sm:p-8"><Icon className="h-5 w-5 text-[#ff5a36]" /><h3 className="mt-10 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-[#6b6f66]">{copy}</p></article>)}</div></section>
  </>;
}
