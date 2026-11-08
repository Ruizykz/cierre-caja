
export type PaymentMethod =
  | 'cash'
  | 'transfer'
  | 'card'
  | 'other'

export interface Expense {
  id: string
  closingId: string
  description: string
  amount: number
  date: string
  paymentMethod: PaymentMethod
  category: string
  observations?: string
  createdAt: string
  updatedAt: string
}
