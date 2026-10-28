"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOnboardingRedirect } from "@/hooks/useOnboardingRedirect";
import { useBudgets } from "@/hooks/useBudgets";
import { formatCurrency } from "@/lib/utils";
import type { Budget } from "@/types/budget";

/**
 * Show Budget Page
 * Displays the budget overview for a specific show
 * Shows revenue, expenses, profit/loss, and line items
 */
export default function ShowBudgetPage() {
  const router = useRouter();
  const params = useParams();
  const showId = params.id as string;
  const { data: session } = useSession();

  const { isChecking: isCheckingEntities } = useOnboardingRedirect();
  const { budgets, loading, error, refetch } = useBudgets({ showId });

  const [budget, setBudget] = useState<Budget | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && budgets.length > 0) {
      // Get the first budget for this show
      setBudget(budgets[0]);
    } else if (!loading && budgets.length === 0) {
      // No budget exists for this show
      console.log('⚠️ No budget found for show:', showId);
    }
  }, [budgets, loading, showId]);

  const handleCreateBudget = () => {
    // Redirect to bookkeeping page to create a new budget
    router.push(`/bookkeeping?createForShow=${showId}`);
  };

  const handleEditBudget = () => {
    if (budget) {
      router.push(`/bookkeeping?editBudget=${budget.id}`);
    }
  };

  if (isCheckingEntities) {
    return (
      <div className="scene-page">
        <h2 className="text-2xl font-bold">Loading...</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scene-page">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold">Loading budget...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scene-page">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          Error loading budget: {error}
        </div>
      </div>
    );
  }

  // No budget exists for this show
  if (!budget) {
    return (
      <div className="scene-page h-[calc(100vh-5rem)] overflow-y-auto scrollable">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tour
        </button>

        <div className="text-center py-12">
          <div className="mb-6">
            <DollarSign className="w-16 h-16 mx-auto text-text-tertiary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Budget Created</h2>
          <p className="text-text-tertiary mb-6">
            This show doesn't have a budget yet. Create one to track revenue, expenses, and profitability.
          </p>
          <button
            onClick={handleCreateBudget}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Budget
          </button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalRevenue = budget.totalSales || 0;
  const totalExpenses = budget.totalExpenses || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <div className="scene-page h-[calc(100vh-5rem)] overflow-y-auto scrollable">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tour
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">{budget.budgetName || 'Show Budget'}</h1>
            <div className="flex items-center gap-4 text-text-tertiary">
              {budget.showName && <span>{budget.showName}</span>}
              {budget.venueCity && <span>• {budget.venueCity}</span>}
              {budget.showDate && (
                <span>• {new Date(budget.showDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleEditBudget}
            className="px-4 py-2 border border-black/10 rounded hover:bg-white/60 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Budget
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Revenue */}
        <div className="border border-black/10 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-semantic-success" />
            <p className="text-sm text-text-tertiary">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-semantic-success">
            {formatCurrency(totalRevenue, budget.currency)}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="border border-black/10 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-semantic-warning" />
            <p className="text-sm text-text-tertiary">Total Expenses</p>
          </div>
          <p className="text-2xl font-bold text-semantic-warning">
            {formatCurrency(totalExpenses, budget.currency)}
          </p>
        </div>

        {/* Net Profit/Loss */}
        <div className="border border-black/10 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            <p className="text-sm text-text-tertiary">Net Profit/Loss</p>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>
            {formatCurrency(netProfit, budget.currency)}
          </p>
        </div>

        {/* Profit Margin */}
        <div className="border border-black/10 rounded-lg p-6">
          <p className="text-sm text-text-tertiary mb-2">Profit Margin</p>
          <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>
            {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Revenue Breakdown</h2>
        <div className="border border-black/10 rounded-lg divide-y divide-white/10">
          {budget.ticketSales !== undefined && budget.ticketSales > 0 && (
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium">Agreed Fee</span>
              <span className="text-semantic-success font-semibold">
                {formatCurrency(budget.ticketSales, budget.currency)}
              </span>
            </div>
          )}
          {budget.merchCashSales !== undefined && budget.merchCashSales > 0 && (
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium">Merch Sales (Cash)</span>
              <span className="text-semantic-success font-semibold">
                {formatCurrency(budget.merchCashSales, budget.currency)}
              </span>
            </div>
          )}
          {budget.merchCardSales !== undefined && budget.merchCardSales > 0 && (
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium">Merch Sales (Card)</span>
              <span className="text-semantic-success font-semibold">
                {formatCurrency(budget.merchCardSales, budget.currency)}
              </span>
            </div>
          )}
          {(!budget.ticketSales && !budget.merchCashSales && !budget.merchCardSales) && (
            <div className="p-4 text-center text-text-tertiary">
              No revenue items recorded
            </div>
          )}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Expense Breakdown</h2>
        <div className="border border-black/10 rounded-lg divide-y divide-white/10">
          {budget.agentCommission !== undefined && budget.agentCommission > 0 && (
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium">
                Agent Commission ({budget.agentCommissionPercent || 10}%)
              </span>
              <span className="text-semantic-warning font-semibold">
                {formatCurrency(budget.agentCommission, budget.currency)}
              </span>
            </div>
          )}
          {budget.lineItems && budget.lineItems.length > 0 && budget.lineItems
            .filter((item: any) => item.type === 'expense')
            .map((item: any, index: number) => (
              <div key={index} className="p-4 flex justify-between items-center">
                <span className="font-medium">{item.name}</span>
                <span className="text-semantic-warning font-semibold">
                  {formatCurrency(item.amount, budget.currency)}
                </span>
              </div>
            ))
          }
          {(!budget.agentCommission || budget.agentCommission === 0) &&
           (!budget.lineItems || budget.lineItems.filter((item: any) => item.type === 'expense').length === 0) && (
            <div className="p-4 text-center text-text-tertiary">
              No expense items recorded
            </div>
          )}
        </div>
      </div>

      {/* Band Member Payouts */}
      {budget.bandMemberPayouts && budget.bandMemberPayouts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Band Member Payouts</h2>
          <div className="border border-black/10 rounded-lg divide-y divide-white/10">
            {budget.bandMemberPayouts.map((payout) => (
              <div key={payout.id} className="p-4 flex justify-between items-center">
                <div>
                  <span className="font-medium">{payout.memberName}</span>
                  {payout.notes && (
                    <p className="text-sm text-text-tertiary">{payout.notes}</p>
                  )}
                </div>
                <span className="font-semibold">
                  {formatCurrency(payout.amount, budget.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {budget.notes && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Notes</h2>
          <div className="border border-black/10 rounded-lg p-4">
            <p className="text-text-tertiary whitespace-pre-wrap">{budget.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
