'use client';

import { DaySheetPage } from '@/app/external-day-sheets/[id]/page';

export default function AgentDaySheetPage() {
  return <DaySheetPage apiBase="/api/agent/shows" backHref="/agent" backLabel="Booking-agent desk" contextLabel="Booking-agent day sheet" />;
}
