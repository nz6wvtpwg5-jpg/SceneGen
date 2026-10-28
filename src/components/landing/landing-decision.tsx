import Link from 'next/link';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';

const steps = [
  ['Create the workspace', 'Set up the artist, organization or operation that owns the work.'],
  ['Bring in the dates', 'Add a show, build a tour or import the run you already have.'],
  ['Invite the right people', 'Share precisely scoped access as the plan becomes operational.'],
];

const questions = [
  ['Is SceneGen only for touring artists?', 'No. Artists and managers can run the full workspace, while agents, promoters and crew can use access limited to the shows and information relevant to them.'],
  ['Can an external collaborator see everything?', 'No. Day-sheet access can be constrained by tour, show, country or wider territory, with separate controls for editing and financial information.'],
  ['Does SceneGen replace the day sheet?', 'It turns the day sheet into a live operational record. Current timings, contacts, travel, documents and notices remain together and can still be printed when needed.'],
  ['What happens when show information changes?', 'The updated record becomes authoritative. SceneGen can surface what changed, request acknowledgement and retain an activity trail for important operational edits.'],
  ['Does it handle different currencies?', 'Yes. Show and tour finances retain their actual currency, and totals are grouped by currency rather than combining unlike amounts.'],
];

export function LandingDecision() {
  return <section id="questions" className="border-t border-black/10 px-5 py-20 sm:px-8 lg:py-24">
    <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.86fr_1.14fr]">
      <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff5a36]">Start with the work you have</p><h2 className="mt-5 max-w-xl text-4xl font-black leading-[0.95] sm:text-5xl">From an empty desk to a working tour.</h2><div className="mt-10 border-y border-black/10">{steps.map(([title, copy], index) => <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-black/10 py-6 last:border-b-0"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#11140f] text-[10px] font-black text-white">{index + 1}</span><div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#6b6f66]">{copy}</p></div></div>)}</div><Link href="/login?mode=register" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#11140f] px-6 text-sm font-bold text-white hover:bg-[#292d26]">Create your workspace <ArrowRight className="ml-2 h-4 w-4" /></Link></div>
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">Common questions</p><div className="mt-6 divide-y divide-black/10 border-y border-black/10">{questions.map(([question, answer], index) => <details key={question} className="group" open={index === 0 ? true : undefined}><summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-base font-black [&::-webkit-details-marker]:hidden"><span>{question}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#ff5a36] group-open:rotate-180" /></summary><p className="max-w-2xl pb-7 pr-10 text-sm leading-7 text-[#666a61]">{answer}</p></details>)}</div><div className="mt-8 flex items-start gap-3 bg-[#e9e2d6] p-5 text-sm leading-6 text-[#565a52]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a36]" /><p>SceneGen keeps the operational source of truth online, while printable day sheets remain available for the road.</p></div></div>
    </div>
  </section>;
}
