
import { db } from '../database/db'
import type { Expense, PaymentMethod } from '../types/expense'
import { createId } from '../utils/createId'
import { calculateClosing } from '../utils/closingCalculations'
import { createAuditLog } from './auditService'

type NewExpense = Omit<
  Expense,
  'id' | 'createdAt' | 'updatedAt'
>

type ExpenseChanges = Partial<NewExpense>

const paymentMethods: PaymentMethod[] = [
  'cash',
  'transfer',
  'card',
  'other',
]

function validateExpense(data: NewExpense): void {
  if (!data.description.trim()) {
    throw new Error('Escribe una descripción para el gasto.')
  }

  if (!Number.isSafeInteger(data.amount) || data.amount <= 0) {
    throw new Error('El importe debe ser un entero mayor que cero.')
  }

  if (!data.category.trim()) {
    throw new Error('Escribe una categoría para el gasto.')
  }

  if (!paymentMethods.includes(data.paymentMethod)) {
    throw new Error('El método de pago no es válido.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error('La fecha debe tener el formato AAAA-MM-DD.')
  }

  const parsedDate = new Date(`${data.date}T12:00:00`)

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== data.date
  ) {
    throw new Error('La fecha indicada no es válida.')
  }
}

/**
 * Recalcula los gastos, ingresos y distribución de un cierre.
 */
async function refreshClosingExpenseTotals(
  closingId: string,
): Promise<void> {
  const closing = await db.closings.get(closingId)

  if (!closing) {
    throw new Error('No se encontró el cierre relacionado.')
  }

  const expenses = await db.expenses
    .where('closingId')
    .equals(closingId)
    .toArray()

  const cashExpenses = expenses
    .filter((expense) => expense.paymentMethod === 'cash')
    .reduce((total, expense) => total + expense.amount, 0)

  const nonCashExpenses = expenses
    .filter((expense) => expense.paymentMethod !== 'cash')
    .reduce((total, expense) => total + expense.amount, 0)

  const calculation = calculateClosing({
    openingCash: closing.openingCash,
    finalCash: closing.finalCash,
    cashExpenses,
    extraordinaryEntries: closing.extraordinaryEntries,
    extraordinaryWithdrawals: closing.extraordinaryWithdrawals,
  })

  await db.closings.update(closingId, {
    cashExpenses,
    nonCashExpenses,
    ...calculation,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Guarda un gasto y registra su creación.
 */
export async function createExpense(
  data: NewExpense,
): Promise<Expense> {
  return db.transaction(
    'rw',
    db.closings,
    db.expenses,
    db.auditLogs,
    async () => {
      validateExpense(data)

      const closing = await db.closings.get(data.closingId)

      if (!closing) {
        throw new Error('El cierre relacionado no existe.')
      }

      const now = new Date().toISOString()

      const expense: Expense = {
        ...data,
        id: createId(),
        description: data.description.trim(),
        category: data.category.trim(),
        observations: data.observations?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      }

      await db.expenses.add(expense)

      await refreshClosingExpenseTotals(data.closingId)

      await createAuditLog({
        entityType: 'expense',
        entityId: expense.id,
        action: 'create',
        description: `Se creó el gasto "${expense.description}" por ${expense.amount} COP.`,
        after: expense,
      })

      return expense
    },
  )
}

/**
 * Consulta todos los gastos.
 */
export async function getExpenses(): Promise<Expense[]> {
  return db.expenses.orderBy('date').reverse().toArray()
}

/**
 * Consulta los gastos de un cierre.
 */
export async function getExpensesByClosing(
  closingId: string,
): Promise<Expense[]> {
  return db.expenses
    .where('closingId')
    .equals(closingId)
    .toArray()
}

/**
 * Consulta los gastos de una fecha.
 */
export async function getExpensesByDate(
  date: string,
): Promise<Expense[]> {
  return db.expenses.where('date').equals(date).toArray()
}

/**
 * Actualiza un gasto y registra los valores anteriores y nuevos.
 */
export async function updateExpense(
  id: string,
  changes: ExpenseChanges,
): Promise<Expense> {
  return db.transaction(
    'rw',
    db.closings,
    db.expenses,
    db.auditLogs,
    async () => {
      const existing = await db.expenses.get(id)

      if (!existing) {
        throw new Error(
          'No se encontró el gasto que deseas actualizar.',
        )
      }

      const updatedData: NewExpense = {
        closingId: changes.closingId ?? existing.closingId,
        description: changes.description ?? existing.description,
        amount: changes.amount ?? existing.amount,
        date: changes.date ?? existing.date,
        paymentMethod:
          changes.paymentMethod ?? existing.paymentMethod,
        category: changes.category ?? existing.category,
        observations:
          changes.observations ?? existing.observations,
      }

      validateExpense(updatedData)

      const closing = await db.closings.get(updatedData.closingId)

      if (!closing) {
        throw new Error('El cierre relacionado no existe.')
      }

      const updated: Expense = {
        ...updatedData,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
        description: updatedData.description.trim(),
        category: updatedData.category.trim(),
        observations:
          updatedData.observations?.trim() || undefined,
      }

      await db.expenses.put(updated)

      await refreshClosingExpenseTotals(existing.closingId)

      if (updatedData.closingId !== existing.closingId) {
        await refreshClosingExpenseTotals(updatedData.closingId)
      }

      await createAuditLog({
        entityType: 'expense',
        entityId: id,
        action: 'update',
        description: `Se modificó el gasto "${updated.description}".`,
        before: existing,
        after: updated,
      })

      return updated
    },
  )
}

/**
 * Elimina un gasto, actualiza los totales y registra su eliminación.
 */
export async function deleteExpense(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.closings,
    db.expenses,
    db.auditLogs,
    async () => {
      const existing = await db.expenses.get(id)

      if (!existing) {
        throw new Error(
          'No se encontró el gasto que deseas eliminar.',
        )
      }

      await createAuditLog({
        entityType: 'expense',
        entityId: id,
        action: 'delete',
        description: `Se eliminó el gasto "${existing.description}".`,
        before: existing,
      })

      await db.expenses.delete(id)

      await refreshClosingExpenseTotals(existing.closingId)
    },
  )
}
