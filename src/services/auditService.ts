
import { db } from '../database/db'
import type {
  AuditAction,
  AuditEntityType,
  AuditLog,
} from '../types/audit'
import { createId } from '../utils/createId'

interface CreateAuditInput {
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  description: string
  before?: unknown
  after?: unknown
}

export async function createAuditLog(
  data: CreateAuditInput,
): Promise<AuditLog> {
  if (!data.entityId.trim()) {
    throw new Error('El identificador del registro es obligatorio.')
  }

  if (!data.description.trim()) {
    throw new Error('La descripción de la auditoría es obligatoria.')
  }

  const auditLog: AuditLog = {
    id: createId(),
    entityType: data.entityType,
    entityId: data.entityId,
    action: data.action,
    description: data.description.trim(),
    date: new Date().toISOString(),
    before: data.before,
    after: data.after,
  }

  await db.auditLogs.add(auditLog)

  return auditLog
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  return db.auditLogs.orderBy('date').reverse().toArray()
}

export async function getAuditLogsByEntity(
  entityType: AuditEntityType,
  entityId: string,
): Promise<AuditLog[]> {
  return db.auditLogs
    .where('[entityType+entityId]')
    .equals([entityType, entityId])
    .reverse()
    .toArray()
}

export async function getAuditLogsByDate(
  date: string,
): Promise<AuditLog[]> {
  return db.auditLogs
    .where('date')
    .startsWith(date)
    .reverse()
    .toArray()
}

export async function deleteAuditLog(
  id: string,
): Promise<void> {
  const existing = await db.auditLogs.get(id)

  if (!existing) {
    throw new Error('No se encontró el registro de auditoría.')
  }

  await db.auditLogs.delete(id)
}
