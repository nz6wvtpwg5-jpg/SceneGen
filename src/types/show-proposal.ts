export type ProposalStatus = 'pending' | 'changes_requested' | 'accepted' | 'declined' | 'withdrawn';

export type ShowProposal = {
  id: string;
  entityId: string;
  workspaceName?: string;
  proposedByName?: string;
  proposedByEmail?: string;
  showDate: string;
  venueName: string;
  venuePlaceId: string;
  venueAddress: string;
  city: string;
  region?: string | null;
  country: string;
  currency: string;
  offerAmount: number;
  dealType: string;
  offerTerms: string;
  notes?: string | null;
  promoterName?: string | null;
  promoterEmail?: string | null;
  promoterPhone?: string | null;
  status: ProposalStatus;
  decisionNote?: string | null;
  createdAt?: string;
  acceptedShowId?: string | null;
  proposedShowId?: string | null;
  revision?: number;
  events?: ProposalEvent[];
};

export type ProposalEvent = {
  id: string;
  eventType: 'submitted' | 'changes_requested' | 'accepted' | 'declined' | 'withdrawn';
  note?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  createdAt: string;
};

export type ProposalWorkspace = {
  id: string;
  name: string;
  scopeType: 'all' | 'countries';
  countries: string[];
};

const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export function normaliseProposal(row: Record<string, unknown>): ShowProposal {
  const value = Object.fromEntries(Object.entries(row).map(([key, item]) => [camel(key), item])) as unknown as ShowProposal;
  return { ...value, offerAmount: Number(value.offerAmount || 0), events: Array.isArray(value.events) ? value.events.map((event) => Object.fromEntries(Object.entries(event as unknown as Record<string, unknown>).map(([key, item]) => [camel(key), item])) as unknown as ProposalEvent) : [] };
}

export function normaliseWorkspace(row: Record<string, unknown>): ProposalWorkspace {
  const value = Object.fromEntries(Object.entries(row).map(([key, item]) => [camel(key), item])) as unknown as ProposalWorkspace;
  return { ...value, countries: Array.isArray(value.countries) ? value.countries : [] };
}
