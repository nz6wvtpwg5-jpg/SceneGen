'use client';

import fallbackImage from '@/app/assets/images/crowdgoeswild.jpg';

interface Asset {
    uri: string;
    extension: string;
    fileId: string;
    mimeType: string;
}

interface Member {
    name: string;
    responsibility: string;
    id: string | null;
}

interface ProfileDetails {
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
    bio: string | null;
    assets?: Asset[];
    members?: Member[];
    pressKitUrl?: string | null;
    stagePlotUrl?: string | null;
    inputListUrl?: string | null;
    tags?: string[];
    socialLinks?: Record<string, string>;
    videoUrl?: string | null;
    musicUrl?: string | null;
    upcomingShows?: Array<{ id: string; venueName: string; city: string; state?: string; country?: string; date: string; startTime?: string }>;
}

interface ProfileHeaderProps {
    profileDetails: ProfileDetails | null;
    activeProfile: {
        id: string;
        name: string;
        entityType: string;
    } | null;
    isLoading?: boolean;
}

export type { ProfileDetails, Asset };

export default function ProfileHeader({ profileDetails, activeProfile, isLoading = false }: ProfileHeaderProps) {



    const FALLBACK_IMAGE = fallbackImage.src;

    // Find header image from assets or use fallback
    const headerImage = profileDetails?.assets?.find(asset => asset.fileId === 'headerImage')?.uri;
    const backgroundImageStyle = {
        backgroundImage: `url('${headerImage || FALLBACK_IMAGE}')`
    };
    return (
        <div
            className="w-full h-[500px] bg-cover bg-center
             bg-no-repeat flex flex-col justify-end"
            style={backgroundImageStyle}
            aria-busy={isLoading}
        >
                {/* Profile Image */}
                <div className="w-full h-[132px] flex justify-between items-center px-[32px] bg-black/50">
                    <div>
                    <p className="page-heading">
                        {profileDetails?.name || activeProfile?.name || 'Select a workspace'}
                    </p>
                    <p>
                        {activeProfile?.entityType?.toUpperCase() || 'PROFILE'} from {profileDetails?.city ? (
                            `${profileDetails.city}${profileDetails.state ? `, ${profileDetails.state}` : ''}${profileDetails.country ? `, ${profileDetails.country}` : ''}`
                        ) : 'Earth'}{profileDetails?.tags?.length ? ` · ${profileDetails.tags.join(', ')}` : ''}</p>
                    </div>
                </div>
            </div>
    )
}
