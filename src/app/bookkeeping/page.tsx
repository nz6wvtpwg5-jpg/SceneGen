'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, Trash2, Coins, CalendarDays, MapPin, Info } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useBudgets } from '@/hooks/useBudgets';
import { useShows } from '@/hooks/useShows';
import { useProfileStore } from '@/store/useProfileStore';
import { formatCurrency } from '@/lib/utils';
import type { Show } from '@/types/show';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';

// Common currencies
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
];

const formatBudgetAmount = (amount: number, currency?: string) => {
  const code = currency?.trim().toUpperCase();
  return code && /^[A-Z]{3}$/.test(code)
    ? formatCurrency(amount, code)
    : `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not set)`;
};

type Expense = {
  id: string;
  name: string;
  amount: string;
};

export default function Bookkeeping() {
  const confirmDialog = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [selectedShowId, setSelectedShowId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [notes, setNotes] = useState('');

  // Revenue fields
  const [feePaid, setFeePaid] = useState(''); // This is ticket sales
  const [merchCashSales, setMerchCashSales] = useState('');
  const [merchCardSales, setMerchCardSales] = useState('');

  // Expense fields
  const [agentFeePercent, setAgentFeePercent] = useState('10');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  const [availableShows, setAvailableShows] = useState<Show[]>([]);
  const [showsLoading, setShowsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: session } = useSession();
  const { budgets, loading, error, refetch } = useBudgets({ search: searchQuery });
  const { fetchShows } = useShows();
  const { activeProfile } = useProfileStore();

  // Calculate summary stats grouped by currency
  const summaryByCurrency = budgets.reduce((acc, budget) => {
    const currency = budget.currency?.trim().toUpperCase() || 'UNSPECIFIED';
    if (!acc[currency]) {
      acc[currency] = { revenue: 0, expenses: 0, profit: 0 };
    }
    // Ensure values are numbers, not strings
    const revenue = Number(budget.totalSales) || 0;
    const expenses = Number(budget.totalExpenses) || 0;
    acc[currency].revenue += revenue;
    acc[currency].expenses += expenses;
    acc[currency].profit += (revenue - expenses);
    return acc;
  }, {} as Record<string, { revenue: number; expenses: number; profit: number }>);

  const currencies = Object.keys(summaryByCurrency).sort();

  // Fetch shows when modal opens
  useEffect(() => {
    if (showCreateModal && session?.user?.id) {
      setShowsLoading(true);
      fetchShows()
        .then((shows) => setAvailableShows(shows))
        .catch((err) => console.error('Error fetching shows:', err))
        .finally(() => setShowsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal, session?.user?.id]);

  // Auto-populate budget name and currency when show is selected
  useEffect(() => {
    if (selectedShowId && availableShows.length > 0) {
      const selectedShow = availableShows.find((show: Show) => show.id === selectedShowId);
      if (selectedShow) {
        // Auto-populate budget name if empty
        if (!budgetName) {
          const showDate = new Date(selectedShow.showDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          setBudgetName(`${selectedShow.venueName || selectedShow.venueCity || 'Tour stop'} - ${showDate}`);
        }
        // Set currency from show if available
        if (selectedShow.currency) {
          setSelectedCurrency(selectedShow.currency);
        }
      }
    }
  }, [selectedShowId, availableShows]);

  // Reset form when modal is closed
  const resetForm = () => {
    setBudgetName('');
    setSelectedShowId('');
    setSelectedCurrency('');
    setNotes('');
    setFeePaid('');
    setMerchCashSales('');
    setMerchCardSales('');
    setAgentFeePercent('10');
    setExpenses([]);
    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  // Add expense to list
  const addExpense = () => {
    if (!newExpenseName.trim() || !newExpenseAmount || parseFloat(newExpenseAmount) <= 0) {
      toast.error('Please enter a valid expense name and amount');
      return;
    }

    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      name: newExpenseName.trim(),
      amount: newExpenseAmount,
    };

    setExpenses([...expenses, newExpense]);
    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  // Remove expense from list
  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  // Calculate agent fee amount
  const commissionableIncome = parseFloat(feePaid || '0');
  const agentFeeAmount = commissionableIncome && agentFeePercent
    ? (commissionableIncome * parseFloat(agentFeePercent)) / 100
    : 0;

  // Calculate total expenses (including agent fee)
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0) + agentFeeAmount;

  // Delete budget function
  const handleDeleteBudget = async (budgetId: string, budgetName: string) => {
    if (!await confirmDialog({
      title: `Delete “${budgetName}”?`,
      description: 'This budget will be permanently deleted. This action cannot be undone.',
      confirmLabel: 'Delete budget',
      tone: 'destructive',
    })) {
      return;
    }

    if (!activeProfile?.id) {
      toast.error('No active workspace found');
      return;
    }

    try {
      const response = await fetch(`/api/budgets/${budgetId}?entityId=${activeProfile.id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete budget');
      }

      console.log('✅ Budget deleted:', budgetId);

      // Refresh budgets list
      refetch();

      toast.success(`Budget “${budgetName}” deleted`);
    } catch (err) {
      console.error('❌ Error deleting budget:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete budget');
    }
  };

  // Create budget function
  const handleCreateBudget = async () => {
    if (!budgetName.trim() || !selectedShowId || !selectedCurrency || !activeProfile?.id) return;

    try {
      setIsCreating(true);

      // Parse revenue values
      const ticketSales = feePaid ? parseFloat(feePaid) : 0;
      const merchCash = merchCashSales ? parseFloat(merchCashSales) : 0;
      const merchCard = merchCardSales ? parseFloat(merchCardSales) : 0;
      const totalSales = ticketSales + merchCash + merchCard;

      // Calculate agent commission
      const agentPercent = agentFeePercent ? parseFloat(agentFeePercent) : 10;
      const agentCommission = (ticketSales * agentPercent) / 100;

      // Parse and categorize expenses
      const expenseMap: Record<string, number> = {};
      expenses.forEach(exp => {
        const name = exp.name.toLowerCase();
        const amount = parseFloat(exp.amount);

        // Map expense names to database fields
        if (name.includes('van') && !name.includes('rental')) {
          expenseMap.vanCosts = (expenseMap.vanCosts || 0) + amount;
        } else if (name.includes('van rental') || name.includes('rental')) {
          expenseMap.vanRental = (expenseMap.vanRental || 0) + amount;
        } else if (name.includes('gas') || name.includes('fuel')) {
          expenseMap.gasCosts = (expenseMap.gasCosts || 0) + amount;
        } else if (name.includes('accommodation') || name.includes('hotel') || name.includes('lodging')) {
          expenseMap.accommodationCosts = (expenseMap.accommodationCosts || 0) + amount;
        } else if (name.includes('flight') || name.includes('plane')) {
          expenseMap.flightCosts = (expenseMap.flightCosts || 0) + amount;
        } else if (name.includes('merch') && (name.includes('cost') || name.includes('goods'))) {
          expenseMap.merchCostOfGoods = (expenseMap.merchCostOfGoods || 0) + amount;
        } else if (name.includes('payout') || name.includes('salary') || name.includes('wage')) {
          expenseMap.generalPayouts = (expenseMap.generalPayouts || 0) + amount;
        } else {
          expenseMap.extraExpenses = (expenseMap.extraExpenses || 0) + amount;
        }
      });

      // Calculate total expenses
      const totalExpenses = agentCommission + Object.values(expenseMap).reduce((sum, val) => sum + val, 0);

      // Prepare expenses array with original names for line items
      const expensesArray = expenses.map(exp => ({
        name: exp.name,
        amount: parseFloat(exp.amount),
        category: 'expense'
      }));

      const payload = {
        budgetName: budgetName.trim(),
        showId: selectedShowId,
        entityId: activeProfile.id,
        currency: selectedCurrency,
        notes: notes.trim() || undefined,
        // Revenue fields
        ticketSales: ticketSales > 0 ? ticketSales : undefined,
        merchCashSales: merchCash > 0 ? merchCash : undefined,
        merchCardSales: merchCard > 0 ? merchCard : undefined,
        totalSales,
        // Expense fields
        agentCommissionPercent: agentPercent,
        agentCommission: agentCommission > 0 ? agentCommission : undefined,
        vanCosts: expenseMap.vanCosts || undefined,
        vanRental: expenseMap.vanRental || undefined,
        gasCosts: expenseMap.gasCosts || undefined,
        accommodationCosts: expenseMap.accommodationCosts || undefined,
        flightCosts: expenseMap.flightCosts || undefined,
        merchCostOfGoods: expenseMap.merchCostOfGoods || undefined,
        generalPayouts: expenseMap.generalPayouts || undefined,
        extraExpenses: expenseMap.extraExpenses || undefined,
        totalExpenses,
        // Original expense line items
        expenses: expensesArray
      };

      console.log('📤 [Create Budget] Sending payload:', payload);

      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create budget');
      }

      const newBudget = await response.json();
      console.log('✅ Budget created:', newBudget);

      // Close modal and reset form
      setShowCreateModal(false);
      resetForm();

      // Refresh budgets list
      refetch();

      // Show success message (optional)
      toast.success(`Budget “${budgetName}” created`);
    } catch (err) {
      console.error('❌ Error creating budget:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create budget');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="scene-page mx-auto max-w-none space-y-6 pb-24 sm:space-y-8 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
        <div>
          <p className="scene-kicker">Business desk</p>
          <h1 className="scene-title">Bookkeeping</h1>
          <p className="scene-copy">Fees, costs and the real financial position of every show.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#ff5a36] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,90,54,0.2)] transition hover:bg-[#e54525] sm:min-h-11 sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Budget
        </button>
      </div>

      {/* Summary Cards - Multi-Currency */}
      {currencies.length === 0 ? (
        <div className="panel-dark p-8 text-center">
          <p className="text-text-tertiary">No budgets yet. Create your first budget to see financial summaries.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {currencies.map((currency) => {
            const summary = summaryByCurrency[currency];
            return (
              <div key={currency}>
                <h3 className="text-sm font-medium text-text-tertiary mb-3">{currency}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="panel-dark p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-tertiary">Total Revenue</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {formatBudgetAmount(summary.revenue, currency === 'UNSPECIFIED' ? undefined : currency)}
                        </p>
                      </div>
                      <div className="p-3 bg-semantic-success/20 border border-semantic-success/30 rounded-full">
                        <Coins className="w-6 h-6 text-semantic-success" />
                      </div>
                    </div>
                  </div>

                  <div className="panel-dark p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-tertiary">Total Expenses</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {formatBudgetAmount(summary.expenses, currency === 'UNSPECIFIED' ? undefined : currency)}
                        </p>
                      </div>
                      <div className="p-3 bg-semantic-warning/20 border border-semantic-warning/30 rounded-full">
                        <TrendingDown className="w-6 h-6 text-semantic-warning" />
                      </div>
                    </div>
                  </div>

                  <div className="panel-dark p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-tertiary">Net Profit</p>
                        <p className={`text-2xl font-bold mt-1 ${summary.profit >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>
                          {formatBudgetAmount(summary.profit, currency === 'UNSPECIFIED' ? undefined : currency)}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${summary.profit >= 0 ? 'bg-semantic-success/10' : 'bg-semantic-error/10'}`}>
                        <TrendingUp className={`w-6 h-6 ${summary.profit >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="panel-dark p-4">
        <div className="flex items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" />
            <input
              type="text"
              placeholder="Search by budget name, venue, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-12 w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Budget List */}
      <div className="panel-dark rounded-lg">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-text-tertiary mt-4">Loading budgets...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No budgets yet</h3>
            <p className="text-text-tertiary mb-6">Create your first budget to start tracking your show finances</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Budget
            </button>
          </div>
        ) : (
          <>
          <div className="divide-y divide-white/10 sm:hidden">
            {budgets.map((budget) => {
              const revenue = budget.totalSales || 0;
              const expenses = budget.totalExpenses || 0;
              const profit = revenue - expenses;
              const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
              const date = budget.showDate ? new Date(budget.showDate) : null;
              return <article key={budget.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0"><p className="truncate font-bold text-foreground">{budget.budgetName}</p><p className="mt-1 truncate text-sm text-text-tertiary">{budget.showName || 'Show budget'}</p></div>
                  <button type="button" onClick={() => handleDeleteBudget(budget.id, budget.budgetName)} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-semantic-error/30 text-semantic-error" aria-label={`Delete ${budget.budgetName}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-tertiary">
                  {date && !Number.isNaN(date.getTime()) && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  {budget.venueCity && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{budget.venueCity}</span>}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-elevated p-3 text-sm">
                  <div><dt className="text-xs text-text-tertiary">Revenue</dt><dd className="mt-1 font-semibold">{formatBudgetAmount(revenue, budget.currency)}</dd></div>
                  <div><dt className="text-xs text-text-tertiary">Costs</dt><dd className="mt-1 font-semibold">{formatBudgetAmount(expenses, budget.currency)}</dd></div>
                  <div><dt className="text-xs text-text-tertiary">Net</dt><dd className={`mt-1 font-bold ${profit >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>{formatBudgetAmount(profit, budget.currency)}</dd></div>
                  <div><dt className="text-xs text-text-tertiary">Margin</dt><dd className={`mt-1 font-bold ${margin >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>{margin.toFixed(1)}%</dd></div>
                </dl>
              </article>;
            })}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Budget Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Show
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Net Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {budgets.map((budget) => {
                  const revenue = budget.totalSales || 0;
                  const expenses = budget.totalExpenses || 0;
                  const profit = revenue - expenses;
                  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                  return (
                    <tr key={budget.id} className="hover:bg-surface-elevated transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">{budget.budgetName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">{budget.showName}</div>
                        <div className="text-sm text-text-tertiary">{budget.venueCity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {(() => {
                            console.log('Budget showDate:', budget.showDate, 'Type:', typeof budget.showDate);
                            if (!budget.showDate) return '-';
                            const date = new Date(budget.showDate);
                            if (isNaN(date.getTime())) {
                              console.error('Invalid date:', budget.showDate);
                              return budget.showDate; // Show raw value for debugging
                            }
                            return date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatBudgetAmount(revenue, budget.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatBudgetAmount(expenses, budget.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${profit >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>
                          {formatBudgetAmount(profit, budget.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${margin >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleDeleteBudget(budget.id, budget.budgetName)}
                          className="text-semantic-error hover:text-semantic-error/80 transition-colors"
                          title="Delete budget"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <div className="mobile-safe-top mobile-safe-bottom panel-dark min-h-[100dvh] w-full overflow-y-auto p-5 shadow-xl sm:max-h-[90vh] sm:min-h-0 sm:max-w-lg sm:rounded-lg sm:p-6">
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-white/10 bg-background/95 px-5 py-4 backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0"><h2 className="text-xl font-bold text-foreground">Create New Budget</h2><button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="min-h-11 rounded-full px-4 text-sm font-bold text-text-tertiary">Cancel</button></div>

            <div className="space-y-4 mb-6">
              {/* Show Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Show *
                </label>
                {showsLoading ? (
                  <div className="text-sm text-text-tertiary">Loading shows...</div>
                ) : availableShows.length === 0 ? (
                  <div className="bg-surface-elevated border border-border-subtle rounded-md p-3">
                    <p className="text-sm text-text-tertiary">
                      No shows available. Please create a show first before creating a budget.
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedShowId}
                      onChange={(e) => setSelectedShowId(e.target.value)}
                      className="min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">-- Select a show --</option>
                      {availableShows
                        .sort((a, b) => new Date(b.showDate).getTime() - new Date(a.showDate).getTime())
                        .map((show) => {
                          const showDate = new Date(show.showDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });
                          const isPast = new Date(show.showDate) < new Date();
                          return (
                            <option key={show.id} value={show.id}>
                              {show.venueName || show.venueCity || 'Location TBC'}{show.venueName && show.venueCity ? ` - ${show.venueCity}` : ''} ({showDate}) {isPast ? '- Past' : '- Upcoming'}
                            </option>
                          );
                        })}
                    </select>
                    <p className="text-xs text-text-tertiary mt-1">
                      Budgets can be created for both past and future shows
                    </p>
                  </>
                )}
              </div>

              {/* Budget Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Budget Name *
                </label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder="e.g., Summer Tour 2026, NYC Show Budget"
                  className="min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Auto-populated from show, but you can customize it
                </p>
              </div>

              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Currency *
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="" disabled>Select currency</option>
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-tertiary mt-1">
                  {selectedCurrency
                    ? `All amounts in this budget will be in ${selectedCurrency}`
                    : 'Choose the accounting currency for this budget.'}
                </p>
              </div>

              {/* Fee Paid (Revenue) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Agreed Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                    {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feePaid}
                    onChange={(e) => setFeePaid(e.target.value)}
                    placeholder="0.00"
                    className="min-h-12 w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Total agreed performance fee for the show
                </p>
              </div>

              {/* Merch Cash Sales */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Merch Sales (Cash)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                    {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={merchCashSales}
                    onChange={(e) => setMerchCashSales(e.target.value)}
                    placeholder="0.00"
                    className="min-h-12 w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Cash merchandise sales
                </p>
              </div>

              {/* Merch Card Sales */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Merch Sales (Card)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                    {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={merchCardSales}
                    onChange={(e) => setMerchCardSales(e.target.value)}
                    placeholder="0.00"
                    className="min-h-12 w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Card/digital merchandise sales
                </p>
              </div>

              {/* Total Revenue Display */}
              {(feePaid || merchCashSales || merchCardSales) && (
                <div className="bg-semantic-success/20 border border-semantic-success/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Total Revenue</span>
                    <span className="text-lg font-bold text-semantic-success">
                      {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                      {(
                        (parseFloat(feePaid || '0')) +
                        (parseFloat(merchCashSales || '0')) +
                        (parseFloat(merchCardSales || '0'))
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Booking Agent Fee */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Booking Agent Fee
                </label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={agentFeePercent}
                      onChange={(e) => setAgentFeePercent(e.target.value)}
                      placeholder="0"
                      className="min-h-12 w-full rounded-md border border-input bg-background py-2 pl-3 pr-8 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                      %
                    </span>
                  </div>
                  <div className="flex items-center px-3 py-2 bg-surface-elevated border border-border-subtle rounded-md min-w-[120px]">
                    <span className="text-sm text-foreground">
                      {agentFeeAmount > 0 ? (
                        <>
                          {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                          {agentFeeAmount.toFixed(2)}
                        </>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Calculated from performance income only. Merch sales are excluded.
                </p>
              </div>

              {/* Expenses Section */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Other Expenses
                </label>

                {/* Existing expenses list */}
                {(expenses.length > 0 || agentFeeAmount > 0) && (
                  <div className="mb-3 space-y-2">
                    {/* Agent Fee */}
                    {agentFeeAmount > 0 && (
                      <div className="flex items-center justify-between bg-accent-blue/10 border border-accent-blue/30 rounded-md p-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            Booking Agent Fee ({agentFeePercent}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">
                            {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                            {agentFeeAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Other expenses */}
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between bg-surface-elevated border border-border-subtle rounded-md p-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">{expense.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">
                            {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                            {parseFloat(expense.amount).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExpense(expense.id)}
                            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg><span>Remove expense</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end pt-1 border-t border-border-subtle">
                      <span className="text-sm font-medium text-foreground">
                        Total Expenses: {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                        {totalExpenses.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Add new expense */}
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
                    <input
                      type="text"
                      value={newExpenseName}
                      onChange={(e) => setNewExpenseName(e.target.value)}
                      placeholder="Expense name (e.g., Hotel, Gas)"
                      className="min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const amountInput = document.getElementById('expense-amount-input') as HTMLInputElement;
                          amountInput?.focus();
                        }
                      }}
                    />
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                        {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                      </span>
                      <input
                        id="expense-amount-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newExpenseAmount}
                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        className="min-h-12 w-full rounded-md border border-input bg-background py-2 pl-7 pr-2 text-base text-foreground placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addExpense();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addExpense}
                    className="w-full px-3 py-2 bg-surface-elevated text-foreground rounded-md hover:bg-surface-hover transition-colors text-sm"
                  >
                    + Add Expense
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  Add individual expenses like travel, accommodation, meals, etc.
                </p>
              </div>

              {/* Net Profit Display */}
              {(feePaid || expenses.length > 0) && (
                <div className="bg-surface-elevated border border-border-subtle rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Net Profit:</span>
                    <span className={`text-lg font-bold ${
                      (parseFloat(feePaid || '0') - totalExpenses) >= 0
                        ? 'text-semantic-success'
                        : 'text-semantic-error'
                    }`}>
                      {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}
                      {(parseFloat(feePaid || '0') - totalExpenses).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Note about budget */}
            <div className="bg-surface-elevated border border-border-subtle rounded-md p-3 mb-6">
              <p className="text-sm text-text-tertiary">
                <strong className="inline-flex items-center gap-1 text-foreground"><Info size={14} /> Note:</strong> You can add more revenue sources and expenses after creating the budget.
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={isCreating}
                className="min-h-12 px-4 py-2 bg-surface-elevated text-foreground rounded-md hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBudget}
                disabled={!budgetName.trim() || !selectedShowId || !selectedCurrency || isCreating}
                className="min-h-12 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Budget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
