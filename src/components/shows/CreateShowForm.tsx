'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useProfileStore } from '@/store/useProfileStore';
import { useShows } from '@/hooks/useShows';
import { useTours } from '@/hooks/useTours';
import EntitySearch from '@/components/search/EntitySearch';
import GenerateInvite from '@/components/invites/GenerateInvite';
import type { PromoterInviteConfiguration } from '@/components/invites/GenerateInvite';
import { toast } from 'sonner';
import { CreateTourModal } from '@/components/tours/CreateTourModal';
import VenueDirectoryAutocomplete, { type StoredVenue } from './VenueDirectoryAutocomplete';
import type { SearchEntity } from '@/hooks/useSearch';
import type { CreateShowInput, Show } from '@/types/show';
import type { Tour } from '@/types/tour';
import { Mail, Search } from 'lucide-react';
import { copyText } from '@/lib/clipboard';

// Currency mapping by country
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    // Europe - Euro
    'Austria': 'EUR', 'Belgium': 'EUR', 'Cyprus': 'EUR', 'Estonia': 'EUR',
    'Finland': 'EUR', 'France': 'EUR', 'Germany': 'EUR', 'Greece': 'EUR',
    'Ireland': 'EUR', 'Italy': 'EUR', 'Latvia': 'EUR', 'Lithuania': 'EUR',
    'Luxembourg': 'EUR', 'Malta': 'EUR', 'Netherlands': 'EUR', 'Portugal': 'EUR',
    'Slovakia': 'EUR', 'Slovenia': 'EUR', 'Spain': 'EUR',

    // Europe - Other
    'United Kingdom': 'GBP', 'UK': 'GBP', 'England': 'GBP', 'Scotland': 'GBP', 'Wales': 'GBP',
    'Switzerland': 'CHF', 'Norway': 'NOK', 'Sweden': 'SEK', 'Denmark': 'DKK',
    'Poland': 'PLN', 'Czech Republic': 'CZK', 'Hungary': 'HUF', 'Romania': 'RON',

    // Americas
    'USA': 'USD', 'United States': 'USD', 'US': 'USD', 'America': 'USD',
    'Canada': 'CAD', 'Mexico': 'MXN', 'Brazil': 'BRL', 'Argentina': 'ARS',
    'Chile': 'CLP', 'Colombia': 'COP',

    // Asia Pacific
    'Japan': 'JPY', 'China': 'CNY', 'South Korea': 'KRW', 'India': 'INR',
    'Australia': 'AUD', 'New Zealand': 'NZD', 'Singapore': 'SGD',
    'Thailand': 'THB', 'Malaysia': 'MYR', 'Indonesia': 'IDR',
};

// Common currencies for dropdown
const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
];

interface CreateShowFormProps {
    show?: Show; // Show to edit (if editing existing show)
    onSuccess?: (showId: string) => void;
    onCancel?: () => void;
    initialData?: {
        venueName?: string;
        venueAddress?: string;
        venueCity?: string;
        venueState?: string;
        venueCountry?: string;
        showDate?: string;
        showTime?: string;
        doorsTime?: string;
        date?: string; // Backwards compatibility
        notes?: string;
    };
    fromCalendarEvent?: boolean; // Flag to indicate creation from calendar event
}

type CounterpartySelectionMode = 'search' | 'invite' | 'self' | null;

/**
 * CreateShowForm Component
 * Implements BUILD_PLAN Week 3, Task 3.6
 * Updated with invite functionality
 * Enhanced: Auto-select logged-in entity when creating from calendar event
 * Enhanced: Support editing existing shows
 */
export default function CreateShowForm({ show, onSuccess, onCancel, initialData, fromCalendarEvent }: CreateShowFormProps) {
    const { data: session } = useSession();
    const { activeProfile } = useProfileStore();
    const { createShow, updateShow, isLoading, error } = useShows();
    const { fetchTours } = useTours();

    const isEditing = !!show;

    // Step 1: Counterparty selection
    const [selectionMode, setSelectionMode] = useState<CounterpartySelectionMode>(null);
    const [selectedCounterparty, setSelectedCounterparty] = useState<SearchEntity | null>(null);
    const [inviteGenerated, setInviteGenerated] = useState(false);
    const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
    const [inviteEmailDelivered, setInviteEmailDelivered] = useState(false);
    const [promoterInvite, setPromoterInvite] = useState<PromoterInviteConfiguration | null>(null);
    const [completedShowId, setCompletedShowId] = useState<string | null>(null);

    // When creating from calendar event and user has an active profile,
    // we're creating a show FOR that profile (they are one party in the transaction)
    const isCreatingForSelf = fromCalendarEvent && activeProfile;
    const isSelfPromoted = activeProfile?.entityType === 'artist' && selectionMode === 'self';
    const userEntityType = activeProfile?.entityType; // 'artist' or 'promoter'

    // Step 2: Tour selection (artists only)
    const [tours, setTours] = useState<Tour[]>([]);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [tourSelection, setTourSelection] = useState<'standalone' | 'existing' | 'new'>('standalone');
    const [showTourModal, setShowTourModal] = useState(false);

    // Step 3: Day Sheet fields
    const [venueSelectionIntent, setVenueSelectionIntent] = useState<'google' | 'stored' | null>(null);
    const [formData, setFormData] = useState<Partial<CreateShowInput>>({
        dealType: 'guarantee',
        ...(show && {
            // When editing, populate with existing show data
            venueName: show.venueName || '',
            venueAddress: show.venueAddress || '',
            venueCity: show.venueCity || '',
            venueState: show.venueState || '',
            venueCountry: show.venueCountry || '',
            // Convert ISO date to YYYY-MM-DD format for date input
            showDate: show.showDate ? new Date(show.showDate).toISOString().split('T')[0] : '',
            showTime: show.showTime || '',
            doorsTime: show.doorsTime || '',
            venueCapacity: show.venueCapacity,
            setLength: show.setLength || '',
            guarantee: show.guarantee,
            dealType: show.dealType || 'guarantee',
            doorSplitPercentage: show.doorSplitPercentage,
            advanceTicketPrice: show.advanceTicketPrice,
            doorTicketPrice: show.doorTicketPrice,
            notes: show.notes || '',
            contactName: show.contactName || '',
            contactPhone: show.contactPhone || '',
            contactEmail: show.contactEmail || '',
        }),
        ...(!show && initialData && {
            // When creating from initialData (e.g., calendar event)
            venueName: initialData.venueName || '',
            venueAddress: initialData.venueAddress || '',
            venueCity: initialData.venueCity || '',
            venueState: initialData.venueState || '',
            venueCountry: initialData.venueCountry || '',
            showDate: initialData.showDate || initialData.date || '', // Support both field names
            showTime: initialData.showTime || '',
            doorsTime: initialData.doorsTime || '',
            notes: initialData.notes || '',
        }),
    });

    // Currency state - auto-detect based on country
    const [currency, setCurrency] = useState<string>(show?.currency || '');

    // Auto-detect currency when country changes
    useEffect(() => {
        if (formData.venueCountry) {
            const detectedCurrency = COUNTRY_CURRENCY_MAP[formData.venueCountry];
            if (detectedCurrency) {
                setCurrency(detectedCurrency);
            }
        }
    }, [formData.venueCountry]);

    // Fetch tours if user is an artist
    useEffect(() => {
        if (activeProfile?.entityType === 'artist') {
            loadTours();
        }
    }, [activeProfile?.entityType]);

    // When editing a show with a tour, set the selected tour
    useEffect(() => {
        if (isEditing && show?.tourId && tours.length > 0) {
            const tour = tours.find(t => t.id === show.tourId);
            if (tour) {
                setSelectedTour(tour);
                setTourSelection('existing');
            }
        }
    }, [isEditing, show, tours]);

    const loadTours = async () => {
        try {
            const data = await fetchTours();
            setTours(data);
        } catch (err) {
            console.error('Failed to load tours:', err);
        }
    };

    const handleCounterpartySelect = (entity: SearchEntity) => {
        setSelectedCounterparty(entity);
        setSelectionMode('search');
    };

    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        console.log('🎯 [CreateShowForm] handlePlaceSelect called with place:', place);

        // Auto-fill venue fields from Google Places data
        const addressComponents = place.address_components || [];
        console.log('📍 [CreateShowForm] Address components:', addressComponents);

        // Helper function to find address component by type
        const getComponent = (types: string[], useShortName = false) => {
            for (const type of types) {
                const component = addressComponents.find(c => c.types.includes(type));
                if (component) {
                    return useShortName ? component.short_name : component.long_name;
                }
            }
            return '';
        };

        // Try multiple types for city (handles international addresses)
        const city = getComponent(['locality', 'postal_town', 'administrative_area_level_2']);

        // Try multiple types for state/region
        const state = getComponent(['administrative_area_level_1'], true);

        // Get country
        const country = getComponent(['country']);
        const countryCode = getComponent(['country'], true);
        const postalCode = getComponent(['postal_code']);

        const newFormData = {
            venueId: undefined,
            venueName: place.name || '',
            venueAddress: place.formatted_address || '',
            venueCity: city,
            venueState: state,
            venueCountry: country,
            venuePlaceId: place.place_id || '',
            latitude: place.geometry?.location?.lat(),
            longitude: place.geometry?.location?.lng(),
            countryCode,
            postalCode,
        };

        console.log('✅ [CreateShowForm] Setting form data:', newFormData);

        setVenueSelectionIntent('google');
        setFormData(prev => ({
            ...prev,
            ...newFormData
        }));
    };

    const handleStoredVenueSelect = (venue: StoredVenue) => { setVenueSelectionIntent('stored'); setFormData(prev => ({...prev,
        venueId:venue.id, venuePlaceId:venue.googlePlaceId||'', venueName:venue.name, venueAddress:venue.address||'',
        venueCity:venue.city, venueState:venue.region||'', venueCountry:venue.country||'', venueCapacity:venue.capacity,
        latitude:venue.latitude, longitude:venue.longitude, countryCode:venue.countryCode, postalCode:venue.postalCode
    })); };

    const handleVenueNameChange = (value: string) => { setVenueSelectionIntent(null); setFormData(prev => ({
        ...prev,
        venueId: undefined,
        venuePlaceId: undefined,
        venueName: value,
        venueAddress: '',
        venueCity: '',
        venueState: '',
        venueCountry: '',
        latitude: undefined,
        longitude: undefined,
        countryCode: undefined,
        postalCode: undefined,
    })); };

    const handleInviteGenerated = (url: string) => {
        setInviteGenerated(true);
        setGeneratedInviteUrl(url);
    };

    const handleInviteConfigured = (configuration: PromoterInviteConfiguration) => {
        setPromoterInvite(configuration);
        setInviteGenerated(true);
    };

    const handleInputChange = (field: keyof CreateShowInput, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeProfile && !isEditing) {
            return;
        }

        // When editing, we don't need counterparty validation
        if (!isEditing) {
            // When creating from calendar event, counterparty is optional
            if (!isCreatingForSelf && !isSelfPromoted && !selectedCounterparty && !inviteGenerated) {
                return;
            }
        }

        try {
            if (isEditing && show) {
                // Update existing show
                const updates: Record<string, unknown> = {
                    date: formData.showDate!,
                    venueName: formData.venueName || '',
                    // Venue identity must only be resubmitted when intentionally changed.
                    ...(venueSelectionIntent ? {
                        venueSelectionIntent,
                        venueId: venueSelectionIntent === 'stored' ? formData.venueId : undefined,
                        venuePlaceId: venueSelectionIntent === 'google' ? formData.venuePlaceId : undefined,
                    } : {}),
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    venueAddress: formData.venueAddress || '',
                    city: formData.venueCity || '',
                    state: formData.venueState || '',
                    country: formData.venueCountry || '',
                    capacity: formData.venueCapacity,
                    doorTime: formData.doorsTime || '',
                    startTime: formData.showTime || '',
                    guaranteedFee: formData.guarantee,
                    currency: currency,
                    backendDeal: formData.dealType!,
                    notes: formData.notes,
                    promoterName: formData.contactName || '',
                    promoterPhone: formData.contactPhone || '',
                    promoterEmail: formData.contactEmail || ''
                };

                // Update tourId if it changed
                if (selectedTour?.id !== show.tourId) {
                    updates.tourId = selectedTour?.id;
                }

                console.log('📝 [CreateShowForm] Updating show:', {
                    showId: show.id,
                    updates
                });
                await updateShow(show.id, updates as Partial<Show>);
                if (onSuccess) {
                    onSuccess(show.id);
                }
            } else {
                // Create new show
                if (!activeProfile) {
                    return;
                }

                // Determine artist and promoter IDs based on entity types
                const isCurrentEntityArtist = activeProfile.entityType === 'artist';

                // If no counterparty selected (creating from calendar for self), leave counterparty ID as undefined
                const artistEntityId = isCurrentEntityArtist
                    ? activeProfile.id
                    : selectedCounterparty?.id;
                const promoterEntityId = isCurrentEntityArtist
                    ? (isSelfPromoted ? undefined : selectedCounterparty?.id)
                    : activeProfile.id;

                const showInput: CreateShowInput = {
                    artistEntityId,
                    promoterEntityId,
                    tourId: selectedTour?.id, // Include tourId if tour selected
                    showDate: formData.showDate!,
                    // Empty venue fields are a real "venue to be confirmed" state.
                    venueName: formData.venueName || '',
                    venueAddress: formData.venueAddress || '',
                    venueCity: formData.venueCity || (fromCalendarEvent ? 'TBD' : ''),
                    venueState: formData.venueState || '',
                    venueCountry: formData.venueCountry || '',
                    venueCapacity: formData.venueCapacity,
                    doorsTime: formData.doorsTime || '',
                    showTime: formData.showTime || (fromCalendarEvent ? '20:00' : ''),
                    setLength: formData.setLength || (fromCalendarEvent ? 'TBD' : ''),
                    guarantee: formData.guarantee,
                    currency: currency,  // Add currency
                    dealType: formData.dealType!,
                    doorSplitPercentage: formData.doorSplitPercentage,
                    advanceTicketPrice: formData.advanceTicketPrice,
                    doorTicketPrice: formData.doorTicketPrice,
                    notes: formData.notes,
                    contactName: formData.contactName || '',
                    contactPhone: formData.contactPhone || '',
                    contactEmail: formData.contactEmail || ''
                };

                const createdShow = await createShow(showInput);

                console.log('🎯 Show created - RAW RESPONSE:', createdShow);
                console.log('🎯 Show created:', {
                    showId: createdShow.id,
                    tourId: selectedTour?.id,
                    hasActiveProfile: !!activeProfile,
                    willRunAutomation: !!(createdShow.id && selectedTour?.id && activeProfile)
                });

                // Auto-create budget and calculate mileage if show is part of a tour
                if (createdShow.id && selectedTour?.id && activeProfile) {
                    try {
                        console.log('🤖 Running automation: creating budget and calculating mileage...');
                        await createBudgetForShow(createdShow.id, selectedTour.id, activeProfile.id);
                        console.log('✅ Budget created, now calculating distances...');
                        await recalculateTourMileage(selectedTour.id, activeProfile.id);
                        console.log('✅ Distance calculation complete!');
                    } catch (automationError) {
                        console.error('❌ Budget/mileage automation failed:', automationError);
                        console.warn('⚠️ Budget/mileage automation failed (non-fatal):', automationError);
                    }
                } else {
                    console.log('⚠️ Skipping automation - missing requirements:', {
                        hasShowId: !!createdShow.id,
                        hasTourId: !!selectedTour?.id,
                        hasActiveProfile: !!activeProfile
                    });
                }

                if (!isSelfPromoted && promoterInvite && createdShow.id) {
                    const response = await fetch('/api/day-sheet-collaborators/invite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Entity-Id': activeProfile.id },
                        body: JSON.stringify({
                            entityId: activeProfile.id,
                            email: promoterInvite.email,
                            editScope: promoterInvite.editScope,
                            financialAccess: promoterInvite.financialAccess,
                            expiresInDays: promoterInvite.expiresInDays,
                            requireApproval: promoterInvite.requireApproval,
                            scopeType: 'show',
                            showId: createdShow.id,
                            countries: [],
                        }),
                    });
                    const invitation = await response.json();
                    if (!response.ok) {
                        toast.error(invitation.error?.message || 'The show was saved, but promoter access could not be created');
                    } else {
                        setGeneratedInviteUrl(invitation.inviteUrl);
                        setInviteEmailDelivered(invitation.emailDelivery === 'sent');
                        setCompletedShowId(createdShow.id);
                        return;
                    }
                }

                if (onSuccess) {
                    onSuccess(createdShow.id);
                }
            }
        } catch (err) {
            console.error(`Failed to ${isEditing ? 'update' : 'create'} show:`, err);
        }
    };

    // Helper function to create budget for a new show
    const createBudgetForShow = async (showId: string, tourId: string, entityId: string) => {
        if (!session?.user?.id) return;

        let templateBudget = null;

        // Try to fetch existing budgets to use as template
        try {
            const budgetsResponse = await fetch(`/api/budgets?tourId=${tourId}&entityId=${entityId}`, {
                headers: {
                    'X-Entity-Id': entityId,
                },
            });

            if (budgetsResponse.ok) {
                const budgetsData = await budgetsResponse.json();
                const existingBudgets = budgetsData.budgets || [];

                if (existingBudgets.length > 0) {
                    templateBudget = existingBudgets[0];
                    console.log('📋 Using budget template from existing show');
                }
            }
        } catch (fetchError) {
            console.log('📋 No template found, creating budget with defaults');
        }

        // Create budget for the new show
        const budgetData = {
            entityId: entityId,  // Required by Next.js API route
            showId: showId,
            tourId: tourId,
            budgetName: `${formData.venueCity || 'Show'} Budget`,
            currency,
        };

        const budgetResponse = await fetch('/api/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Entity-Id': entityId,
            },
            body: JSON.stringify(budgetData),
        });

        if (budgetResponse.ok) {
            const budgetResult = await budgetResponse.json();
            console.log('✅ Budget created automatically');

            // Copy line items from template if available
            if (templateBudget?.line_items && templateBudget.line_items.length > 0) {
                const lineItemsPromises = templateBudget.line_items.map((item: any) => {
                    const lineItemData = {
                        budget_id: budgetResult.budget.id,
                        category: item.category,
                        description: item.description,
                        type: item.type,
                        amount: item.amount,
                        is_percentage: item.is_percentage || item.isPercentage,
                        percentage_of: item.percentage_of || item.percentageOf,
                    };

                    return fetch('/api/budgets/line-items', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Entity-Id': entityId,
                        },
                        body: JSON.stringify(lineItemData),
                    });
                });

                await Promise.all(lineItemsPromises);
                console.log('✅ Line items copied from template');
            }
        } else {
            throw new Error('Failed to create budget');
        }
    };

    // Helper function to recalculate tour mileage
    const recalculateTourMileage = async (tourId: string, entityId: string) => {
        if (!session?.user?.id) {
            console.error('❌ No session access token available');
            return;
        }

        console.log('🗺️  Calculating distances for tour:', {
            tourId,
            entityId,
            hasToken: !!session.user.id,
            endpoint: `/api/tours/${tourId}/calculate-distances`
        });

        try {
            const distanceResponse = await fetch(`/api/tours/${tourId}/calculate-distances`, {
                method: 'POST',
                headers: {
                    'X-Entity-Id': entityId,
                },
            });

            console.log('📡 Distance API response status:', distanceResponse.status);

            if (distanceResponse.ok) {
                const distanceResult = await distanceResponse.json();
                console.log('✅ Distance calculation complete:', distanceResult);
            } else {
                const errorData = await distanceResponse.json();
                console.error('❌ Distance calculation failed:', errorData);
            }
        } catch (error) {
            console.error('❌ Error calling distance calculation API:', error);
            throw error;
        }
    };

    const handleTourCreated = (tour: Tour) => {
        setSelectedTour(tour);
        setTourSelection('existing');
        setShowTourModal(false);
        loadTours(); // Refresh tours list
    };

    const requiredEntityType = activeProfile?.entityType === 'artist' ? 'promoter' : 'artist';
    // When creating from calendar event, counterparty is optional - can be added later
    // When editing, we skip counterparty selection entirely
    const canProceedToForm = isEditing || isCreatingForSelf || isSelfPromoted || selectedCounterparty || inviteGenerated;

    if (completedShowId && generatedInviteUrl && promoterInvite) {
        return <div className="space-y-5 rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-7"><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff5738]">Show saved</p><h2 className="text-3xl font-black">Promoter invitation ready</h2><p className="text-sm text-[#686258]">{inviteEmailDelivered ? <>SceneGen emailed the private link to <strong>{promoterInvite.email}</strong>. You can also copy it below.</> : <>Email delivery failed. Send this private link to <strong>{promoterInvite.email}</strong>. They must sign in with that email address.</>}</p><div className="rounded-2xl bg-[#f2ebe0] p-5 text-sm"><p><strong>Shows:</strong> This show only</p><p className="mt-1"><strong>Day sheet:</strong> {promoterInvite.editScope === 'none' ? 'View only' : promoterInvite.editScope === 'advance' ? 'Can edit advance information' : 'Can edit the entire day sheet'}</p><p className="mt-1"><strong>Finances:</strong> {promoterInvite.financialAccess === 'hidden' ? 'Hidden' : promoterInvite.financialAccess === 'view' ? 'View only' : 'Can edit'}</p><p className="mt-1"><strong>Approval:</strong> {promoterInvite.requireApproval ? 'Sensitive changes require approval' : 'Permitted changes apply immediately'}</p><p className="mt-1"><strong>Expires:</strong> After {promoterInvite.expiresInDays} days</p></div><div className="flex gap-2"><input readOnly value={generatedInviteUrl} className="min-w-0 flex-1 rounded-xl border border-[#d7cfc2] bg-white px-4 py-3 text-sm"/><button type="button" onClick={() => { void copyText(generatedInviteUrl).then((copied) => copied ? toast.success('Invitation link copied') : toast.error('Could not copy invitation link')); }} className="rounded-xl bg-[#171713] px-5 font-bold text-white">Copy link</button></div><button type="button" onClick={() => onSuccess?.(completedShowId)} className="w-full rounded-full bg-[#ff5738] py-4 font-bold text-white">Done</button></div>;
    }

    return (
        <>
        <form onSubmit={handleSubmit} className="mobile-create-form space-y-4 sm:space-y-6">
            {/* Show who is creating the show */}
            {isCreatingForSelf && activeProfile && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Creating show as: <strong>{activeProfile.name}</strong> ({userEntityType})
                    </p>
                </div>
            )}

            {/* Step 1: Counterparty Selection (Skip when editing or creating from calendar) */}
            {!isEditing && !isCreatingForSelf && (
                <div className="mobile-create-section sm:border-0 sm:bg-transparent sm:p-0">
                    <h3 className="text-lg font-semibold mb-4">
                        Select {requiredEntityType === 'artist' ? 'Artist' : 'Promoter'}
                    </h3>

                    {isSelfPromoted ? (
                        <div className="rounded-lg border border-border-subtle bg-white p-4">
                            <p className="font-semibold">Self-promoted show</p>
                            <p className="mt-1 text-sm text-text-secondary">{activeProfile?.name} is organising this show. No promoter account or invitation is needed.</p>
                            <button type="button" className="mt-3 min-h-11 text-sm font-semibold underline" onClick={() => setSelectionMode(null)}>Change promoter choice</button>
                        </div>
                    ) : selectedCounterparty ? (
                    <div className="flex items-center justify-between p-4 border border-border-subtle rounded-lg bg-surface-elevated">
                        <div>
                            <p className="font-medium">{selectedCounterparty.name}</p>
                            <p className="text-sm text-text-tertiary">
                                {[selectedCounterparty.city, selectedCounterparty.country]
                                    .filter(Boolean)
                                    .join(', ')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCounterparty(null);
                                setSelectionMode(null);
                            }}
                            className="text-sm text-text-tertiary hover:text-foreground"
                        >
                            Change
                        </button>
                    </div>
                ) : inviteGenerated ? (
                    <div className="p-4 border border-border-subtle rounded-lg state-success-subtle">
                        <p className="font-medium text-semantic-success mb-2">
                            ✓ Promoter access prepared
                        </p>
                        <p className="text-sm text-text-tertiary mb-3">
                            Complete the show details below. SceneGen will save the show first and then create an email-bound invitation for this day sheet.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setInviteGenerated(false);
                                setGeneratedInviteUrl(null);
                                setPromoterInvite(null);
                                setSelectionMode(null);
                            }}
                            className="text-sm text-text-tertiary hover:text-foreground"
                        >
                            Change promoter access
                        </button>
                    </div>
                ) : selectionMode === null ? (
                    <div className="grid grid-cols-2 gap-4">
                        {activeProfile?.entityType === 'artist' && (
                            <button type="button" onClick={() => {
                                setSelectedCounterparty(null);
                                setInviteGenerated(false);
                                setGeneratedInviteUrl(null);
                                setPromoterInvite(null);
                                setInviteEmailDelivered(false);
                                setSelectionMode('self');
                            }} className="col-span-full rounded-lg border-2 border-primary bg-white p-4 text-left">
                                <p className="font-semibold">We’re promoting this show ourselves</p>
                                <p className="mt-1 text-sm text-text-secondary">Continue without a promoter. Venue contact details are optional.</p>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setSelectionMode('search')}
                            className="p-6 border-2 border-border-subtle rounded-lg hover:border-primary hover:bg-surface-elevated transition-colors"
                        >
                            <div className="text-center">
                                <Search className="mx-auto mb-3 h-6 w-6 text-primary" />
                                <p className="font-medium mb-1">Search Existing</p>
                                <p className="text-sm text-text-tertiary">
                                    Find an existing {requiredEntityType} on SceneGen
                                </p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectionMode('invite')}
                            className="p-6 border-2 border-border-subtle rounded-lg hover:border-primary hover:bg-surface-elevated transition-colors"
                        >
                            <div className="text-center">
                                <Mail className="mx-auto mb-3 h-6 w-6 text-primary" />
                                <p className="font-medium mb-1">Invite New</p>
                                <p className="text-sm text-text-tertiary">
                                    Generate an invite link for a new {requiredEntityType}
                                </p>
                            </div>
                        </button>
                    </div>
                ) : selectionMode === 'search' ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-text-tertiary">
                                Search for an existing {requiredEntityType}
                            </p>
                            <button
                                type="button"
                                onClick={() => setSelectionMode(null)}
                                className="text-sm text-text-tertiary hover:text-foreground"
                            >
                                ← Back
                            </button>
                        </div>
                        <EntitySearch
                            onSelect={handleCounterpartySelect}
                            filterType={requiredEntityType}
                        />
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-text-tertiary">
                                Generate an invite link
                            </p>
                            <button
                                type="button"
                                onClick={() => setSelectionMode(null)}
                                className="text-sm text-text-tertiary hover:text-foreground"
                            >
                                ← Back
                            </button>
                        </div>
                        <GenerateInvite
                            inviteType="show_invite"
                            onGenerated={handleInviteGenerated}
                            onConfigured={handleInviteConfigured}
                        />
                    </div>
                )}
                </div>
            )}

            {/* Step 2: Tour Selection (Artists Only) - Week 4, Task 4.10 */}
            {canProceedToForm && activeProfile?.entityType === 'artist' && (
                <div className="mobile-create-section border-border-subtle sm:border-x-0 sm:border-b-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-6">
                    <h3 className="text-lg font-semibold mb-4">Tour Assignment</h3>
                    <p className="text-sm text-text-tertiary mb-4">
                        Is this show part of a tour?
                    </p>

                    <div className="space-y-3">
                        {/* Standalone Show */}
                        <label className="flex items-start p-4 border-2 border-border-subtle rounded-lg cursor-pointer hover:border-primary transition-colors">
                            <input
                                type="radio"
                                name="tourSelection"
                                value="standalone"
                                checked={tourSelection === 'standalone'}
                                onChange={() => {
                                    setTourSelection('standalone');
                                    setSelectedTour(null);
                                }}
                                className="mt-1 mr-3"
                            />
                            <div>
                                <div className="font-medium">Standalone Show</div>
                                <div className="text-sm text-text-tertiary">This show is not part of a tour</div>
                            </div>
                        </label>

                        {/* Existing Tour */}
                        <label className="flex items-start p-4 border-2 border-border-subtle rounded-lg cursor-pointer hover:border-primary transition-colors">
                            <input
                                type="radio"
                                name="tourSelection"
                                value="existing"
                                checked={tourSelection === 'existing'}
                                onChange={() => setTourSelection('existing')}
                                className="mt-1 mr-3"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="font-medium mb-2">Add to Existing Tour</div>
                                {tourSelection === 'existing' && (
                                    <select
                                        value={selectedTour?.id || ''}
                                        onChange={(e) => {
                                            const tour = tours.find(t => t.id === e.target.value);
                                            setSelectedTour(tour || null);
                                        }}
                                        className="w-full px-3 py-2 border border-border-subtle rounded-lg bg-background"
                                    >
                                        <option value="">Select a tour...</option>
                                        {tours.map((tour) => (
                                            <option key={tour.id} value={tour.id}>
                                                {tour.name} ({new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </label>

                        {/* Create New Tour */}
                        <label className="flex items-start p-4 border-2 border-border-subtle rounded-lg cursor-pointer hover:border-primary transition-colors">
                            <input
                                type="radio"
                                name="tourSelection"
                                value="new"
                                checked={tourSelection === 'new'}
                                onChange={() => {
                                    setTourSelection('new');
                                    setShowTourModal(true);
                                }}
                                className="mt-1 mr-3"
                            />
                            <div>
                                <div className="font-medium">Create New Tour</div>
                                <div className="text-sm text-text-tertiary">Start a new tour with this show</div>
                            </div>
                        </label>

                        {selectedTour && tourSelection === 'existing' && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    ✓ This show will be added to <strong>{selectedTour.name}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Day Sheet Fields */}
            {canProceedToForm && (
                <>
                    <div className="mobile-create-section border-border-subtle sm:border-x-0 sm:border-b-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-6">
                        <h3 className="text-lg font-semibold mb-4">Show Details</h3>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="show-showDate" className="block text-sm font-medium mb-1">Show Date *</label>
                                <input id="show-showDate"
                                    type="date"
                                    required
                                    value={formData.showDate || ''}
                                    onChange={(e) => handleInputChange('showDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                />
                            </div>
                            <div>
                                <label htmlFor="show-showTime" className="block text-sm font-medium mb-1">
                                    Show Time {!fromCalendarEvent && '*'}
                                </label>
                                <input id="show-showTime"
                                    type="time"
                                    required={!fromCalendarEvent}
                                    value={formData.showTime || ''}
                                    onChange={(e) => handleInputChange('showTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                />
                                {fromCalendarEvent && (
                                    <p className="text-xs text-text-tertiary mt-1">
                                        Defaults to 8:00 PM if not specified
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="show-doorsTime" className="block text-sm font-medium mb-1">
                                    Doors Time (optional)
                                </label>
                                <input id="show-doorsTime"
                                    type="time"
                                    value={formData.doorsTime || ''}
                                    onChange={(e) => handleInputChange('doorsTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                />
                                {fromCalendarEvent && (
                                    <p className="text-xs text-text-tertiary mt-1">
                                        Defaults to 7:00 PM if not specified
                                    </p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="show-setLength" className="block text-sm font-medium mb-1">
                                    Set Length (optional)
                                </label>
                                <input id="show-setLength"
                                    type="text"
                                    placeholder="e.g., 45 minutes"
                                    value={formData.setLength || ''}
                                    onChange={(e) => handleInputChange('setLength', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                />
                                {fromCalendarEvent && (
                                    <p className="text-xs text-text-tertiary mt-1">
                                        Can be filled in later
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Venue Details */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                Venue Name <span className="text-text-tertiary">(optional)</span>
                            </label>
                            <VenueDirectoryAutocomplete
                                value={formData.venueName || ''}
                                onChange={handleVenueNameChange}
                                onPlaceSelect={handlePlaceSelect}
                                onStoredVenueSelect={handleStoredVenueSelect}
                                city={formData.venueCity}
                                country={formData.venueCountry}
                                placeholder="Search for a venue..."
                                className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                            />
                            {!formData.venueName && (
                                <p className="text-xs text-text-tertiary mt-1">
                                    Leave blank if the venue is still to be confirmed.
                                </p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="show-venueAddress" className="block text-sm font-medium mb-1">
                                Venue Address <span className="text-text-tertiary">(optional)</span>
                            </label>
                            <input id="show-venueAddress"
                                type="text"
                                value={formData.venueAddress || ''}
                                onChange={(e) => handleInputChange('venueAddress', e.target.value)}
                                className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                            />
                            {!formData.venueAddress && (
                                <p className="text-xs text-text-tertiary mt-1">
                                    Add this later when the venue has been confirmed.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label htmlFor="show-venueCity" className="block text-sm font-medium mb-1">
                                    City {!fromCalendarEvent && '*'}
                                </label>
                                <input id="show-venueCity"
                                    type="text"
                                    required={!fromCalendarEvent}
                                    value={formData.venueCity || ''}
                                    onChange={(e) => handleInputChange('venueCity', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                />
                            </div>
                            <div>
                                <label htmlFor="show-venueState" className="block text-sm font-medium mb-1">
                                    State {!fromCalendarEvent && '*'}
                                </label>
                                <input id="show-venueState"
                                    type="text"
                                    required={!fromCalendarEvent}
                                    value={formData.venueState || ''}
                                    onChange={(e) => handleInputChange('venueState', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                />
                            </div>
                            <div>
                                <label htmlFor="show-venueCountry" className="block text-sm font-medium mb-1">
                                    Country {!fromCalendarEvent && '*'}
                                </label>
                                <input id="show-venueCountry"
                                    type="text"
                                    required={!fromCalendarEvent}
                                    value={formData.venueCountry || ''}
                                    onChange={(e) => handleInputChange('venueCountry', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="show-venueCapacity" className="block text-sm font-medium mb-1">Venue Capacity</label>
                            <input id="show-venueCapacity"
                                type="number"
                                value={formData.venueCapacity ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                    handleInputChange('venueCapacity', value);
                                }}
                                className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                placeholder="Enter venue capacity"
                            />
                        </div>

                        {/* Financial Details */}
                        <div className="mb-4">
                            <label htmlFor="show-dealType" className="block text-sm font-medium mb-1">Deal Type *</label>
                            <select id="show-dealType"
                                required
                                value={formData.dealType || 'guarantee'}
                                onChange={(e) => handleInputChange('dealType', e.target.value)}
                                className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                            >
                                <option value="guarantee">Guarantee</option>
                                <option value="door_split">Door Split</option>
                                <option value="guarantee_vs_split">Guarantee vs. Split</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="show-currency" className="mb-1 block text-sm font-medium">Currency *</label>
                            <select id="show-currency"
                                required
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                title="Currency"
                            >
                                <option value="" disabled>Select currency</option>
                                {CURRENCIES.map(curr => (
                                    <option key={curr.code} value={curr.code}>
                                        {curr.code} ({curr.symbol})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(formData.dealType === 'guarantee' || formData.dealType === 'guarantee_vs_split') && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Guarantee</label>
                                <div className="flex gap-2">
                                    <div className="min-w-0 flex-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.guarantee ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                handleInputChange('guarantee', value);
                                            }}
                                            className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                            placeholder="Enter guarantee amount"
                                        />
                                    </div>

                                </div>
                                {formData.venueCountry && currency && (
                                    <p className="text-xs text-text-tertiary mt-1">
                                        Currency set to {currency} for {formData.venueCountry}. You can change it before saving.
                                    </p>
                                )}
                            </div>
                        )}

                        {(formData.dealType === 'door_split' || formData.dealType === 'guarantee_vs_split') && (
                            <div className="mb-4">
                                <label htmlFor="show-doorSplitPercentage" className="block text-sm font-medium mb-1">Door Split %</label>
                                <input id="show-doorSplitPercentage"
                                    type="number"
                                    step="0.01"
                                    max="100"
                                    value={formData.doorSplitPercentage ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                        handleInputChange('doorSplitPercentage', value);
                                    }}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                    placeholder="Enter percentage (0-100)"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Advance Ticket Price</label>
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm text-text-tertiary">
                                        {CURRENCIES.find(c => c.code === currency)?.symbol || currency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.advanceTicketPrice ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                            handleInputChange('advanceTicketPrice', value);
                                        }}
                                        className="min-w-0 flex-1 px-3 py-2 border border-border-subtle rounded-lg"
                                        placeholder="Enter advance price"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Door Ticket Price</label>
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm text-text-tertiary">
                                        {CURRENCIES.find(c => c.code === currency)?.symbol || currency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.doorTicketPrice ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                            handleInputChange('doorTicketPrice', value);
                                        }}
                                        className="min-w-0 flex-1 px-3 py-2 border border-border-subtle rounded-lg"
                                        placeholder="Enter door price"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <h4 className="text-md font-semibold mb-2 mt-6">Venue Contact {isSelfPromoted && <span className="text-sm font-normal">(optional)</span>}</h4>

                        <div className="mb-4">
                            <label htmlFor="show-contactName" className="block text-sm font-medium mb-1">
                                Contact Name {!fromCalendarEvent && !isEditing && !isSelfPromoted && '*'}
                            </label>
                            <input id="show-contactName"
                                type="text"
                                required={!fromCalendarEvent && !isEditing && !isSelfPromoted}
                                value={formData.contactName || ''}
                                onChange={(e) => handleInputChange('contactName', e.target.value)}
                                className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                placeholder="Venue contact name"
                            />
                            {(fromCalendarEvent || isEditing || isSelfPromoted) && (
                                <p className="text-xs text-text-tertiary mt-1">
                                    Optional - can be filled in later
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="show-contactPhone" className="block text-sm font-medium mb-1">
                                    Contact Phone {!fromCalendarEvent && !isEditing && !isSelfPromoted && '*'}
                                </label>
                                <input id="show-contactPhone"
                                    type="tel"
                                    required={!fromCalendarEvent && !isEditing && !isSelfPromoted}
                                    value={formData.contactPhone || ''}
                                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                    placeholder="+1 555 0100"
                                />
                            </div>
                            <div>
                                <label htmlFor="show-contactEmail" className="block text-sm font-medium mb-1">
                                    Contact Email {!fromCalendarEvent && !isEditing && !isSelfPromoted && '*'}
                                </label>
                                <input id="show-contactEmail"
                                    type="email"
                                    required={!fromCalendarEvent && !isEditing && !isSelfPromoted}
                                    value={formData.contactEmail || ''}
                                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                                    placeholder="contact@venue.com"
                                />
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <textarea
                                rows={3}
                                value={formData.notes || ''}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mobile-create-actions grid grid-cols-2 gap-3 sm:static sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isLoading}
                                className="min-h-12 px-6 py-2 border border-border-subtle rounded-lg hover:bg-surface-elevated disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading || (!isEditing && !isCreatingForSelf && !isSelfPromoted && !selectedCounterparty && !inviteGenerated)}
                            className="min-h-12 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Show' : 'Create Show')}
                        </button>
                    </div>
                </>
            )}

        </form>
            {/* Tour creation must never nest one HTML form within another. */}
            <CreateTourModal
                isOpen={showTourModal}
                onClose={() => setShowTourModal(false)}
                onSuccess={handleTourCreated}
            />
        </>
    );
}
