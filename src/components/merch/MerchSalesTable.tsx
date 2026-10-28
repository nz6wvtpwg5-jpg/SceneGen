'use client';

import { useState, Fragment, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Calendar, Search, Check, X, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

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

interface Props {
  sales: MerchSale[];
  loading: boolean;
  onRefresh: () => void;
}

export default function MerchSalesTable({ sales, loading, onRefresh }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  const toggleDate = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const toggleSale = (id: string) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSales(newExpanded);
  };

  // Group sales by date
  const groupedByDate = useMemo(() => {
    const filtered = sales.filter(sale => {
      const searchLower = searchTerm.toLowerCase();
      return (
        sale.squareOrderId?.toLowerCase().includes(searchLower) ||
        sale.showName?.toLowerCase().includes(searchLower) ||
        sale.showCity?.toLowerCase().includes(searchLower) ||
        sale.state?.toLowerCase().includes(searchLower) ||
        sale.items?.some(item =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.variation?.toLowerCase().includes(searchLower)
        )
      );
    });

    const groups = new Map<string, MerchSale[]>();

    filtered.forEach(sale => {
      try {
        // Group by SHOW DATE if matched, otherwise by sale creation date
        let date: Date;
        let dateKey: string;

        if (sale.matched && sale.showDate) {
          // Use show date for matched sales
          date = new Date(sale.showDate);
          dateKey = format(date, 'yyyy-MM-dd');
        } else {
          // Use sale creation date for unmatched sales
          date = new Date(sale.createdAt);
          dateKey = format(date, 'yyyy-MM-dd');
        }

        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(sale);
      } catch (error) {
        // If date parsing fails, put in "unknown" group
        if (!groups.has('unknown')) {
          groups.set('unknown', []);
        }
        groups.get('unknown')!.push(sale);
      }
    });

    // Convert to array and sort by date (newest first)
    return Array.from(groups.entries())
      .sort((a, b) => {
        if (a[0] === 'unknown') return 1;
        if (b[0] === 'unknown') return -1;
        return b[0].localeCompare(a[0]);
      });
  }, [sales, searchTerm]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (state: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'default', label: string }> = {
      COMPLETED: { variant: 'success', label: 'Completed' },
      OPEN: { variant: 'warning', label: 'Open' },
      CANCELED: { variant: 'error', label: 'Canceled' },
    };

    const config = statusMap[state] || { variant: 'default', label: state };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Sales</CardTitle>
            <CardDescription>
              {sales.length} total sales grouped by date
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 w-full pl-8 text-base sm:h-10 sm:w-[300px] sm:text-sm"
              />
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm" className="min-h-12 sm:min-h-9">
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading sales...
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sales found
          </div>
        ) : (
          <>
          <div className="space-y-3 sm:hidden">
            {groupedByDate.map(([dateKey, dateSales]) => {
              const totalRevenue = dateSales.reduce((sum, sale) => sum + sale.totalMoney, 0);
              const totalItems = dateSales.reduce((sum, sale) => sum + sale.itemCount, 0);
              const matchedCount = dateSales.filter((sale) => sale.matched).length;
              const isExpanded = expandedDates.has(dateKey);
              return <article key={dateKey} className="rounded-xl border bg-card">
                <button type="button" onClick={() => toggleDate(dateKey)} className="flex min-h-16 w-full items-center gap-3 p-4 text-left">
                  {isExpanded ? <ChevronDown className="h-5 w-5 shrink-0 text-accent-cyan" /> : <ChevronRight className="h-5 w-5 shrink-0" />}
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{dateKey !== 'unknown' ? format(new Date(`${dateKey}T12:00:00`), 'EEE, MMM d, yyyy') : 'Unknown date'}</strong><small className="mt-1 block text-muted-foreground">{dateSales.length} transactions · {totalItems} items · {matchedCount} matched</small></span>
                  <strong className="shrink-0 text-accent-cyan">{formatCurrency(totalRevenue, dateSales[0].currency)}</strong>
                </button>
                {isExpanded && <div className="divide-y border-t">{dateSales.map((sale) => {
                  const saleExpanded = expandedSales.has(sale.id);
                  return <div key={sale.id}>
                    <button type="button" onClick={() => toggleSale(sale.id)} className="flex min-h-16 w-full items-center gap-3 p-4 text-left" aria-expanded={saleExpanded}>
                      {saleExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-accent-cyan" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{sale.showName || 'Unmatched sale'}</strong><small className="mt-1 block text-muted-foreground">{sale.itemCount} items · {sale.state}</small></span><strong className="shrink-0 text-sm">{formatCurrency(sale.totalMoney, sale.currency)}</strong>
                    </button>
                    {saleExpanded && <div className="space-y-3 border-t bg-muted/30 p-4">{sale.items.length ? sale.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-l-2 border-accent-cyan pl-3"><span className="min-w-0"><strong className="block break-words text-sm">{item.name}</strong><small className="text-muted-foreground">{item.variation ? `${item.variation} · ` : ''}Qty: {item.quantity}</small></span><strong className="shrink-0 text-sm">{formatCurrency(item.totalMoney, sale.currency)}</strong></div>) : <p className="text-sm text-muted-foreground">No item details available.</p>}<p className="break-all border-t pt-3 text-xs text-muted-foreground">Order ID: {sale.squareOrderId}</p></div>}
                  </div>;
                })}</div>}
              </article>;
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border sm:block">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Total Items</TableHead>
                  <TableHead>Matched</TableHead>
                  <TableHead>Show</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedByDate.map(([dateKey, dateSales]) => {
                  const totalRevenue = dateSales.reduce((sum, sale) => sum + sale.totalMoney, 0);
                  const totalItems = dateSales.reduce((sum, sale) => sum + sale.itemCount, 0);
                  const matchedCount = dateSales.filter(s => s.matched).length;
                  const isExpanded = expandedDates.has(dateKey);

                  // Get primary show name and city (most common show for that date)
                  const showCounts = dateSales.reduce((acc, sale) => {
                    if (sale.showName) {
                      const key = sale.showName;
                      if (!acc[key]) {
                        acc[key] = {
                          count: 0,
                          city: sale.showCity,
                          state: sale.showState,
                        };
                      }
                      acc[key].count += 1;
                    }
                    return acc;
                  }, {} as Record<string, { count: number; city?: string; state?: string }>);

                  const primaryShowEntry = Object.entries(showCounts).sort((a, b) => b[1].count - a[1].count)[0];
                  const primaryShow = primaryShowEntry?.[0];
                  const primaryShowCity = primaryShowEntry?.[1]?.city;
                  const primaryShowState = primaryShowEntry?.[1]?.state;

                  return (
                    <Fragment key={dateKey}>
                      {/* Date Group Row */}
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50 font-medium bg-muted/20"
                        onClick={() => toggleDate(dateKey)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-accent-cyan" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-accent-cyan" />
                            <span className="font-semibold">
                              {dateKey !== 'unknown' ? format(new Date(dateKey), 'EEEE, MMM d, yyyy') : 'Unknown Date'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-accent-cyan">
                          {formatCurrency(totalRevenue, dateSales[0].currency)}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{dateSales.length}</span> transaction{dateSales.length !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {matchedCount} / {dateSales.length}
                          </span>
                        </TableCell>
                        <TableCell>
                          {primaryShow ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{primaryShow}</span>
                              {primaryShowCity && primaryShowState && (
                                <span className="text-xs text-muted-foreground">
                                  {primaryShowCity}, {primaryShowState}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Individual Sales Rows (when expanded) */}
                      {isExpanded && dateSales.map((sale) => (
                        <Fragment key={sale.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-accent-cyan/5 bg-background"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSale(sale.id);
                            }}
                          >
                            <TableCell className="pl-8">
                              {sale.items.length > 0 && (
                                expandedSales.has(sale.id) ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                )
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {sale.createdAt ? format(new Date(sale.createdAt), 'h:mm a') : '-'}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(sale.totalMoney, sale.currency)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(sale.state)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{sale.itemCount} item{sale.itemCount !== 1 ? 's' : ''}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {sale.matched ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="text-xs">Yes</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-yellow-600">
                                  <X className="h-3.5 w-3.5" />
                                  <span className="text-xs">No</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {sale.showName ? (
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{sale.showName}</span>
                                  {sale.showCity && sale.showState && (
                                    <span className="text-xs text-muted-foreground">
                                      {sale.showCity}, {sale.showState}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Item Details (when sale is expanded) */}
                          {expandedSales.has(sale.id) && sale.items.length > 0 && (
                            <TableRow key={`${sale.id}-details`}>
                              <TableCell colSpan={7} className="bg-muted/30 pl-16">
                                <div className="p-4 space-y-2">
                                  <div className="font-semibold text-sm mb-2">Order Items:</div>
                                  <div className="space-y-2">
                                    {sale.items.map((item) => (
                                      <div key={item.id} className="flex items-center justify-between border-l-2 border-accent-cyan pl-3 py-1">
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium">{item.name}</span>
                                          {item.variation && (
                                            <Badge variant="outline" className="text-xs">
                                              {item.variation}
                                            </Badge>
                                          )}
                                          <span className="text-sm text-muted-foreground">
                                            Qty: {item.quantity}
                                          </span>
                                        </div>
                                        <div className="text-sm font-medium">
                                          {formatCurrency(item.totalMoney, sale.currency)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-xs text-muted-foreground pt-2 border-t">
                                    Order ID: {sale.squareOrderId}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
