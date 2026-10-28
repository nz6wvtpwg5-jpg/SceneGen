"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { getEntityId } from '@/lib/entity';

interface ConnectionRequestProps {
  message: string;
  contentJson: string;
  onAccepted?: () => void;
}

const ConnectionRequest: React.FC<ConnectionRequestProps> = ({ message, contentJson, onAccepted }) => {
  const { data: session } = useSession();
  const [reqId, setReqId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    try {
      const parsedContent = JSON.parse(contentJson);
      setReqId(parsedContent.RequestId);
    } catch (error) {
      console.error('Failed to parse contentJson:', error);
    }
  }, [contentJson]);

  const handleAccept = async () => {
    if (!reqId || !session?.user?.id) return;

    setLoading(true);
    try {
      const entityId = getEntityId();
      if (!entityId) throw new Error('Select a workspace before accepting');
      const response = await fetch(`/api/contacts/accept/${reqId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId
        }
      });

      if (!response.ok) {
        console.error('Error accepting connection:', {
          status: response.status,
          statusText: response.statusText
        });
        setStatusMessage('Failed to accept connection');
        return;
      }

      setStatusMessage('Connection accepted successfully');
      onAccepted?.();
    } catch (error) {
      console.error('Error accepting connection:', error);
      setStatusMessage('Failed to accept connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 mb-4 rounded-lg shadow">
      <h4 className="text-lg font-semibold mb-2">{message}</h4>
      {statusMessage && <p className="text-sm text-gray-600 mb-2">{statusMessage}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          className="px-4 py-2 rounded-md text-white"
          style={{ backgroundColor: "#6f9412" }}
          disabled={loading || !reqId}
        >
          {loading ? 'Processing...' : 'Accept'}
        </button>
        <button
          onClick={async () => {
            if (!reqId) return;
            const entityId = getEntityId();
            if (!entityId) return setStatusMessage('Select a workspace before rejecting');
            setLoading(true);
            try {
              const response = await fetch(`/api/contacts/reject/${reqId}`, { method: 'POST', headers: { 'X-Entity-Id': entityId } });
              setStatusMessage(response.ok ? 'Connection declined' : 'Failed to decline connection');
              if (response.ok) onAccepted?.();
            } finally { setLoading(false); }
          }}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700"
          disabled={loading || !reqId}
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default ConnectionRequest;
