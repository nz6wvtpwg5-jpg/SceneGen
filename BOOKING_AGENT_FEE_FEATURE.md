# Booking Agent Fee Feature

## Overview
Added a booking agent fee field to the budget creation modal. This allows users to specify a percentage of their fee that goes to their booking agent, and the modal automatically calculates the dollar amount.

## Changes Made

### 1. **Booking Agent Fee Input**
Located between "Fee Paid (Revenue)" and "Other Expenses" sections:
- **Percentage Input**: User enters the agent's commission percentage (e.g., 15%)
- **Auto-calculated Amount**: Displays the calculated dollar amount in real-time
- **Visual Indicator**: Shows in a blue-highlighted card in the expenses list

### 2. **How It Works**

**Example:**
- Fee Paid: **$2,750**
- Agent Fee: **15%**
- **Calculated Agent Fee**: $412.50 (shown automatically)

The calculation is: `Fee Paid × (Agent Fee % ÷ 100)`

### 3. **Visual Design**
- Input field shows percentage with "%" symbol on the right
- Calculated amount shows in a read-only display box next to the percentage
- Agent fee appears in the expenses list with a blue background (to distinguish it from manual expenses)
- Label shows: "Booking Agent Fee (15%)" with the calculated amount

### 4. **Expense Summary**
The expenses list now shows:
1. **Booking Agent Fee** (if entered) - Blue highlighted
2. **Other Expenses** (manually added) - Gray background
3. **Total Expenses** - Sum of agent fee + other expenses

### 5. **Net Profit Calculation**
Net Profit = Fee Paid - (Agent Fee + Other Expenses)

**Example:**
- Fee Paid: $2,750
- Agent Fee (15%): -$412.50
- Hotel: -$200
- Gas: -$150
- Food: -$100
- **Total Expenses**: -$862.50
- **Net Profit**: $1,887.50 ✅

## UI Flow

1. User enters **Fee Paid**: $2,750
2. User enters **Agent Fee %**: 15
3. Modal shows calculated amount: **$412.50**
4. Agent fee appears in expenses list automatically
5. User adds other expenses (Hotel, Gas, etc.)
6. Modal calculates total expenses and net profit in real-time

## Technical Implementation

### State
```typescript
const [agentFeePercent, setAgentFeePercent] = useState('');
```

### Calculations
```typescript
// Calculate agent fee amount
const agentFeeAmount = feePaid && agentFeePercent
  ? (parseFloat(feePaid) * parseFloat(agentFeePercent)) / 100
  : 0;

// Calculate total expenses (including agent fee)
const totalExpenses =
  expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0)
  + agentFeeAmount;
```

### Data Sent to Backend
```json
{
  "budgetName": "Show Name - Date",
  "showId": "uuid",
  "entityId": "uuid",
  "currency": "USD",
  "totalSales": 2750,
  "totalExpenses": 862.50  // Includes agent fee + other expenses
}
```

## Benefits
- ✅ Automatically calculates agent commission
- ✅ Common expense for touring musicians/artists
- ✅ Reduces manual calculation errors
- ✅ Clear visual distinction between agent fee and other expenses
- ✅ Updates net profit calculation in real-time

## Common Agent Fee Percentages
- **10%** - Standard for some independent agents
- **15%** - Most common for booking agents
- **20%** - Premium agents or international bookings
- **25%** - High-end management/booking combined

---
**Status**: ✅ Implemented and ready for testing
**Date**: March 18, 2026
