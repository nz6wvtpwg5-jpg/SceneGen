import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

type MusicBrainzGenre = { id?: string; name?: string; count?: number };
type GenreSuggestion = { id: string; name: string; hashtag: string; source: 'MusicBrainz' | 'SceneGen' };

const CURATED_GENRES: Record<string, string[]> = {
  'thrash metal': ['thrash', 'thrashmetal', 'speed thrash'],
  'death metal': ['death', 'deathmetal'],
  'black metal': ['black', 'blackmetal'],
  'doom metal': ['doom', 'doommetal'],
  'sludge metal': ['sludge', 'sludgemetal'],
  'stoner metal': ['stoner', 'stonermetal'],
  'stoner rock': ['stonerrock', 'desert rock'],
  'heavy metal': ['metal', 'heavymetal'],
  'speed metal': ['speed', 'speedmetal'],
  'power metal': ['powermetal'],
  'progressive metal': ['prog metal', 'progmetal'],
  'post-metal': ['post metal', 'postmetal'],
  'drone metal': ['drone', 'dronemetal'],
  'metalcore': ['metal core'],
  'deathcore': ['death core'],
  'hardcore punk': ['hardcore', 'hardcorepunk'],
  'grindcore': ['grind'],
  'crossover thrash': ['crossover', 'crossoverthrash'],
  'nu metal': ['numetal'],
  'alternative metal': ['alt metal'],
  'industrial metal': ['industrialmetal'],
  'symphonic metal': ['symphonicmetal'],
  'folk metal': ['folkmetal'],
  'gothic metal': ['gothicmetal'],
  'alternative rock': ['alt rock'],
  'psychedelic rock': ['psych rock'],
  'progressive rock': ['prog rock'],
  'punk rock': ['punk'],
  'hard rock': ['hardrock'],
  'indie rock': ['indie'],
  'ambient': [], 'blues': [], 'electronic': [], 'experimental': [],
  'folk': [], 'funk': [], 'hip hop': ['hiphop'], 'jazz': [],
  'reggae': [], 'rock': [], 'soul': [],
};
const cache = new Map<string, { expires: number; genres: GenreSuggestion[] }>();

function hashtag(name: string) {
  return `#${name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '').slice(0, 40)}`;
}

function curated(query: string): GenreSuggestion[] {
  const normalized = query.replace(/[^a-z0-9]+/g, '');
  return Object.entries(CURATED_GENRES)
    .filter(([name, aliases]) => [name,...aliases].some(value => value.includes(query) || value.replace(/[^a-z0-9]+/g,'').includes(normalized)))
    .slice(0, 12)
    .map(([name]) => ({ id: 'scenegen:' + hashtag(name), name, hashtag: hashtag(name), source: 'SceneGen' }));
}
function merge(curatedGenres: GenreSuggestion[], external: GenreSuggestion[]) {
  const unique = new Map<string, GenreSuggestion>();
  for (const genre of [...curatedGenres,...external]) if (!unique.has(genre.hashtag)) unique.set(genre.hashtag,genre);
  return [...unique.values()].slice(0,12);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 });
  const query = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase().replace(/^#/, '').slice(0, 60);
  if (query.length < 2) return NextResponse.json({ genres: [], source: 'MusicBrainz' });
  const local = curated(query);
  const cached = cache.get(query);
  if (cached && cached.expires > Date.now()) return NextResponse.json({ genres: cached.genres, source: 'SceneGen + MusicBrainz' });

  try {
    const response = await fetch(`https://musicbrainz.org/ws/2/genre?query=${encodeURIComponent(query)}&fmt=json&limit=20`, {
      headers: { 'User-Agent': 'SceneGen/1.0 (https://scenegen.io)', Accept: 'application/json' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`MusicBrainz returned ${response.status}`);
    const body = await response.json() as { genres?: MusicBrainzGenre[] };
    const genres = (body.genres || []).filter((genre): genre is Required<Pick<MusicBrainzGenre, 'id' | 'name'>> & MusicBrainzGenre => Boolean(genre.id && genre.name))
      .sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 12)
      .map((genre) => ({ id: genre.id, name: genre.name.trim(), hashtag: hashtag(genre.name), source: 'MusicBrainz' as const }));
    const result = merge(local, genres);
    cache.set(query, { expires: Date.now() + 86_400_000, genres: result });
    return NextResponse.json({ genres: result, source: 'SceneGen + MusicBrainz' });
  } catch (error) {
    console.error('MusicBrainz genre lookup failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ genres: local, source: 'SceneGen', fallback: true });
  }
}
