'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ProfileDetails } from './ProfileHeader';

export function ProfileEditor({ entityId, profile, onSaved }: { entityId: string; profile: ProfileDetails; onSaved: (profile: ProfileDetails) => void }) {
  const [form, setForm] = useState({ name: '', bio: '', city: '', state: '', country: '', tags: '', videoUrl: '', musicUrl: '', facebook: '', instagram: '', spotify: '', bandcamp: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setForm({ name: profile.name || '', bio: profile.bio || '', city: profile.city || '', state: profile.state || '', country: profile.country || '',
      tags: (profile.tags || []).join(', '), videoUrl: profile.videoUrl || '', musicUrl: profile.musicUrl || '',
      facebook: profile.socialLinks?.facebook || '', instagram: profile.socialLinks?.instagram || '', spotify: profile.socialLinks?.spotify || '', bandcamp: profile.socialLinks?.bandcamp || '' });
  }, [profile]);
  const field = (key: keyof typeof form, placeholder: string) => <input value={form[key]} placeholder={placeholder} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="w-full rounded border border-black/10 bg-black/20 px-3 py-2" />;
  async function save() {
    setSaving(true); setMessage('');
    try {
      const response = await fetch(`/api/entities/${entityId}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId }, body: JSON.stringify({
        name: form.name, bio: form.bio, city: form.city, state: form.state, country: form.country,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), videoUrl: form.videoUrl, musicUrl: form.musicUrl,
        socialLinks: { facebook: form.facebook, instagram: form.instagram, spotify: form.spotify, bandcamp: form.bandcamp }
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || 'Save failed');
      onSaved({ ...profile, ...data }); setMessage('Workspace saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); }
    finally { setSaving(false); }
  }
  return <div className="panel-dark mb-6 space-y-3 p-4"><h2 className="text-xl font-semibold">Edit workspace</h2>
    <div className="grid gap-3 md:grid-cols-2">{field('name', 'Workspace name')}{field('city', 'City')}{field('state', 'State / region')}{field('country', 'Country')}{field('tags', 'Genres, separated by commas')}{field('videoUrl', 'Video URL')}{field('musicUrl', 'Music URL')}{field('facebook', 'Facebook URL')}{field('instagram', 'Instagram URL')}{field('spotify', 'Spotify URL')}{field('bandcamp', 'Bandcamp URL')}</div>
    <textarea value={form.bio} placeholder="Biography" onChange={(event) => setForm({ ...form, bio: event.target.value })} className="min-h-32 w-full rounded border border-black/10 bg-black/20 px-3 py-2" />
    <div className="flex items-center gap-3"><Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save workspace'}</Button>{message && <span className="text-sm text-text-secondary">{message}</span>}</div>
  </div>;
}
