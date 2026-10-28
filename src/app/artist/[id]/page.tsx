'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileMusicPlayer from "@/components/profile/ProfileMusicPlayer";
import ArtistGenres from "@/components/profile/ArtistGenres";
import ArtistBio from "@/components/profile/ArtistBio";
import type { ProfileDetails } from '@/components/profile/ProfileHeader';
import ArtistMembers from '@/components/profile/ArtistMembers';
import { Download } from 'lucide-react';

export default function PublicProfile() {
    const params = useParams();
    const entityId = params.id as string;
    const [profileDetails, setProfileDetails] = useState<ProfileDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Extract entity type from URL or default to artist
    const entityType = 'artist'; // You can make this dynamic if needed

    useEffect(() => {
        async function fetchPublicProfile() {
            if (!entityId) return;

            setIsLoading(true);
            setError(null);

            try {
                const endpoint = entityType.toLowerCase() === 'artist'
                    ? `/api/artist/get/${entityId}`
                    : `/api/promoter/get/${entityId}`;

                const response = await fetch(endpoint, {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Profile not found');
                    }
                    throw new Error('Failed to fetch profile');
                }

                const data = await response.json();
                setProfileDetails(data);
            } catch (err) {
                console.error('Error fetching public profile:', err);
                setError(err instanceof Error ? err.message : 'Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        }

        fetchPublicProfile();
    }, [entityId, entityType]);

    if (isLoading) {
        return (
            <div className="scene-page h-[92.5vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-text-tertiary">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="scene-page h-[92.5vh] flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-semantic-error mb-2">Error</h2>
                    <p className="text-text-tertiary">{error}</p>
                </div>
            </div>
        );
    }

    // Find document URLs from assets
    const pressKitUrl = profileDetails?.assets?.find(a => a.fileId === 'pressKit')?.uri;
    const stagePlotUrl = profileDetails?.assets?.find(a => a.fileId === 'stagePlot')?.uri;
    const inputListUrl = profileDetails?.assets?.find(a => a.fileId === 'inputList')?.uri;
    const hospitalityRiderUrl = profileDetails?.assets?.find(a => a.fileId === 'hospitalityRider')?.uri;
    const techRiderUrl = profileDetails?.assets?.find(a => a.fileId === 'techRider')?.uri;

    const activeProfile = profileDetails ? {
        id: entityId,
        name: profileDetails.name,
        entityType: entityType
    } : null;

    return (
        <div className="scene-page h-[calc(100vh-5rem)] overflow-y-auto scrollable">
            <ProfileHeader
                profileDetails={profileDetails}
                activeProfile={activeProfile}
                isLoading={isLoading}
            />
            <ProfileMusicPlayer musicUrl={profileDetails?.musicUrl} />

            <div className="w-full flex gap-6 justify-around">
            <div className="w-1/3 space-y-6">
                <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Message from the Band</h3>
                    {profileDetails?.videoUrl ? <a href={profileDetails.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Watch video</a> : <p className="text-text-tertiary">No video added</p>}
                </div>
                <ArtistGenres tags={profileDetails?.tags} />

                <ArtistBio
                    bio={profileDetails?.bio || 'No Bio Added'}
                />
                <ArtistMembers
                    members={profileDetails?.members?.length ? profileDetails.members : 'No Members Added'}
                />
            </div>


            <div className="w-1/3 space-y-6">
                <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Upcoming Shows</h3>
                    <div className="space-y-4">
                        {profileDetails?.upcomingShows?.length ? profileDetails.upcomingShows.map((show) => <div key={show.id} className="pb-3 border-b border-border-subtle"><p className="text-sm text-text-tertiary">{new Date(show.date).toLocaleDateString()}</p><p className="font-semibold mt-1">{show.venueName || show.city || 'Location TBC'}{show.venueName && show.city ? `, ${show.city}` : ''}</p></div>) : <p className="text-text-tertiary">No upcoming shows</p>}
                    </div>
                </div>
                <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Let's Get Social</h3>
                    <ul className="space-y-2">
                        {Object.entries(profileDetails?.socialLinks || {}).length ? Object.entries(profileDetails?.socialLinks || {}).map(([network, url]) => <li key={network}><a href={url} target="_blank" rel="noopener noreferrer" className="capitalize text-primary hover:underline">{network}</a></li>) : <li className="text-text-tertiary">No social links added</li>}
                    </ul>
                </div>
            </div>



            <div className="w-1/3 space-y-6">
                <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Downloads</h3>
                    <div className="space-y-4">
                        {pressKitUrl ? (
                            <a
                                href={pressKitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-[180px] bg-surface-elevated rounded-md flex flex-col items-center justify-center text-primary border border-border-subtle hover:border-primary transition-colors group"
                            >
                                <Download className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Press Kit</span>
                                <span className="text-xs text-text-tertiary mt-1">Click to download</span>
                            </a>
                        ) : (
                            <div className="w-full h-[180px] bg-surface-elevated/50 rounded-md flex items-center justify-center text-text-tertiary border border-border-subtle">
                                <span className="text-sm">Press Kit Not Available</span>
                            </div>
                        )}

                        {stagePlotUrl ? (
                            <a
                                href={stagePlotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-[180px] bg-surface-elevated rounded-md flex flex-col items-center justify-center text-primary border border-border-subtle hover:border-primary transition-colors group"
                            >
                                <Download className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Stage Plot</span>
                                <span className="text-xs text-text-tertiary mt-1">Click to download</span>
                            </a>
                        ) : (
                            <div className="w-full h-[180px] bg-surface-elevated/50 rounded-md flex items-center justify-center text-text-tertiary border border-border-subtle">
                                <span className="text-sm">Stage Plot Not Available</span>
                            </div>
                        )}

                        {inputListUrl ? (
                            <a
                                href={inputListUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-[180px] bg-surface-elevated rounded-md flex flex-col items-center justify-center text-primary border border-border-subtle hover:border-primary transition-colors group"
                            >
                                <Download className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Input List</span>
                                <span className="text-xs text-text-tertiary mt-1">Click to download</span>
                            </a>
                        ) : (
                            <div className="w-full h-[180px] bg-surface-elevated/50 rounded-md flex items-center justify-center text-text-tertiary border border-border-subtle">
                                <span className="text-sm">Input List Not Available</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Riders</h3>
                    <div className="space-y-2">
                        {hospitalityRiderUrl ? <a href={hospitalityRiderUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">Hospitality Rider</a> : <p className="text-text-tertiary">Hospitality Rider Not Available</p>}
                        {techRiderUrl ? <a href={techRiderUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">Tech Rider</a> : <p className="text-text-tertiary">Tech Rider Not Available</p>}
                    </div>
                </div>
            </div>
            </div>
        </div>
    )
}
