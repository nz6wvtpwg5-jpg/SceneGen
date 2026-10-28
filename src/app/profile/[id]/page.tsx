'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileMusicPlayer from "@/components/profile/ProfileMusicPlayer";
import ArtistGenres from "@/components/profile/ArtistGenres";
import ArtistBio from "@/components/profile/ArtistBio";
import type { ProfileDetails } from '@/components/profile/ProfileHeader';
import ArtistMembers from '@/components/profile/ArtistMembers';
import { Download } from 'lucide-react';

export default function ViewProfile() {
    const params = useParams();
    const entityId = params.id as string;
    const { data: session } = useSession();
    const [profileDetails, setProfileDetails] = useState<ProfileDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [entityInfo, setEntityInfo] = useState<{ id: string; name: string; entityType: string } | null>(null);

    useEffect(() => {
        async function fetchProfileDetails() {
            if (!entityId || !session?.user?.id) return;

            setIsLoading(true);
            setError(null);

            try {
                // First, we need to determine the entity type
                // For now, try artist first, then promoter
                let response = await fetch(`/api/artist/get/${entityId}`, {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                let entityType = 'artist';

                if (!response.ok) {
                    // Try promoter if artist fails
                    response = await fetch(`/api/promoter/get/${entityId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    entityType = 'promoter';
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Profile fetch error:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorData
                    });
                    throw new Error(errorData.error || 'Failed to fetch profile details');
                }

                const data = await response.json();
                setProfileDetails(data);
                setEntityInfo({
                    id: entityId,
                    name: data.name,
                    entityType: entityType
                });
            } catch (err) {
                console.error('Error fetching profile details:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch profile details');
            } finally {
                setIsLoading(false);
            }
        }

        fetchProfileDetails();
    }, [entityId, session?.user?.id]);

    // Helper function to get document URL from assets
    const getDocumentUrl = (fileId: string) => {
        return profileDetails?.assets?.find(asset => asset.fileId === fileId)?.uri;
    };

    const pressKitUrl = getDocumentUrl('pressKit');
    const stagePlotUrl = getDocumentUrl('stagePlot');
    const inputListUrl = getDocumentUrl('inputList');
    const hospitalityRiderUrl = getDocumentUrl('hospitalityRider');
    const techRiderUrl = getDocumentUrl('techRider');

    if (!session) {
        return (
            <div className="scene-page">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-foreground">Sign In Required</h2>
                    <p className="text-text-secondary mt-2">Please sign in to view profiles</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="scene-page">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-semantic-error">Error</h2>
                    <p className="text-text-secondary mt-2">{error}</p>
                </div>
            </div>
        );
    }

    return(
        <div className="scene-page h-[calc(100vh-5rem)] overflow-y-auto scrollable">
            <ProfileHeader
                profileDetails={profileDetails}
                activeProfile={entityInfo}
                isLoading={isLoading}
            />
            <ProfileMusicPlayer musicUrl={profileDetails?.musicUrl} />

            <div className="w-full flex gap-6 justify-around">
            <div className="w-1/3 space-y-6">
                <div className="panel-dark p-4">
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Message from the Band</h3>
                    {profileDetails?.videoUrl ? <a href={profileDetails.videoUrl} target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">Watch video</a> : <p className="text-text-muted">No video added</p>}
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
                <div className="panel-dark p-4">
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Upcoming Shows</h3>
                    <div className="space-y-4">
                        {profileDetails?.upcomingShows?.length ? profileDetails.upcomingShows.map((show) => <div key={show.id} className="pb-3 border-b border-black/10"><p className="text-sm text-text-secondary">{new Date(show.date).toLocaleDateString()}</p><p className="font-semibold mt-1 text-foreground">{show.venueName || show.city || 'Location TBC'}{show.venueName && show.city ? `, ${show.city}` : ''}</p></div>) : <p className="text-text-muted">No upcoming shows</p>}
                    </div>
                </div>
                <div className="panel-dark p-4">
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Let's Get Social</h3>
                    <ul className="space-y-2">
                        {Object.entries(profileDetails?.socialLinks || {}).length ? Object.entries(profileDetails?.socialLinks || {}).map(([network, url]) => <li key={network}><a href={url} target="_blank" rel="noopener noreferrer" className="capitalize text-accent-cyan hover:underline">{network}</a></li>) : <li className="text-text-muted">No social links added</li>}
                    </ul>
                </div>
            </div>



            <div className="w-1/3 space-y-6">
                <div className="panel-dark p-4">
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Downloads</h3>
                    <div className="space-y-4">
                        {pressKitUrl ? (
                            <a
                                href={pressKitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-[180px] bg-white/60 rounded-md flex flex-col items-center justify-center text-accent-cyan border border-black/10 hover:border-accent-cyan/50 transition-colors group"
                            >
                                <Download className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Press Kit</span>
                                <span className="text-xs text-text-secondary mt-1">Click to download</span>
                            </a>
                        ) : (
                            <div className="w-full h-[180px] bg-white/60 rounded-md flex items-center justify-center text-text-muted border border-black/10">
                                <span className="text-sm">Press Kit - Not Available</span>
                            </div>
                        )}

                        {stagePlotUrl ? (
                            <a
                                href={stagePlotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-[180px] bg-white/60 rounded-md flex flex-col items-center justify-center text-accent-cyan border border-black/10 hover:border-accent-cyan/50 transition-colors group"
                            >
                                <Download className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Stage Plot</span>
                                <span className="text-xs text-text-secondary mt-1">Click to download</span>
                            </a>
                        ) : (
                            <div className="w-full h-[180px] bg-white/60 rounded-md flex items-center justify-center text-text-muted border border-black/10">
                                <span className="text-sm">Stage Plot - Not Available</span>
                            </div>
                        )}

                        {inputListUrl ? (
                            <a
                                href={inputListUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-[180px] bg-white/60 rounded-md flex flex-col items-center justify-center text-accent-cyan border border-black/10 hover:border-accent-cyan/50 transition-colors group"
                            >
                                <Download className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Input List</span>
                                <span className="text-xs text-text-secondary mt-1">Click to download</span>
                            </a>
                        ) : (
                            <div className="w-full h-[180px] bg-white/60 rounded-md flex items-center justify-center text-text-muted border border-black/10">
                                <span className="text-sm">Input List - Not Available</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="panel-dark p-4">
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Riders</h3>
                    <div className="space-y-2">
                        {hospitalityRiderUrl ? <a href={hospitalityRiderUrl} target="_blank" rel="noopener noreferrer" className="block text-accent-cyan hover:text-accent-blue transition-colors">Hospitality Rider</a> : <p className="text-text-muted">Hospitality Rider Not Available</p>}
                        {techRiderUrl ? <a href={techRiderUrl} target="_blank" rel="noopener noreferrer" className="block text-accent-cyan hover:text-accent-blue transition-colors">Tech Rider</a> : <p className="text-text-muted">Tech Rider Not Available</p>}
                    </div>
                </div>
            </div>
            </div>
        </div>
    )
}
