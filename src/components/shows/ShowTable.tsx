'use client';

import { Show } from "@/data/mockShows";

interface ShowTableProps {
    shows: Show[];
}  

export default function ShowTable({ shows }: ShowTableProps) {
    return (
        <table className="table-auto w-full border-collapse border border-gray7 text-sm">
            <thead>
                <tr className="bg-gray2 border-b border-gray7">
                    <th className="px-4 py-2 text-left w-[16%]">Date</th>
                    <th className="px-4 py-2 text-left w-[16%]">City</th>
                    <th className="px-4 py-2 text-left w-[16%]">Venue</th>
                    <th className="px-4 py-2 text-left w-[16%]">Show Name</th>
                    <th className="px-4 py-2 text-left w-[36%]">Lineup</th>
                </tr>
            </thead>
            <tbody>
                {shows.map(show => (
                  <tr key={show.id} className="border-b border-gray7">
                    <td className="px-4 py-2">{show.date}</td>
                    <td className="px-4 py-2">
                      {show.location.city}
                      {show.location.state !== null && `, ${show.location.state}`}
                      {show.location.country !== 'USA' && `, ${show.location.country}`}
                    </td>
                    <td className="px-4 py-2">{show.venue}</td>
                    <td className="px-4 py-2">{show.showName}</td>
                    <td className="px-4 py-2">{show.lineup.join(', ')}</td>
                  </tr>
                ))}
            </tbody>
        </table>
    );
}