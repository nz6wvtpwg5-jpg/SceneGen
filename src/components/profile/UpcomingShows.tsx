'use client'

interface Show {
    date: string;
    venue: string;
    city: string;
    state: string;
    country: string;
    supportingActs: string[];
}

export default function UpcomingShows({ shows }: { shows: Show[] | string }) {
    if (typeof shows === 'string') {
        return (
            <div className="my-[15px]">
                <p className="page-subheading">Upcoming Shows</p>
                <p>{shows}</p>
            </div>
        );
    }

    return (
        <div className="my-[15px]">
            <p className="page-subheading">Upcoming Shows</p>
            {shows.map((show, index) => (
                <div key={index} className="mb-4">
                    <p>{show.date}</p>
                    <p><strong>{show.venue}, {show.city}, {show.state}, {show.country}</strong></p>
                    {show.supportingActs.length > 0 && (
                        <p>w/ {show.supportingActs.join(', ')}</p>
                    )}
                </div>
            ))}
            <p className="mt-4">Show Past Shows</p>
        </div>
    );
}
