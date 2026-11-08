
export const CASH_DENOMINATIONS = [
  100000,
  50000,
  20000,
  10000,
  5000,
  2000,
  1000,
  500,
  200,
  100,
  50,
] as const

export type CashDenomination =
  (typeof CASH_DENOMINATIONS)[number]

export interface CashCount {
  denomination: CashDenomination
  quantity: number
  subtotal: number
}

export interface CashCountResult {
  items: CashCount[]
  totalBills: number
  totalCoins: number
  totalUnits: number
  totalAmount: number
}
