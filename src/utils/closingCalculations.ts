
import type { ExtraordinaryMovement } from '../types/closing'

interface ClosingCalculationInput {
  openingCash: number
  finalCash: number
  cashExpenses: number
  extraordinaryEntries: ExtraordinaryMovement[]
  extraordinaryWithdrawals: ExtraordinaryMovement[]
}

interface ClosingCalculationResult {
  calculatedIncome: number
  personalShare: number
  businessShare: number
}

/**
 * Comprueba que un valor monetario sea un entero
 * no negativo expresado en pesos colombianos.
 */
function validateMoney(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `${fieldName} debe ser un número entero no negativo.`,
    )
  }
}

/**
 * Suma los movimientos extraordinarios.
 */
function sumMovements(movements: ExtraordinaryMovement[]): number {
  return movements.reduce((total, movement) => {
    validateMoney(movement.amount, 'El movimiento extraordinario')
    return total + movement.amount
  }, 0)
}

/**
 * Calcula los ingresos y la distribución 15 % / 85 %.
 */
export function calculateClosing(
  data: ClosingCalculationInput,
): ClosingCalculationResult {
  validateMoney(data.openingCash, 'El dinero inicial')
  validateMoney(data.finalCash, 'El dinero final')
  validateMoney(data.cashExpenses, 'Los gastos en efectivo')

  const extraordinaryEntries = sumMovements(
    data.extraordinaryEntries,
  )

  const extraordinaryWithdrawals = sumMovements(
    data.extraordinaryWithdrawals,
  )

  const calculatedIncome =
    data.finalCash +
    data.cashExpenses +
    extraordinaryWithdrawals -
    data.openingCash -
    extraordinaryEntries

  const personalShare =
  calculatedIncome > 0 ? Math.round(calculatedIncome * 0.15) : 0

const businessShare =
  calculatedIncome > 0 ? calculatedIncome - personalShare : 0

  return {
    calculatedIncome,
    personalShare,
    businessShare,
  }
}
