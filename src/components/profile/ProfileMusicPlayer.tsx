export default function ProfileMusicPlayer({ musicUrl }: { musicUrl?: string | null }) {
    if (!musicUrl) return null;
    return <div className="w-full bg-[#262626] px-8 py-4"><audio className="w-full" controls preload="metadata" src={musicUrl}>Your browser does not support audio playback.</audio></div>;
}
