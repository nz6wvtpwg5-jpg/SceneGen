'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';
import type { Invite } from '@/types/invite';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Mail, Megaphone, Music2, ShieldCheck } from 'lucide-react';

type EntityType = 'artist' | 'promoter' | 'booking_agent' | null;

const personaOptions = [
  {
    type: 'artist' as const,
    eyebrow: 'Artists & bands',
    title: "I'm an Artist",
    description: 'Plan shows, tours, contacts and finances around one working record.',
    Icon: Music2,
  },
  {
    type: 'booking_agent' as const,
    eyebrow: 'Booking agents',
    title: "I'm a Booking Agent",
    description: 'See assigned artists and shows without mixing their access, territories or fees.',
    Icon: BriefcaseBusiness,
  },
  {
    type: 'promoter' as const,
    eyebrow: 'Promoters',
    title: "I'm a Promoter",
    description: 'Manage shows, artist relationships and the details that move each date forward.',
    Icon: Megaphone,
  },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'choose' | 'details'>('choose');
  const [entityType, setEntityType] = useState<EntityType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingAgentCheckComplete, setExistingAgentCheckComplete] = useState(false);
  const shouldCheckExistingAgent = Boolean(session?.user?.id) && !searchParams.get('invite');
  const checkingExistingAgent = status === 'loading' || (shouldCheckExistingAgent && !existingAgentCheckComplete);

  useEffect(() => {
    if (status === 'loading') return;
    if (!shouldCheckExistingAgent) return;
    let cancelled = false;
    fetch('/api/booking-agent/profile', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data?.profile) router.replace('/agent');
        else setExistingAgentCheckComplete(true);
      })
      .catch(() => { if (!cancelled) setExistingAgentCheckComplete(true); });
    return () => { cancelled = true; };
  }, [router, shouldCheckExistingAgent, status]);

  // Week 3, Task 3.9: Invite context
  const inviteToken = searchParams.get('invite');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    agencyName: '',
    bio: '',
    city: '',
    state: '',
    country: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [locationInput, setLocationInput] = useState('');

  // Week 3, Task 3.9: Fetch invite if token present
  useEffect(() => {
    const fetchInviteDetails = async () => {
      if (!inviteToken || !session?.user?.id) return;

      setLoadingInvite(true);
      try {
        const response = await fetch(`/api/invites/${inviteToken}`, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const inviteData = await response.json();
          setInvite(inviteData);

          // Week 3, Task 3.9: Enforce entity type based on invite
          // If inviter is artist → user must be promoter
          // If inviter is promoter → user must be artist
          const requiredType = inviteData.inviterType === 'artist' ? 'promoter' : 'artist';
          setEntityType(requiredType);
          setStep('details');
        }
      } catch (err) {
        console.error('Error fetching invite:', err);
      } finally {
        setLoadingInvite(false);
      }
    };

    fetchInviteDetails();
  }, [inviteToken, session?.user?.id]);

  const handleTypeSelect = (type: EntityType) => {
    setEntityType(type);
    setStep('details');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLocationSelect = (place: google.maps.places.PlaceResult) => {
    if (!place.geometry?.location) return;

    // Extract location components
    let city = '';
    let state = '';
    let country = '';

    place.address_components?.forEach((component) => {
      const types = component.types;
      if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      }
    });

    setFormData({
      ...formData,
      city: city || place.name || '',
      state,
      country,
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id || !entityType) {
      setError('Authentication error. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const endpoint = entityType === 'artist' ? '/api/artist/add'
        : entityType === 'promoter' ? '/api/promoter/add' : '/api/booking-agent/profile';
      const submittedData = { ...formData, city: formData.city || locationInput.trim() };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submittedData),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Week 1, Task 1.7: Handle 409 Conflict (user already owns an entity)
        if (response.status === 409) {
          setError('You already own an entity. Redirecting to dashboard...');
          setTimeout(() => {
            sessionStorage.setItem('onboardingCompleted', Date.now().toString());
            window.location.href = '/dashboard';
          }, 2000);
          return;
        }

        throw new Error(errorData.error?.message || errorData.error || `Failed to create ${entityType} profile`);
      }

      console.log('✅ Entity created successfully!');

      if (entityType === 'booking_agent') {
        sessionStorage.setItem('onboardingCompleted', Date.now().toString());
        router.push('/agent');
        return;
      }

      // Week 3, Task 3.9: If invite context, auto-accept the invite
      if (inviteToken && invite) {
        try {
          const entityData = await response.json();
          const entityId = entityData.id;

          const acceptResponse = await fetch(`/api/invites/${inviteToken}/accept`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ entityId }),
          });

          if (acceptResponse.ok) {
            console.log('✅ Invite auto-accepted successfully!');

            // Redirect based on invite type
            if (invite.inviteType === 'show_invite' && invite.showId) {
              sessionStorage.setItem('onboardingCompleted', Date.now().toString());
              window.location.href = `/shows/${invite.showId}`;
            } else {
              sessionStorage.setItem('onboardingCompleted', Date.now().toString());
              window.location.href = '/contacts';
            }
            return;
          }
        } catch (acceptErr) {
          console.error('Failed to auto-accept invite:', acceptErr);
          // Fall through to normal redirect
        }
      }

      // Success! Redirect to dashboard and force a full page refresh to reload entities
      sessionStorage.setItem('onboardingCompleted', Date.now().toString());
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Error creating entity:', err);
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading invite
  if (loadingInvite || checkingExistingAgent) {
    return (
      <div className="mobile-safe-top mobile-safe-bottom flex min-h-[100dvh] items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-text-secondary">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Week 3, Task 3.9: If invite present, show enforced entity type
  if (invite && step === 'choose') {
    // Use requiredEntityType directly or fallback to 'any'
    const requiredType = invite.requiredEntityType !== 'any' ? invite.requiredEntityType : 'artist';
    return (
      <div className="mobile-safe-top mobile-safe-bottom min-h-[100dvh] bg-[#f4efe6] px-5 py-10 text-[#151713] sm:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-black/10 bg-[#fbf8f2] shadow-[0_24px_80px_rgba(20,20,16,0.10)]">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
            <div className="bg-[#11130f] p-8 text-white sm:p-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff5a36]"><Mail size={22} /></div>
              <p className="mt-16 text-[10px] font-black uppercase tracking-[0.24em] text-[#ff6a48]">SceneGen invitation</p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.045em]">Join the working record.</h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/60">Create the profile required by this invitation, then SceneGen will complete the connection securely.</p>
            </div>
            <div className="p-8 sm:p-12">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">Your invitation</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">You've been invited</h2>
            <p className="mt-4 text-lg text-[#5f5c55]">
              {invite.inviterName ? (
                <><strong>{invite.inviterName}</strong> has invited you to connect on SceneGen.</>
              ) : (
                <>You've been invited to connect on SceneGen.</>
              )}
            </p>
            <p className="mt-2 text-[#777168]">
              To accept this invite, you need to create a <strong>{requiredType}</strong> profile.
            </p>
            <button
              onClick={() => handleTypeSelect(requiredType)}
              className="group mt-10 flex w-full items-center justify-between rounded-full bg-[#ff5a36] px-6 py-4 text-left font-black text-white shadow-[0_12px_30px_rgba(255,90,54,0.24)] transition hover:bg-[#e84b29]"
            >
              <span>
                Create {requiredType === 'artist' ? 'Artist' : 'Promoter'} Profile
              </span>
              <ArrowRight size={19} />
            </button>
            <div className="mt-8 flex items-center gap-3 border-t border-black/10 pt-6 text-sm text-[#777168]"><ShieldCheck size={18} className="text-[#739400]" /> Access remains limited to the connection in this invitation.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="mobile-safe-bottom min-h-[100dvh] bg-[#f4efe6] text-[#151713]">
        <div className="mobile-safe-top border-b border-black/10 bg-[#11130f] px-5 py-5 text-white sm:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div><p className="text-sm font-black tracking-[0.18em]">SCENEGEN</p><p className="mt-1 text-[8px] font-bold uppercase tracking-[0.28em] text-white/45">Live operations</p></div>
            <p className="hidden text-xs font-semibold text-white/45 sm:block">One account. The right working view.</p>
          </div>
        </div>
        <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff5a36]">Set up your working view</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">How do you work in live music?</h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-[#69655d]">Choose the role that best describes your day-to-day work. You can still collaborate with every other part of the live music team.</p>
          </div>
          <div className="mt-12 grid overflow-hidden rounded-2xl border border-black/10 bg-[#fbf8f2] shadow-[0_18px_55px_rgba(20,20,16,0.08)] md:grid-cols-3">
            {personaOptions.map(({ type, eyebrow, title, description, Icon }, index) => (
              <button key={type} onClick={() => { if (type === 'booking_agent') setFormData((current) => ({ ...current, name: session?.user?.name || current.name })); handleTypeSelect(type); }} className={`group flex min-h-[230px] flex-col p-7 text-left transition hover:bg-white focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff5a36] sm:min-h-[300px] sm:p-9 ${index ? 'border-t border-black/10 md:border-l md:border-t-0' : ''}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-black/10 bg-[#f1eadf] text-[#ff5a36] transition group-hover:border-[#ff5a36]/30 group-hover:bg-[#ff5a36] group-hover:text-white"><Icon size={22} strokeWidth={2} /></div>
                <p className="mt-10 text-[10px] font-black uppercase tracking-[0.2em] text-[#777168]">{eyebrow}</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.035em]">{title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#69655d]">{description}</p>
                <span className="mt-8 flex items-center gap-2 text-sm font-black text-[#151713]">Choose this role <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
              </button>
            ))}
          </div>
          <p className="mt-7 text-center text-xs text-[#777168]">Your selection controls your starting workspace. Access to other artists is always granted explicitly.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="mobile-safe-top mobile-safe-bottom min-h-[100dvh] bg-[#f4efe6] px-5 py-10 text-[#151713] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          {!invite && (
            <Button
              variant="ghost"
              onClick={() => setStep('choose')}
              className="mb-4"
            >
              <ArrowLeft size={16} /> Back
            </Button>
          )}
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">Profile setup</p>
          <h1 className="mb-2 mt-3 text-4xl font-black tracking-[-0.045em]">
            {entityType === 'artist' ? 'Create Your Artist Profile' : entityType === 'promoter' ? 'Create Your Promoter Profile' : 'Create Your Booking Agent Profile'}
          </h1>
          <p className="text-text-secondary">
            {entityType === 'artist'
              ? 'Tell us about your music project'
              : entityType === 'promoter' ? 'Tell us about your promotion business' : 'Tell us how bands should identify you'
            }
          </p>
          {invite && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {invite.inviterName ? (
                  <>After creating your profile, you'll be automatically connected with <strong>{invite.inviterName}</strong>.</>
                ) : (
                  <>After creating your profile, you'll be automatically connected with the inviter.</>
                )}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-black/10 bg-[#fbf8f2] p-6 shadow-[0_18px_55px_rgba(20,20,16,0.08)] sm:p-9">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              {entityType === 'artist' ? 'Artist / Band Name' : entityType === 'promoter' ? 'Business Name' : 'Your name'} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder={entityType === 'artist' ? 'e.g., The Electric Horizon' : entityType === 'promoter' ? 'e.g., Rock City Promotions' : 'e.g., Jacob Mackintosh'}
              className="min-h-12 w-full rounded-md border border-black/10 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a36]/30"
            />
          </div>

          {entityType === 'booking_agent' && <div>
            <label htmlFor="agencyName" className="block text-sm font-medium mb-2">Agency name <span className="font-normal text-text-secondary">(optional)</span></label>
            <input type="text" id="agencyName" name="agencyName" maxLength={200} value={formData.agencyName} onChange={handleInputChange} placeholder="e.g., Northern Music" className="min-h-12 w-full rounded-md border border-black/10 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a36]/30" />
          </div>}

          {/* Bio Field */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={formData.bio}
              onChange={handleInputChange}
              placeholder={entityType === 'artist'
                ? 'Tell us about your music, style, and what makes you unique...'
                : entityType === 'promoter' ? 'Describe your promotion business and the types of shows you organize...'
                  : 'A short introduction for the artists and teams you work with...'
              }
              className="w-full rounded-md border border-black/10 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff5a36]/30"
            />
          </div>

          {/* Location Fields with Autocomplete */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Location
            </label>
            <PlacesAutocomplete
              value={locationInput}
              onChange={setLocationInput}
              onPlaceSelect={handleLocationSelect}
              placeholder="Start typing your city..."
            />
            <p className="text-xs text-text-secondary mt-1">
              Start typing to search for your location
            </p>
          </div>

          {/* Display selected location */}
          {formData.city && (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  readOnly
                  className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/60 text-text-secondary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State / Province</label>
                <input
                  type="text"
                  value={formData.state}
                  readOnly
                  className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/60 text-text-secondary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  readOnly
                  className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/60 text-text-secondary"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-semantic-error/10 border border-semantic-error rounded-lg text-semantic-error">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name}
              className="min-h-12 flex-1 rounded-full bg-[#ff5a36] font-black text-white hover:bg-[#e84b29]"
              size="lg"
            >
              {isSubmitting ? 'Creating Profile...' : invite ? 'Create Profile & Accept Invite' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
