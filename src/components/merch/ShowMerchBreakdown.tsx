'use client';

import { useMemo, type CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Shirt, X } from 'lucide-react';

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
  items: MerchItem[];
}

interface Props {
  sales: MerchSale[];
  showName: string;
  position: { x: number; y: number };
  onClose?: () => void;
}

interface ItemBreakdown {
  itemName: string;
  variation: string;
  quantity: number;
  revenue: number;
}

export function ShowMerchBreakdown({ sales, showName, position, onClose }: Props) {
  const breakdown = useMemo(() => {
    const itemMap = new Map<string, ItemBreakdown>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const variation = item.variation || 'Standard';
        const key = `${item.name}|${variation}`;

        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.quantity += item.quantity;
          existing.revenue += item.totalMoney;
        } else {
          itemMap.set(key, {
            itemName: item.name,
            variation,
            quantity: item.quantity,
            revenue: item.totalMoney,
          });
        }
      });
    });

    // Convert to array and sort by quantity descending
    return Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  // Group items by type
  const groupedByType = useMemo(() => {
    const groups = new Map<string, ItemBreakdown[]>();

    breakdown.forEach(item => {
      const type = item.itemName;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(item);
    });

    return Array.from(groups.entries());
  }, [breakdown]);

  return (
    <div
      className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[10000] md:inset-auto md:[left:var(--breakdown-x)] md:[top:var(--breakdown-y)] md:[transform:translate(-50%,-100%)_translateY(-12px)]"
      style={{ '--breakdown-x': `${position.x}px`, '--breakdown-y': `${position.y}px` } as CSSProperties}
    >
      <Card className="max-h-[75dvh] w-full overflow-hidden rounded-b-none border-accent-cyan/50 bg-background/98 shadow-2xl backdrop-blur-md md:w-[320px] md:rounded-b-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-accent-cyan" />
            Merch Breakdown - {showName}
          </CardTitle>
          {onClose && <button type="button" onClick={onClose} aria-label="Close merch breakdown" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-elevated"><X size={18}/></button>}
          </div>
        </CardHeader>
        <CardContent className="max-h-[calc(75dvh-5rem)] space-y-3 overflow-y-auto">
          {groupedByType.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items sold
            </p>
          ) : (
            groupedByType.map(([type, items]) => (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-accent-cyan border-b border-border-subtle pb-1">
                  <Shirt className="h-3.5 w-3.5" />
                  {type}
                </div>
                <div className="space-y-1 pl-5">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded bg-surface-elevated/50 hover:bg-surface-elevated transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {item.variation}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-accent-cyan font-bold">
                          {item.quantity}
                        </span>
                        <span className="text-muted-foreground text-[10px] min-w-[50px]">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
