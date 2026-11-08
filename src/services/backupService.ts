
import { db } from '../database/db'
import type { CashClosing } from '../types/closing'
import type { Expense } from '../types/expense'
import type { AuditLog } from '../types/audit'
import type { BusinessSettings } from '../types/settings'

const BACKUP_FORMAT = 'cierre-caja-backup'
const BACKUP_VERSION = 3
const PBKDF2_ITERATIONS = 310000

interface BackupData {
  version: number
  exportedAt: string
  closings: CashClosing[]
  expenses: Expense[]
  auditLogs: AuditLog[]
  settings: BusinessSettings | null
}

interface EncryptedBackup {
  format: string
  version: number
  algorithm: 'AES-GCM'
  kdf: 'PBKDF2'
  iterations: number
  salt: string
  iv: string
  data: string
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''

  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = bytes.subarray(i, i + 0x8000)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password)

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(passwordBytes),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error(
      'La contraseña debe tener al menos 8 caracteres.',
    )
  }
}

export async function createEncryptedBackup(
  password: string,
): Promise<Blob> {
  validatePassword(password)

  const backupData = await db.transaction(
    'r',
    db.closings,
    db.expenses,
    db.auditLogs,
    db.settings,
    async (): Promise<BackupData> => {
      const [
        closings,
        expenses,
        auditLogs,
        settings,
      ] = await Promise.all([
        db.closings.toArray(),
        db.expenses.toArray(),
        db.auditLogs.toArray(),
        db.settings.get('main'),
      ])

      return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        closings,
        expenses,
        auditLogs,
        settings: settings ?? null,
      }
    },
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)

  const encodedData = new TextEncoder().encode(
    JSON.stringify(backupData),
  )

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    toArrayBuffer(encodedData),
  )

  const backup: EncryptedBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encryptedData)),
  }

  return new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' },
  )
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value)
}

function isValidDate(value: unknown): value is string {
  if (!isString(value)) return false

  const date = new Date(value)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString() === value
  )
}

function isMovement(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.description) &&
    isSafeInteger(value.amount) &&
    value.amount >= 0 &&
    isString(value.date)
  )
}

function isCashCount(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return false
  }

  const validItems = value.items.every((item) => {
    return (
      isRecord(item) &&
      isSafeInteger(item.denomination) &&
      isSafeInteger(item.quantity) &&
      item.quantity >= 0 &&
      isSafeInteger(item.subtotal) &&
      item.subtotal >= 0
    )
  })

  return (
    validItems &&
    isSafeInteger(value.totalBills) &&
    value.totalBills >= 0 &&
    isSafeInteger(value.totalCoins) &&
    value.totalCoins >= 0 &&
    isSafeInteger(value.totalUnits) &&
    value.totalUnits >= 0 &&
    isSafeInteger(value.totalAmount) &&
    value.totalAmount >= 0
  )
}

function isClosing(value: unknown): value is CashClosing {
  if (!isRecord(value)) return false

  return (
    isString(value.id) &&
    isString(value.date) &&
    isSafeInteger(value.openingCash) &&
    value.openingCash >= 0 &&
    isSafeInteger(value.finalCash) &&
    value.finalCash >= 0 &&
    isSafeInteger(value.cashExpenses) &&
    value.cashExpenses >= 0 &&
    isSafeInteger(value.nonCashExpenses) &&
    value.nonCashExpenses >= 0 &&
    Array.isArray(value.extraordinaryEntries) &&
    value.extraordinaryEntries.every(isMovement) &&
    Array.isArray(value.extraordinaryWithdrawals) &&
    value.extraordinaryWithdrawals.every(isMovement) &&
    isCashCount(value.cashCount) &&
    isSafeInteger(value.calculatedIncome) &&
    isSafeInteger(value.personalShare) &&
    isSafeInteger(value.businessShare) &&
    isValidDate(value.createdAt) &&
    isValidDate(value.updatedAt)
  )
}

function isExpense(value: unknown): value is Expense {
  if (!isRecord(value)) return false

  return (
    isString(value.id) &&
    isString(value.closingId) &&
    isString(value.description) &&
    isSafeInteger(value.amount) &&
    value.amount > 0 &&
    isString(value.date) &&
    ['cash', 'transfer', 'card', 'other'].includes(
      String(value.paymentMethod),
    ) &&
    isString(value.category) &&
    (
      value.observations === undefined ||
      isString(value.observations)
    ) &&
    isValidDate(value.createdAt) &&
    isValidDate(value.updatedAt)
  )
}

function isAuditLog(value: unknown): value is AuditLog {
  if (!isRecord(value)) return false

  return (
    isString(value.id) &&
    ['closing', 'expense'].includes(String(value.entityType)) &&
    isString(value.entityId) &&
    ['create', 'update', 'delete', 'import'].includes(
      String(value.action),
    ) &&
    isString(value.description) &&
    isValidDate(value.date)
  )
}

function isBusinessSettings(
  value: unknown,
): value is BusinessSettings {
  if (!isRecord(value)) return false

  return (
    value.id === 'main' &&
    isString(value.businessName) &&
    value.businessName.length > 0 &&
    value.businessName.length <= 60 &&
    isString(value.description) &&
    value.description.length <= 180 &&
    isValidDate(value.createdAt) &&
    isValidDate(value.updatedAt)
  )
}

function validateBackupData(value: unknown): BackupData {
  if (
    !isRecord(value) ||
    ![1, 2, 3].includes(Number(value.version)) ||
    !isValidDate(value.exportedAt) ||
    !Array.isArray(value.closings) ||
    !Array.isArray(value.expenses)
  ) {
    throw new Error(
      'El contenido de la copia no tiene un formato válido.',
    )
  }

  if (!value.closings.every(isClosing)) {
    throw new Error('La copia contiene cierres inválidos.')
  }

  if (!value.expenses.every(isExpense)) {
    throw new Error('La copia contiene gastos inválidos.')
  }

  const auditLogs = value.auditLogs ?? []

  if (
    !Array.isArray(auditLogs) ||
    !auditLogs.every(isAuditLog)
  ) {
    throw new Error(
      'La copia contiene registros de auditoría inválidos.',
    )
  }

  const settings = value.settings ?? null

  if (
    settings !== null &&
    !isBusinessSettings(settings)
  ) {
    throw new Error(
      'La copia contiene una configuración del negocio inválida.',
    )
  }

  return {
    version: Number(value.version),
    exportedAt: value.exportedAt,
    closings: value.closings,
    expenses: value.expenses,
    auditLogs,
    settings,
  }
}

export interface RestoreSummary {
  importedClosings: number
  importedExpenses: number
  importedAuditLogs: number
  importedSettings: number
  existingClosings: number
  existingExpenses: number
  existingAuditLogs: number
  existingSettings: number
}

export async function restoreEncryptedBackup(
  file: File,
  password: string,
): Promise<RestoreSummary> {
  validatePassword(password)

  let envelope: unknown

  try {
    envelope = JSON.parse(await file.text())
  } catch {
    throw new Error(
      'El archivo seleccionado no es un JSON válido.',
    )
  }

  if (
    !isRecord(envelope) ||
    envelope.format !== BACKUP_FORMAT ||
    ![1, 2, 3].includes(Number(envelope.version)) ||
    envelope.algorithm !== 'AES-GCM' ||
    envelope.kdf !== 'PBKDF2' ||
    envelope.iterations !== PBKDF2_ITERATIONS ||
    !isString(envelope.salt) ||
    !isString(envelope.iv) ||
    !isString(envelope.data)
  ) {
    throw new Error(
      'El archivo no es una copia compatible de esta aplicación.',
    )
  }

  let backupData: BackupData

  try {
    const salt = fromBase64(envelope.salt)
    const iv = fromBase64(envelope.iv)
    const encryptedData = fromBase64(envelope.data)

    if (salt.length !== 16 || iv.length !== 12) {
      throw new Error('Los datos de cifrado no son válidos.')
    }

    const key = await deriveKey(password, salt)

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
      },
      key,
      toArrayBuffer(encryptedData),
    )

    const decodedData = new TextDecoder().decode(decryptedData)

    backupData = validateBackupData(JSON.parse(decodedData))

    if (backupData.version !== envelope.version) {
      throw new Error('Las versiones de la copia no coinciden.')
    }
  } catch {
    throw new Error(
      'No se pudo abrir la copia. Comprueba la contraseña y el archivo.',
    )
  }

  const incomingClosingIds = new Set<string>()
  const incomingClosingDates = new Set<string>()

  for (const closing of backupData.closings) {
    if (incomingClosingIds.has(closing.id)) {
      throw new Error(
        'La copia contiene cierres con identificadores repetidos.',
      )
    }

    if (incomingClosingDates.has(closing.date)) {
      throw new Error(
        'La copia contiene más de un cierre para la misma fecha.',
      )
    }

    incomingClosingIds.add(closing.id)
    incomingClosingDates.add(closing.date)
  }

  const incomingExpenseIds = new Set<string>()

  for (const expense of backupData.expenses) {
    if (incomingExpenseIds.has(expense.id)) {
      throw new Error(
        'La copia contiene gastos con identificadores repetidos.',
      )
    }

    incomingExpenseIds.add(expense.id)
  }

  const incomingAuditIds = new Set<string>()

  for (const log of backupData.auditLogs) {
    if (incomingAuditIds.has(log.id)) {
      throw new Error(
        'La copia contiene registros de auditoría repetidos.',
      )
    }

    incomingAuditIds.add(log.id)
  }

  return db.transaction(
    'rw',
    db.closings,
    db.expenses,
    db.auditLogs,
    db.settings,
    async () => {
      const [
        existingClosings,
        existingExpenses,
        existingAuditLogs,
        existingSettings,
      ] = await Promise.all([
        db.closings.toArray(),
        db.expenses.toArray(),
        db.auditLogs.toArray(),
        db.settings.get('main'),
      ])

      const closingsById = new Map<string, CashClosing>(
        existingClosings.map(
          (closing): [string, CashClosing] => [
            closing.id,
            closing,
          ],
        ),
      )

      const closingsByDate = new Map<string, CashClosing>(
        existingClosings.map(
          (closing): [string, CashClosing] => [
            closing.date,
            closing,
          ],
        ),
      )

      const expensesById = new Map<string, Expense>(
        existingExpenses.map(
          (expense): [string, Expense] => [
            expense.id,
            expense,
          ],
        ),
      )

      const auditLogsById = new Map<string, AuditLog>(
        existingAuditLogs.map(
          (log): [string, AuditLog] => [
            log.id,
            log,
          ],
        ),
      )

      const closingsToAdd: CashClosing[] = []
      const expensesToAdd: Expense[] = []
      const auditLogsToAdd: AuditLog[] = []

      let settingsToAdd: BusinessSettings | null = null
      let existingSettingsCount = 0

      if (backupData.settings) {
        if (existingSettings) {
          if (
            JSON.stringify(existingSettings) !==
            JSON.stringify(backupData.settings)
          ) {
            throw new Error(
              'Este dispositivo ya tiene una configuración diferente. No se modificó ningún dato.',
            )
          }

          existingSettingsCount = 1
        } else {
          settingsToAdd = backupData.settings
        }
      }

      let existingClosingCount = 0
      let existingExpenseCount = 0
      let existingAuditCount = 0

      for (const closing of backupData.closings) {
        const sameId = closingsById.get(closing.id)

        if (sameId) {
          if (
            JSON.stringify(sameId) !==
            JSON.stringify(closing)
          ) {
            throw new Error(
              'Hay un cierre con el mismo identificador, pero con datos diferentes.',
            )
          }

          existingClosingCount++
          continue
        }

        if (closingsByDate.has(closing.date)) {
          throw new Error(
            `Ya existe un cierre con la fecha ${closing.date}. No se importó nada.`,
          )
        }

        closingsToAdd.push(closing)
      }

      const availableClosingIds = new Set<string>([
        ...closingsById.keys(),
        ...closingsToAdd.map((closing) => closing.id),
      ])

      for (const expense of backupData.expenses) {
        if (!availableClosingIds.has(expense.closingId)) {
          throw new Error(
            'Hay un gasto relacionado con un cierre que no está en la base de datos ni en la copia.',
          )
        }

        const sameId = expensesById.get(expense.id)

        if (sameId) {
          if (
            JSON.stringify(sameId) !==
            JSON.stringify(expense)
          ) {
            throw new Error(
              'Hay un gasto con el mismo identificador, pero con datos diferentes.',
            )
          }

          existingExpenseCount++
          continue
        }

        expensesToAdd.push(expense)
      }

      for (const log of backupData.auditLogs) {
        const sameId = auditLogsById.get(log.id)

        if (sameId) {
          if (
            JSON.stringify(sameId) !==
            JSON.stringify(log)
          ) {
            throw new Error(
              'Hay un registro de auditoría con el mismo identificador, pero con datos diferentes.',
            )
          }

          existingAuditCount++
          continue
        }

        auditLogsToAdd.push(log)
      }

      if (closingsToAdd.length > 0) {
        await db.closings.bulkAdd(closingsToAdd)
      }

      if (expensesToAdd.length > 0) {
        await db.expenses.bulkAdd(expensesToAdd)
      }

      if (auditLogsToAdd.length > 0) {
        await db.auditLogs.bulkAdd(auditLogsToAdd)
      }

      if (settingsToAdd) {
        await db.settings.add(settingsToAdd)
      }

      return {
        importedClosings: closingsToAdd.length,
        importedExpenses: expensesToAdd.length,
        importedAuditLogs: auditLogsToAdd.length,
        importedSettings: settingsToAdd ? 1 : 0,
        existingClosings: existingClosingCount,
        existingExpenses: existingExpenseCount,
        existingAuditLogs: existingAuditCount,
        existingSettings: existingSettingsCount,
      }
    },
  )
}
