'use client';

export default function ArtistGenres({ tags = [] }: { tags?: string[] }) {
  return <div className="my-[15px]"><p className="page-subheading">Genres</p><p>{tags.length ? tags.map((tag) => `#${tag.replace(/\s+/g, '')}`).join(' ') : 'No genres added'}</p></div>;
}
