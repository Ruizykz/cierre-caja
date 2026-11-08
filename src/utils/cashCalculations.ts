
import {
  CASH_DENOMINATIONS,
  type CashCount,
  type CashCountResult,
  type CashDenomination,
} from '../types/cash'

/**
 * Calcula el conteo de billetes y monedas.
 */
export function calculateCashCount(
  quantities: Partial<Record<CashDenomination, number>>,
): CashCountResult {
  const items: CashCount[] = CASH_DENOMINATIONS.map(
    (denomination) => {
      const quantity = quantities[denomination] ?? 0

      if (!Number.isSafeInteger(quantity) || quantity < 0) {
        throw new Error(
          `La cantidad para ${denomination} debe ser un entero no negativo.`,
        )
      }

      return {
        denomination,
        quantity,
        subtotal: denomination * quantity,
      }
    },
  )

  const totalBills = items
    .filter((item) => item.denomination >= 2000)
    .reduce((total, item) => total + item.quantity, 0)

  const totalCoins = items
    .filter((item) => item.denomination <= 1000)
    .reduce((total, item) => total + item.quantity, 0)

  const totalUnits = totalBills + totalCoins

  const totalAmount = items.reduce(
    (total, item) => total + item.subtotal,
    0,
  )

  return {
    items,
    totalBills,
    totalCoins,
    totalUnits,
    totalAmount,
  }
}
