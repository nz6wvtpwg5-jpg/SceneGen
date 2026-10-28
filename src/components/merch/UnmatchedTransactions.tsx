'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useProfileStore } from '@/store/useProfileStore';
import { useSession } from 'next-auth/react';

interface MerchItem {
  id: string;
  name: string;
  quantity: number;
  variation: string | null;
  basePriceMoney: number;
  totalMoney: number;
  catalogObjectId: string | null;
}

interface MerchSale {
  id: string;
  squareOrderId: string;
  totalMoney: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  locationId?: string;
  showId?: number;
  showName?: string;
  showDate?: string;
  showCity?: string;
  showState?: string;
  matched: boolean;
  itemCount: number;
  items: MerchItem[];
}

interface Show {
  id: number;
  name: string;
  date: string;
  venueName: string;
  city: string;
}

interface Props {
  sales: MerchSale[];
  loading: boolean;
  onMatch: () => void;
}

export default function UnmatchedTransactions({ sales, loading, onMatch }: Props) {
  const { activeProfile } = useProfileStore();
  const { data: session } = useSession();
  const [shows, setShows] = useState<Show[]>([]);
  const [loadingShows, setLoadingShows] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile?.id) {
      loadShows();
    }
  }, [activeProfile]);

  const loadShows = async () => {
    if (!activeProfile?.id || !session?.user?.id) return;

    setLoadingShows(true);
    try {
      const response = await fetch('/api/shows', {
        headers: {
          'X-Entity-Id': activeProfile.id,
        },
      });

      if (!response.ok) throw new Error('Failed to load shows');

      const data = await response.json();
      setShows(data.shows || []);
    } catch (error) {
      console.error('Error loading shows:', error);
      toast.error('Failed to load shows');
    } finally {
      setLoadingShows(false);
    }
  };

  const matchSaleToShow = async (saleId: string, showId: number) => {
    if (!activeProfile?.id) return;

    setMatching(saleId);
    try {
      const response = await fetch('/api/merch/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleId,
          showId,
          entityId: activeProfile.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to match sale');

      toast.success('Sale matched to show');
      onMatch();
    } catch (error) {
      console.error('Error matching sale:', error);
      toast.error('Failed to match sale to show');
    } finally {
      setMatching(null);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unmatched Transactions</CardTitle>
        <CardDescription>
          {sales.length} transactions waiting to be matched to shows
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading transactions...
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12">
            <LinkIcon className="h-12 w-12 mx-auto text-green-600 mb-3" />
            <p className="text-lg font-medium">All sales matched!</p>
            <p className="text-sm text-muted-foreground">
              All transactions have been matched to shows
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {formatCurrency(sale.totalMoney, sale.currency)}
                      </span>
                      <Badge variant="warning">{sale.state}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateTime(sale.createdAt)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sale.itemCount} item{sale.itemCount !== 1 ? 's' : ''}: {sale.items.map(i => `${i.name}${i.variation ? ` (${i.variation})` : ''} x${i.quantity}`).join(', ')}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Order ID: {sale.squareOrderId}
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-[300px]">
                    <Select
                      disabled={matching === sale.id || loadingShows}
                      onValueChange={(value: string) => matchSaleToShow(sale.id, parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Match to show..." />
                      </SelectTrigger>
                      <SelectContent>
                        {shows.map((show) => (
                          <SelectItem key={show.id} value={show.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{show.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(show.date).toLocaleDateString()} • {show.venueName || show.city || 'Location TBC'}{show.venueName && show.city ? ` • ${show.city}` : ''}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
