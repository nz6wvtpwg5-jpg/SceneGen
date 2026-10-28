'use client';

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { getEntityId } from '@/lib/entity';

interface Connection {
    id: string;
    givenName: string;
    surName: string;
    entity?: string;
}

export default function ConnectionsTable() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { data: session } = useSession();

    useEffect(() => {
        async function fetchConnections() {
            if (!session?.user?.id) return;

            try {
                const entityId = getEntityId();

                const headers: HeadersInit = {
                };

                if (entityId) {
                    headers['X-Entity-Id'] = entityId;
                }

                const response = await fetch('/api/contacts?status=accepted', {
                    headers
                });

                if (!response.ok) {
                    console.error('Failed to fetch connections:', await response.text());
                    return;
                }

                const data = await response.json();
                console.log('Raw connections data:', data);
                setConnections(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching connections:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchConnections();
    }, [session?.user?.id]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="mt-8">
            <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-700 text-sm">
                <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                        <th className="px-4 py-2 text-left w-[20%]">Name</th>
                        <th className="px-4 py-2 text-left w-[20%]">Given Name</th>
                        <th className="px-4 py-2 text-left w-[20%]">Surname</th>
                        <th className="px-4 py-2 text-left w-[40%]">Entity</th>
                    </tr>
                </thead>
                <tbody>
                    {connections.map((connection) => (
                        <tr key={connection.id} className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-blue-600 dark:text-blue-400">
                                {`${connection.givenName} ${connection.surName}`.trim() || '-'}
                            </td>
                            <td className="px-4 py-2">{connection.givenName || '-'}</td>
                            <td className="px-4 py-2">{connection.surName || '-'}</td>
                            <td className="px-4 py-2">{connection.entity || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
