
import type { CashCountResult } from './cash'

export interface ExtraordinaryMovement {
  id: string
  description: string
  amount: number
  date: string
}

export interface CashClosing {
  id: string
  date: string

  openingCash: number
  finalCash: number

  cashExpenses: number
  nonCashExpenses: number

  extraordinaryEntries: ExtraordinaryMovement[]
  extraordinaryWithdrawals: ExtraordinaryMovement[]

  cashCount: CashCountResult

  calculatedIncome: number
  personalShare: number
  businessShare: number

  createdAt: string
  updatedAt: string
}
