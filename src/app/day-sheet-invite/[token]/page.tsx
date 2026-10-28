'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { Check, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

type Invitation = { email: string; entity_name: string; access_level: string; access_role?: 'collaborator' | 'band_member' | 'crew_member'; edit_scope: 'none' | 'advance' | 'full'; financial_access: 'hidden' | 'view' | 'edit'; require_approval?: boolean; scope_label: string; expires_at: string; status: 'pending' | 'accepted'; requires_password?: boolean; invite_as_booking_agent?: boolean; booking_agent_relationship_id?: string | null };

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: 'Not entered' };
  let score = password.length >= PASSWORD_MIN_LENGTH ? 1 : 0;
  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const normalized = password.toLowerCase();
  if (/^(.)\1+$/.test(password) || ['passwordpassword', '123456789012', 'qwertyqwerty'].some((value) => normalized.includes(value))) score = 1;
  const labels = ['Not entered', 'Needs work', 'Good', 'Strong', 'Very strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

function DaySheetInvitationContent() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [bookingAgentRelationshipId, setBookingAgentRelationshipId] = useState('');
  const switchedToken = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/day-sheet-invitations/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Invitation unavailable');
        setInvitation(data.invitation);
        if (typeof data.invitation?.booking_agent_relationship_id === 'string') setBookingAgentRelationshipId(data.invitation.booking_agent_relationship_id);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Invitation unavailable'));
  }, [token]);

  useEffect(() => {
    const currentEmail = session?.user?.email?.toLowerCase();
    const requiredEmail = invitation?.email?.toLowerCase();
    if (status !== 'authenticated' || !currentEmail || !requiredEmail || currentEmail === requiredEmail || switchedToken.current === token) return;
    switchedToken.current = token;
    setSwitchingAccount(true);
    void signOut({ redirect: false }).finally(() => setSwitchingAccount(false));
  }, [invitation, session, status, token]);

  async function accept() {
    setBusy(true);
    const response = await fetch(`/api/day-sheet-invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error?.message || 'Invitation could not be accepted');
    setAccepted(true);
    setNeedsPassword(Boolean(data.requiresPassword));
    const relationshipId = typeof data.bookingAgentRelationshipId === 'string' ? data.bookingAgentRelationshipId : '';
    setBookingAgentRelationshipId(relationshipId);
    if (!data.requiresPassword) {
      if (relationshipId) await enterBookingAgentView(relationshipId);
      else if (invitation?.booking_agent_relationship_id) await enterBookingAgentView(invitation.booking_agent_relationship_id);
      else router.replace('/external-day-sheets');
    }
  }

  async function enterBookingAgentView(relationshipId: string) {
    setBusy(true);
    setActionError('');
    try {
      const activationResponse = await fetch('/api/collaborator/booking-agent-activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relationshipId }) });
      const activation = await activationResponse.json().catch(() => ({}));
      if (!activationResponse.ok || !activation.token) throw new Error(activation.error?.message || 'Unable to activate the booking-agent view');
      const csrfResponse = await fetch('/api/auth/csrf', { cache: 'no-store' });
      const csrf = await csrfResponse.json().catch(() => ({}));
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error('Unable to prepare the booking-agent session');
      const authResponse = await fetch('/api/auth/callback/booking-agent-activation', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
        body: new URLSearchParams({ token: activation.token, csrfToken: csrf.csrfToken, callbackUrl: `${window.location.origin}/agent` }),
      });
      const authResult = await authResponse.json().catch(() => ({}));
      if (!authResponse.ok || !authResult.url || new URL(authResult.url, window.location.origin).searchParams.has('error')) throw new Error('The booking-agent session could not be opened');
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
        if (sessionResponse.ok && (await sessionResponse.json())?.user?.id) {
          await fetch('/api/booking-agent/activation-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relationshipId }) }).catch(() => null);
          window.location.replace('/agent');
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }
      throw new Error('The booking-agent session could not be confirmed');
    } catch (caught) {
      setBusy(false);
      setActionError(caught instanceof Error ? caught.message : 'Unable to open the booking-agent view');
    }
  }

  async function continueWithInvitation() {
    setBusy(true);
    setActionError('');
    const result = await signIn('invitation', { token, redirect: false });
    if (result?.error) {
      setBusy(false);
      return setActionError('This invitation could not be verified. Ask the sender for a new link.');
    }
    const verified = await fetch('/api/collaborator-auth/session', { cache: 'no-store' }).then((response) => response.json());
    if (verified?.user?.email?.toLowerCase() !== invitation?.email?.toLowerCase()) {
      setBusy(false);
      return setActionError(`Sign in as ${invitation?.email} to accept this invitation.`);
    }
    if (invitation?.status === 'accepted') {
      const accessResponse = await fetch(`/api/day-sheet-invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' });
      const access = await accessResponse.json().catch(() => ({}));
      setBusy(false);
      if (!accessResponse.ok) return setActionError(access.error?.message || 'Your day-sheet access could not be verified.');
      if (invitation.requires_password) { setNeedsPassword(true); setAccepted(true); }
      else if (access.bookingAgentRelationshipId || invitation.booking_agent_relationship_id) await enterBookingAgentView(access.bookingAgentRelationshipId || invitation.booking_agent_relationship_id || '');
      else router.replace('/external-day-sheets');
      return;
    }
    await accept();
  }

  async function createPassword() {
    setActionError('');
    if (password.length < PASSWORD_MIN_LENGTH) return setActionError('Use at least 12 characters.');
    if (password.length > PASSWORD_MAX_LENGTH) return setActionError('Use no more than 128 characters.');
    if (password !== confirmPassword) return setActionError('The passwords do not match.');
    setBusy(true);
    const response = await fetch('/api/collaborator/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setActionError(data.error?.message || 'Your password could not be saved.');
    setNeedsPassword(false);
    const relationshipId = bookingAgentRelationshipId || invitation?.booking_agent_relationship_id || '';
    if (relationshipId) await enterBookingAgentView(relationshipId);
    else router.replace('/external-day-sheets');
  }

  if (error) return <main className="scene-page"><div className="mx-auto max-w-xl rounded-3xl bg-[#fffaf2] p-10 text-center"><h1 className="text-3xl font-black">Invitation unavailable</h1><p className="mt-3 text-[#686258]">{error}</p></div></main>;
  if (!invitation || switchingAccount) return <main className="scene-page text-center">Preparing the invited collaborator account…</main>;
  const recoveredPasswordSetup = invitation.status === 'accepted' && invitation.requires_password && status === 'authenticated' && session?.user?.email?.toLowerCase() === invitation.email.toLowerCase();
  if ((accepted && needsPassword) || recoveredPasswordSetup) {
    const isBookingAgentInvitation = Boolean(invitation.invite_as_booking_agent);
    const isBandMemberInvitation = ['band_member', 'crew_member'].includes(invitation.access_role || '');
    const restrictedRoleLabel = invitation.access_role === 'crew_member' ? 'Crew-member' : 'Band-member';
    const strength = passwordStrength(password);
    const validLength = password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    return <main className="min-h-[100dvh] bg-[#f3ede3] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:grid sm:place-items-center sm:p-8">
      <form noValidate onSubmit={(event) => { event.preventDefault(); void createPassword(); }} className="w-full max-w-xl rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-5 shadow-xl sm:rounded-3xl sm:p-8">
        <div className="flex items-center gap-3"><CheckCircle2 className="shrink-0 text-[#739400]" size={34}/><p className="text-[11px] font-black uppercase tracking-[.18em] text-[#e74428]">{isBookingAgentInvitation ? 'Booking-agent invitation accepted' : isBandMemberInvitation ? `${restrictedRoleLabel} access granted` : 'Access granted'}</p></div>
        <h1 className="mt-4 text-[2rem] font-black leading-[1.05] tracking-[-.035em] sm:text-4xl">Create your password</h1>
        <p className="mt-3 text-sm leading-6 text-[#686258]">Create a password for <strong className="break-all text-[#3d3933]">{invitation.email}</strong> so you can return without this invitation link.{isBookingAgentInvitation ? ` ${invitation.entity_name} will already be in your booking-agent roster.` : ''}</p>

        <label htmlFor="new-password" className="mt-6 block text-xs font-black uppercase tracking-[.12em]">Password</label>
        <div className="relative mt-2">
          <input id="new-password" autoFocus type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} maxLength={PASSWORD_MAX_LENGTH} onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))} onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))} onChange={(event) => { setPassword(event.target.value); setActionError(''); }} aria-describedby="password-guidance password-strength" aria-invalid={password.length > 0 && !validLength} className="min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 pr-14"/>
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 grid min-w-12 place-items-center rounded-r-md text-[#686258] hover:text-[#171713]">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
        </div>
        {capsLock && <p role="status" className="mt-2 text-sm font-semibold text-[#9a5a00]">Caps Lock is on.</p>}

        <div id="password-strength" className="mt-4" aria-live="polite">
          <div className="flex items-center justify-between text-sm"><span className="font-semibold">Password strength</span><span>{strength.label}</span></div>
          <div className="mt-2 grid grid-cols-4 gap-2" aria-hidden="true">{[1, 2, 3, 4].map((level) => <span key={level} className={`h-1.5 rounded-full ${strength.score >= level ? (strength.score <= 1 ? 'bg-[#b42318]' : strength.score === 2 ? 'bg-[#d77a00]' : 'bg-[#739400]') : 'bg-[#ddd5c9]'}`}/>)}</div>
        </div>

        <div id="password-guidance" className="mt-4 flex items-start gap-2 rounded-xl bg-[#f2ebe0] px-3 py-3 text-xs leading-5 text-[#544f47]">
          <Check size={16} className={`mt-0.5 shrink-0 ${validLength ? 'text-[#739400]' : 'text-[#8a8378]'}`}/><p><strong className="text-[#171713]">12–128 characters.</strong> Passphrases, spaces, password managers and pasted passwords are supported.</p>
        </div>

        <label htmlFor="confirm-password" className="mt-5 block text-xs font-black uppercase tracking-[.12em]">Confirm password</label>
        <div className="relative mt-2">
          <input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} maxLength={PASSWORD_MAX_LENGTH} onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))} onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))} onChange={(event) => { setConfirmPassword(event.target.value); setActionError(''); }} aria-describedby="password-match" aria-invalid={confirmPassword.length > 0 && !passwordsMatch} className="min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 pr-14"/>
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 grid min-w-12 place-items-center rounded-r-md text-[#686258] hover:text-[#171713]">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
        </div>
        <p id="password-match" className={`mt-2 text-sm font-semibold ${passwordsMatch ? 'text-[#587400]' : confirmPassword ? 'text-[#b42318]' : 'text-[#686258]'}`} aria-live="polite">{passwordsMatch ? 'Passwords match.' : confirmPassword ? 'Passwords do not match yet.' : 'Enter the same password again.'}</p>
        {actionError && <p role="alert" className="mt-4 rounded-md border border-[#ff9d8c] bg-[#fff1ec] p-3 text-sm font-semibold">{actionError}</p>}
        <button disabled={busy} className="mt-5 min-h-12 w-full rounded-full bg-[#ff5738] px-4 font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Create password'}</button>
      </form>
    </main>;
  }
  if (accepted) return <main className="scene-page"><div className="mx-auto max-w-xl rounded-3xl bg-[#f1f6df] p-10 text-center"><CheckCircle2 className="mx-auto text-[#739400]" size={42}/><h1 className="mt-4 text-3xl font-black">Access granted</h1><p className="mt-2">Opening your day sheets…</p></div></main>;

  const isBookingAgentInvitation = Boolean(invitation.invite_as_booking_agent);
  const isBandMemberInvitation = ['band_member', 'crew_member'].includes(invitation.access_role || '');
  const restrictedRoleLabel = invitation.access_role === 'crew_member' ? 'Crew member' : 'Band member';
  const destinationLabel = isBookingAgentInvitation ? 'booking-agent workspace' : 'day sheets';
  const signedInEmail = session?.user?.email?.toLowerCase();
  const invitedEmail = invitation.email.toLowerCase();
  const invitationKicker = isBookingAgentInvitation ? 'Booking-agent invitation' : isBandMemberInvitation ? `${restrictedRoleLabel} access` : 'External collaboration';
  const invitationHeading = invitation.status === 'accepted' ? (isBookingAgentInvitation ? `You represent ${invitation.entity_name}.` : 'Your access is already active.') : isBookingAgentInvitation ? `${invitation.entity_name} has invited you to become their booking agent.` : isBandMemberInvitation ? `${invitation.entity_name} has invited you to view their day sheets.` : `${invitation.entity_name} has invited you.`;
  const primaryLabel = busy ? 'Verifying…' : invitation.status === 'accepted' ? `Continue to my ${destinationLabel}` : isBookingAgentInvitation ? 'Review booking-agent invitation' : 'Accept invitation';
  return <main className="min-h-[100dvh] bg-[#f3ede3] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:grid sm:place-items-center sm:p-8"><div className="w-full max-w-xl rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-5 shadow-xl sm:rounded-3xl sm:p-8"><div className="flex items-center gap-3"><ShieldCheck className="shrink-0 text-[#ff5738]" size={32}/><p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ff5738]">{invitationKicker}</p></div><h1 className="mt-4 text-[2rem] font-black leading-[1.04] tracking-[-.035em] sm:text-4xl">{invitationHeading}</h1>{isBookingAgentInvitation && <div className="mt-5 rounded-xl border border-[#ffc4b8] bg-[#fff1ec] p-4"><p className="font-bold">What accepting does</p><p className="mt-1 text-sm leading-6 text-[#686258]">Adds {invitation.entity_name} to your roster and opens your booking-agent workspace.</p></div>}<div className="mt-5 rounded-xl bg-[#f2ebe0] p-4"><p className="font-bold">{invitation.scope_label}</p>{isBandMemberInvitation ? <p className="mt-2 text-sm leading-6 text-[#686258]">Read-only day sheets, including schedule, flights, transport and accommodation. Private and commercial information stays hidden.</p> : <><p className="mt-2 text-sm text-[#686258]">Day sheet: {invitation.edit_scope === 'none' ? 'view only' : invitation.edit_scope === 'advance' ? 'edit advance information' : 'edit the entire day sheet'}.</p><p className="mt-1 text-sm text-[#686258]">Finances: {invitation.financial_access === 'hidden' ? 'hidden' : invitation.financial_access === 'view' ? 'view only' : 'can edit'}.</p></>}<p className="mt-2 text-xs font-semibold text-[#777064]">Access expires {new Date(invitation.expires_at).toLocaleDateString()}.</p></div>{actionError && <p className="mt-4 rounded-xl border border-[#ff9d8c] bg-[#fff1ec] p-3 text-sm font-semibold">{actionError}</p>}<p className="mt-5 break-all text-center text-xs text-[#686258]">Invitation for <strong>{invitation.email}</strong></p>{status === 'loading' ? <button disabled className="mt-3 min-h-12 w-full rounded-full bg-[#171713] px-4 font-bold text-white opacity-60">Checking invitation…</button> : status === 'unauthenticated' ? <button disabled={busy} onClick={continueWithInvitation} className="mt-3 min-h-12 w-full rounded-full bg-[#171713] px-4 font-bold text-white">{primaryLabel}</button> : signedInEmail !== invitedEmail ? <div className="mt-4 rounded-xl border border-[#ff9d8c] bg-[#fff1ec] p-3 text-sm font-semibold"><p>This collaborator session belongs to {signedInEmail}.</p><button disabled={busy} onClick={continueWithInvitation} className="mt-2 min-h-11 underline">Continue as the invited account</button></div> : invitation.status === 'accepted' ? <button disabled={busy} onClick={continueWithInvitation} className="mt-3 min-h-12 w-full rounded-full bg-[#171713] px-4 font-bold text-white">Continue to my {destinationLabel}</button> : <button disabled={busy} onClick={accept} className="mt-3 min-h-12 w-full rounded-full bg-[#ff5738] px-4 font-bold text-white">{busy ? 'Accepting…' : isBookingAgentInvitation ? 'Accept booking-agent invitation' : 'Accept invitation'}</button>}</div></main>;
}

export default function DaySheetInvitationPage() {
  return <SessionProvider basePath="/api/collaborator-auth"><DaySheetInvitationContent /></SessionProvider>;
}
