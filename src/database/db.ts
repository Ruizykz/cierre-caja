import Dexie, { type Table } from 'dexie'

import type { CashClosing } from '../types/closing'
import type { Expense } from '../types/expense'
import type { AuditLog } from '../types/audit'
import type { BusinessSettings } from '../types/settings'

class CashRegisterDatabase extends Dexie {
  closings!: Table<CashClosing, string>
  expenses!: Table<Expense, string>
  auditLogs!: Table<AuditLog, string>
  settings!: Table<BusinessSettings, string>

  constructor() {
    super('CierreDeCajaDB')

    this.version(1).stores({
      closings: 'id, date',
      expenses: 'id, closingId, date, paymentMethod, category',
    })

    this.version(2).stores({
      closings: 'id, date',
      expenses: 'id, closingId, date, paymentMethod, category',
      auditLogs: 'id, entityType, entityId, action, date, [entityType+entityId]',
    })

    this.version(3).stores({
      closings: 'id, date',
      expenses: 'id, closingId, date, paymentMethod, category',
      auditLogs: 'id, entityType, entityId, action, date, [entityType+entityId]',
      settings: 'id',
    })
  }
}

export const db = new CashRegisterDatabase()