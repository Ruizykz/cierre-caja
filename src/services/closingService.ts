
import { db } from '../database/db'
import type { CashClosing } from '../types/closing'
import { calculateClosing } from '../utils/closingCalculations'
import { createId } from '../utils/createId'
import { createAuditLog } from './auditService'

type NewClosing = Omit<
  CashClosing,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'calculatedIncome'
  | 'personalShare'
  | 'businessShare'
>

type ClosingChanges = Partial<NewClosing>

function validateDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('La fecha debe tener el formato AAAA-MM-DD.')
  }

  const parsedDate = new Date(`${date}T12:00:00`)

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error('La fecha indicada no es válida.')
  }
}

function prepareClosing(
  data: NewClosing,
  id: string,
  createdAt: string,
): CashClosing {
  validateDate(data.date)

  if (data.finalCash !== data.cashCount.totalAmount) {
    throw new Error(
      'El dinero final debe coincidir con el total del conteo de efectivo.',
    )
  }

  const calculation = calculateClosing({
    openingCash: data.openingCash,
    finalCash: data.finalCash,
    cashExpenses: data.cashExpenses,
    extraordinaryEntries: data.extraordinaryEntries,
    extraordinaryWithdrawals: data.extraordinaryWithdrawals,
  })

  return {
    ...data,
    id,
    createdAt,
    updatedAt: new Date().toISOString(),
    ...calculation,
  }
}

/**
 * Guarda un nuevo cierre y registra su creación.
 */
export async function createClosing(
  data: NewClosing,
): Promise<CashClosing> {
  return db.transaction(
    'rw',
    db.closings,
    db.auditLogs,
    async () => {
      const existing = await db.closings
        .where('date')
        .equals(data.date)
        .first()

      if (existing) {
        throw new Error(
          'Ya existe un cierre registrado para esta fecha.',
        )
      }

      const now = new Date().toISOString()
      const closing = prepareClosing(data, createId(), now)

      await db.closings.add(closing)

      await createAuditLog({
        entityType: 'closing',
        entityId: closing.id,
        action: 'create',
        description: `Se creó el cierre del ${closing.date}.`,
        after: closing,
      })

      return closing
    },
  )
}

/**
 * Consulta todos los cierres, del más reciente al más antiguo.
 */
export async function getClosings(): Promise<CashClosing[]> {
  return db.closings.orderBy('date').reverse().toArray()
}

/**
 * Busca un cierre por su identificador.
 */
export async function getClosingById(
  id: string,
): Promise<CashClosing | undefined> {
  return db.closings.get(id)
}

/**
 * Busca el cierre de una fecha específica.
 */
export async function getClosingByDate(
  date: string,
): Promise<CashClosing | undefined> {
  validateDate(date)

  return db.closings.where('date').equals(date).first()
}

/**
 * Actualiza un cierre y registra los valores anteriores y nuevos.
 */
export async function updateClosing(
  id: string,
  changes: ClosingChanges,
): Promise<CashClosing> {
  return db.transaction(
    'rw',
    db.closings,
    db.auditLogs,
    async () => {
      const existing = await db.closings.get(id)

      if (!existing) {
        throw new Error(
          'No se encontró el cierre que deseas actualizar.',
        )
      }

      const updatedData: NewClosing = {
        date: changes.date ?? existing.date,
        openingCash: changes.openingCash ?? existing.openingCash,
        finalCash: changes.finalCash ?? existing.finalCash,
        cashExpenses: changes.cashExpenses ?? existing.cashExpenses,
        nonCashExpenses:
          changes.nonCashExpenses ?? existing.nonCashExpenses,
        extraordinaryEntries:
          changes.extraordinaryEntries ??
          existing.extraordinaryEntries,
        extraordinaryWithdrawals:
          changes.extraordinaryWithdrawals ??
          existing.extraordinaryWithdrawals,
        cashCount: changes.cashCount ?? existing.cashCount,
      }

      validateDate(updatedData.date)

      const duplicate = await db.closings
        .where('date')
        .equals(updatedData.date)
        .first()

      if (duplicate && duplicate.id !== id) {
        throw new Error(
          'Ya existe otro cierre registrado para esta fecha.',
        )
      }

      const updated = prepareClosing(
        updatedData,
        existing.id,
        existing.createdAt,
      )

      await db.closings.put(updated)

      await createAuditLog({
        entityType: 'closing',
        entityId: id,
        action: 'update',
        description: `Se modificó el cierre del ${updated.date}.`,
        before: existing,
        after: updated,
      })

      return updated
    },
  )
}

/**
 * Elimina un cierre y sus gastos relacionados.
 * Registra todas las eliminaciones.
 */
export async function deleteClosing(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.closings,
    db.expenses,
    db.auditLogs,
    async () => {
      const existing = await db.closings.get(id)

      if (!existing) {
        throw new Error(
          'No se encontró el cierre que deseas eliminar.',
        )
      }

      const relatedExpenses = await db.expenses
        .where('closingId')
        .equals(id)
        .toArray()

      for (const expense of relatedExpenses) {
        await createAuditLog({
          entityType: 'expense',
          entityId: expense.id,
          action: 'delete',
          description: `Se eliminó el gasto "${expense.description}" al eliminar su cierre relacionado.`,
          before: expense,
        })
      }

      await createAuditLog({
        entityType: 'closing',
        entityId: id,
        action: 'delete',
        description: `Se eliminó el cierre del ${existing.date}, junto con ${relatedExpenses.length} gasto(s) relacionado(s).`,
        before: existing,
      })

      await db.expenses.where('closingId').equals(id).delete()
      await db.closings.delete(id)
    },
  )
}
