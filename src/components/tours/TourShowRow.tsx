"use client";

import type { Show } from "@/types/show";
import {
  ChevronRight,
  Clock3,
  MapPin,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ShowBudget = {
  currency?: string | null;
  distance?: number | null;
};

type TourShowRowProps = {
  show: Show;
  index: number;
  budget?: ShowBudget;
  tourCurrency?: string | null;
  onDaySheet: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
};

function isKnown(value?: string | null): value is string {
  return Boolean(value?.trim() && !/^(?:tbd|tbc|n\/a|location tbc)$/i.test(value.trim()));
}

function calendarDescription(notes?: string): string | null {
  const description = notes?.match(/(?:^|\r?\n)Imported calendar entry:\s*([^\r\n]+)/i)?.[1]?.trim();
  return description || null;
}

function formatDate(date: string): string {
  const validDate = new Date(date);
  return Number.isFinite(validDate.getTime())
    ? validDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : date;
}

function showFee(amount: number, currency: string): string {
  return /^[A-Z]{3}$/.test(currency)
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
    : `${amount.toLocaleString("en-GB")} (currency not set)`;
}

export default function TourShowRow({
  show, index, budget, tourCurrency, onDaySheet, onEdit, onShare, onDelete,
}: TourShowRowProps) {
  const showType = show.showType || "show";
  const isPerformance = showType !== "off_day" && showType !== "travel_day";
  const venueKnown = isKnown(show.venueName);
  const cityKnown = isKnown(show.venueCity);
  const location = [show.venueCity, show.venueState, show.venueCountry]
    .filter(isKnown).join(", ");
  const sourceTitle = show.calendarEventTitle || calendarDescription(show.notes);
  const heading = showType === "off_day" ? "Off day" :
    showType === "travel_day" ? "Travel day" :
    venueKnown ? show.venueName :
    sourceTitle || (cityKnown ? show.venueCity : "Venue to be confirmed");
  const status = show.status?.replaceAll("_", " ") || "tentative";
  const time = show.showTime?.trim()?.slice(0, 5);
  const readiness = Math.max(0, Math.min(100, Number(show.readinessPercentage) || 0));
  const currency = String(budget?.currency || show.currency || tourCurrency || "").trim().toUpperCase();
  const fee = Number(show.guarantee);
  const distance = Number(budget?.distance);
  const statusStyle =
    show.status === "confirmed" ? "bg-[#e6f2e4] text-[#28653b]" :
    show.status === "cancelled" ? "bg-[#fce6e2] text-[#a53929]" :
    show.status === "pending_acceptance" ? "bg-[#fff0cf] text-[#7b540f]" :
    "bg-[#eee9e0] text-[#615a50]";

  return (
    <article className="group rounded-2xl border border-[#d9d1c5] bg-[#fffaf2] px-4 py-4 transition-colors hover:border-[#f48c73] hover:bg-white sm:px-5">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 gap-y-3 lg:grid-cols-[40px_minmax(0,1fr)_auto] lg:items-center lg:gap-x-5">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ff5738]/25 bg-[#ff5738]/10 text-sm font-black text-[#dc492e]">
          {index + 1}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="min-w-0 max-w-full break-words text-base font-extrabold text-[#171713] sm:text-lg">
              {heading}
            </h3>
            {isPerformance && (
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusStyle}`}>
                {status}
              </span>
            )}
            {!isPerformance && sourceTitle && <span className="text-xs text-[#69635a]">{sourceTitle}</span>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-[#665f55] sm:text-sm">
            <span className="font-semibold">{formatDate(show.showDate)}</span>
            {location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" className="shrink-0" />
                <span className="break-words">{location}</span>
              </span>
            )}
            {isPerformance && time && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} aria-hidden="true" />
                {time}
              </span>
            )}
          </div>

          {isPerformance && !venueKnown && (
            <button type="button" onClick={onEdit} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#bf4229] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5738]">
              Add venue details <ChevronRight size={14} aria-hidden="true" />
            </button>
          )}
          {show.contactName && <p className="mt-1 truncate text-xs text-[#716b62]">Contact: {show.contactName}</p>}
        </div>

        <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4ddd2] pt-3 lg:col-span-1 lg:justify-end lg:border-0 lg:pt-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5e584f]">
            {isPerformance && (
              <span className={`rounded-full px-2.5 py-1.5 ${readiness === 100 ? "bg-[#e7f0d2] text-[#4e641f]" : "bg-[#f0ebe2] text-[#665f55]"}`}>
                {readiness === 0 ? "Advance not started" : readiness === 100 ? "Advance complete" : `${readiness}% advanced`}
              </span>
            )}
            {isPerformance && fee > 0 && <span>{showFee(fee, currency)}</span>}
            {distance > 0 && <span>{distance.toLocaleString("en-GB")} mi</span>}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDaySheet}
              className="inline-flex min-h-11 items-center rounded-full border border-[#d0c7ba] bg-[#fffaf2] px-4 text-sm font-bold text-[#171713] transition-colors hover:border-[#ff5738] hover:text-[#bd3f27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5738]"
            >
              Day sheet
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`More actions for ${heading} on ${formatDate(show.showDate)}`}
                  title="More show actions"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d0c7ba] bg-[#fffaf2] text-[#504b42] transition-colors hover:border-[#ff5738] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5738]"
                >
                  <MoreHorizontal size={19} aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={8}
                collisionPadding={12}
                className="z-[100] w-52 rounded-xl border border-[#d6cec1] bg-[#fffaf2] p-1.5 text-[#171713] shadow-[0_18px_48px_-16px_rgba(23,23,19,0.4)]"
              >
                <DropdownMenuItem onSelect={onShare} className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#171713] focus:bg-[#f0e9df] focus:text-[#171713]">
                  <Share2 size={16} aria-hidden="true" /> Share show
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onEdit} className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#171713] focus:bg-[#f0e9df] focus:text-[#171713]">
                  <Pencil size={16} aria-hidden="true" /> Edit show
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-2 my-1 bg-[#ddd4c8]" />
                <DropdownMenuItem onSelect={onDelete} className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#ad3725] focus:bg-[#fbe7e1] focus:text-[#ad3725]">
                  <Trash2 size={16} aria-hidden="true" /> Delete show
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </article>
  );
}
